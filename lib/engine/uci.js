// Transport-agnostic UCI driver (CONTRACT §2.2). It knows nothing about workers or processes:
// `spawnLine({ onLine, onExit })` returns (or resolves to) a transport `{ send(line), terminate() }`.
//  - one search at a time (jobs are queued), per-position timeout, stop + drain cancellation with a
//    terminate fallback, lazy restart after a crash or a terminate, tolerant parsing of engine output.

const FEN_RE = /^[A-Za-z0-9/\- ]{10,100}$/;
const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export class EngineError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

/** Parse one `info ...` line. Returns null when it carries no usable score. */
export function parseInfo(line) {
  const t = String(line).trim().split(/\s+/);
  if (t[0] !== 'info') return null;
  const out = { multipv: 1, depth: null, pv: [], bound: null };
  let score = false;
  for (let i = 1; i < t.length; i++) {
    const k = t[i];
    if (k === 'depth') { const v = Number(t[++i]); if (!Number.isInteger(v) || v < 0) return null; out.depth = v; }
    else if (k === 'multipv') { const v = Number(t[++i]); if (!Number.isInteger(v) || v < 1) return null; out.multipv = v; }
    else if (k === 'score') {
      const kind = t[++i];
      const v = Number(t[++i]);
      if (!Number.isFinite(v) || (kind !== 'cp' && kind !== 'mate')) return null;
      if (kind === 'cp') out.scoreCp = Math.trunc(v); else out.mate = Math.trunc(v);
      score = true;
      if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') out.bound = t[++i];
    } else if (k === 'pv') {
      for (let j = i + 1; j < t.length && UCI_MOVE_RE.test(t[j]); j++) out.pv.push(t[j]);
      break;
    } else if (k === 'string') break;
  }
  if (!score || out.depth === null) return null;
  return out;
}

function parseOption(line) {
  const m = /^option name (.+?) type (\w+)(.*)$/.exec(line);
  if (!m) return null;
  const rest = m[3];
  const num = (key) => { const r = new RegExp(`\\b${key} (-?\\d+)`).exec(rest); return r ? Number(r[1]) : undefined; };
  return { name: m[1], type: m[2], min: num('min'), max: num('max'), default: /\bdefault (\S+)/.exec(rest)?.[1] };
}

const abortError = (msg = 'Analysis cancelled') => new EngineError('cancelled', msg);

/**
 * @param {object} cfg
 * @param {(h:{ onLine:(l:string)=>void, onExit:(e?:Error)=>void }) => any} cfg.spawnLine
 * @param {{ threads?:number, hashMb?:number, hashCapMb?:number, variant?:string }} [cfg.options]
 */
export function createUciEngine({
  spawnLine,
  options = {},
  startTimeoutMs = 10000,
  stopGraceMs = 300,
  terminateWaitMs = 150,
  defaultTimeoutMs = 60000,
  log = () => {},
} = {}) {
  if (typeof spawnLine !== 'function') throw new TypeError('createUciEngine: spawnLine is required');

  let transport = null;
  let generation = 0;
  let alive = false;
  let startPromise = null;
  let info = null;
  let currentMultipv = null;
  let searching = false; // a `go` was sent and its bestmove has not arrived yet
  let job = null;        // job whose search is in flight
  let running = false;
  const queue = [];
  const waiters = new Set();

  // ---- line plumbing -------------------------------------------------------------------------
  function waitFor(match, ms, what) {
    const p = new Promise((resolve, reject) => {
      const w = { match, resolve, reject, timer: null };
      w.timer = setTimeout(() => { waiters.delete(w); reject(new EngineError('timeout', `Engine did not answer (${what}) within ${ms} ms`)); }, ms);
      waiters.add(w);
    });
    p.catch(() => {}); // never an unhandled rejection; the awaiting caller still sees it
    return p;
  }
  function failWaiters(err) {
    for (const w of [...waiters]) { clearTimeout(w.timer); waiters.delete(w); w.reject(err); }
  }

  function onLine(gen, raw) {
    if (gen !== generation) return;
    const line = typeof raw === 'string' ? raw.trim() : '';
    if (!line) return;
    for (const w of [...waiters]) {
      if (w.match(line)) { clearTimeout(w.timer); waiters.delete(w); w.resolve(line); }
    }
    if (line.startsWith('info ')) {
      if (!job || job.done) return;
      const p = parseInfo(line);
      if (!p) return;
      const prev = job.lines.get(p.multipv);
      // Keep the deepest exact line per multipv; a bound line only counts when nothing exact exists at that depth.
      if (p.bound && prev && prev.depth >= p.depth && !prev.bound) return;
      if (prev && !prev.bound && !p.bound && p.depth < prev.depth) return;
      job.lines.set(p.multipv, p);
    } else if (line.startsWith('bestmove')) {
      searching = false;
      const j = job;
      if (j && !j.done) {
        const lines = [...j.lines.values()]
          .sort((a, b) => a.multipv - b.multipv)
          .map(({ multipv, depth, scoreCp, mate, pv }) => {
            const l = { multipv, depth, pv };
            if (scoreCp !== undefined) l.scoreCp = scoreCp;
            if (mate !== undefined) l.mate = mate;
            return l;
          });
        j.finish(null, { lines });
      }
    }
  }

  function onExit(gen, err) {
    if (gen !== generation) return;
    alive = false;
    searching = false;
    startPromise = null;
    transport = null;
    const e = new EngineError('engine_crashed', `Engine stopped unexpectedly${err?.message ? `: ${err.message}` : ''}`);
    failWaiters(e);
    if (job && !job.done) job.finish(e);
  }

  async function kill() {
    const t = transport;
    generation++; // detach callbacks of the old transport
    alive = false;
    searching = false;
    startPromise = null;
    transport = null;
    currentMultipv = null;
    failWaiters(new EngineError('engine_stopped', 'Engine stopped'));
    if (!t) return;
    try {
      await Promise.race([Promise.resolve(t.terminate()), new Promise((r) => setTimeout(r, terminateWaitMs))]);
    } catch (err) {
      log('terminate failed', err);
    }
  }

  const send = (line) => { if (!transport) throw new EngineError('engine_stopped', 'Engine is not running'); transport.send(line); };

  // ---- lifecycle ------------------------------------------------------------------------------
  async function doStart() {
    const gen = ++generation;
    try {
      transport = await spawnLine({ onLine: (l) => onLine(gen, l), onExit: (e) => onExit(gen, e) });
    } catch (err) {
      transport = null;
      throw new EngineError('engine_start', `Cannot start the engine: ${err?.message ?? err}`);
    }
    if (gen !== generation) throw new EngineError('engine_stopped', 'Engine stopped while starting');
    const advertised = new Map();
    let name = '';
    const collect = waitFor((l) => {
      if (l.startsWith('id name ')) name = l.slice(8).trim();
      else if (l.startsWith('option ')) { const o = parseOption(l); if (o) advertised.set(o.name, o); }
      return l === 'uciok';
    }, startTimeoutMs, 'uciok');
    send('uci');
    await collect;

    const hashOpt = advertised.get('Hash');
    let hashMb = Number(options.hashMb) || 16;
    if (options.hashCapMb) hashMb = Math.min(hashMb, options.hashCapMb);
    if (hashOpt?.max !== undefined) hashMb = Math.min(hashMb, hashOpt.max);
    if (hashOpt?.min !== undefined) hashMb = Math.max(hashMb, hashOpt.min);
    const threads = Math.max(1, Number(options.threads) || 1);
    send(`setoption name Threads value ${threads}`);
    send(`setoption name Hash value ${hashMb}`);
    send('setoption name MultiPV value 2');
    send('setoption name UCI_AnalyseMode value true');
    currentMultipv = 2;
    const ready = waitFor((l) => l === 'readyok', startTimeoutMs, 'readyok');
    send('isready');
    await ready;

    const nnueOpt = advertised.get('Use NNUE');
    alive = true;
    info = {
      name: name || 'unknown engine',
      version: /\b(\d+(?:\.\d+)*)\b/.exec(name)?.[1] ?? '',
      nnue: nnueOpt ? nnueOpt.default === 'true' : /stockfish/i.test(name),
      variant: options.variant ?? 'uci',
      threads,
      hashMb,
    };
    return info;
  }

  function start() {
    if (alive && info) return Promise.resolve(info);
    if (!startPromise) {
      const p = doStart().catch(async (err) => {
        if (startPromise === p) { await kill(); }
        throw err?.code === 'engine_start' ? err : new EngineError('engine_start', String(err?.message ?? err));
      });
      startPromise = p;
    }
    return startPromise;
  }

  /** Stop the current search and drain its bestmove; terminate the transport if it does not answer in time. */
  async function recover() {
    if (!searching || !transport) return;
    try {
      const drained = waitFor((l) => l.startsWith('bestmove'), stopGraceMs, 'stop');
      send('stop');
      await drained;
    } catch {
      await kill(); // stop not honoured in time (e.g. single-threaded WASM busy searching)
    }
  }

  // ---- jobs -----------------------------------------------------------------------------------
  function newJob(fen, opts) {
    const j = { fen, opts, lines: new Map(), done: false, recovery: null };
    j.promise = new Promise((resolve, reject) => {
      j.finish = (err, value) => {
        if (j.done) return;
        j.done = true;
        clearTimeout(j.timer);
        if (err) reject(err); else resolve(value);
      };
    });
    j.promise.catch(() => {}); // handled by the caller of execute()
    return j;
  }

  async function abortJob(j, err) {
    if (j.done) return j.recovery;
    j.finish(err);
    j.recovery = recover();
    return j.recovery;
  }

  async function execute(entry) {
    const { fen, opts } = entry;
    if (opts.signal?.aborted) throw abortError();
    await start();
    const multipv = opts.multipv;
    if (multipv !== currentMultipv) {
      send(`setoption name MultiPV value ${multipv}`);
      currentMultipv = multipv;
      const ready = waitFor((l) => l === 'readyok', startTimeoutMs, 'readyok');
      send('isready');
      await ready;
    }
    if (opts.signal?.aborted || entry.cancelled) throw abortError();
    const j = newJob(fen, opts);
    entry.job = j;
    job = j;
    const onAbort = () => { abortJob(j, abortError()); };
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    j.timer = setTimeout(() => {
      abortJob(j, new EngineError('timeout', `Position analysis timed out after ${opts.timeoutMs} ms`));
    }, opts.timeoutMs);
    try {
      send(`position fen ${fen}`);
      searching = true;
      send(`go depth ${opts.depth}`);
      return await j.promise;
    } catch (err) {
      await j.recovery;
      throw err;
    } finally {
      opts.signal?.removeEventListener('abort', onAbort);
      clearTimeout(j.timer);
      if (job === j) job = null;
    }
  }

  async function pump() {
    if (running) return;
    running = true;
    try {
      while (queue.length) {
        const entry = queue.shift();
        if (entry.cancelled) continue;
        try { entry.resolve(await execute(entry)); } catch (err) { entry.reject(err); }
      }
    } finally {
      running = false;
    }
  }

  function analyse(fen, { depth = 14, multipv = 2, timeoutMs = defaultTimeoutMs, signal } = {}) {
    if (typeof fen !== 'string' || !FEN_RE.test(fen)) return Promise.reject(new EngineError('bad_input', 'Invalid FEN'));
    if (!Number.isInteger(depth) || depth < 1 || depth > 99) return Promise.reject(new EngineError('bad_input', 'Invalid depth'));
    if (!Number.isInteger(multipv) || multipv < 1 || multipv > 8) return Promise.reject(new EngineError('bad_input', 'Invalid multipv'));
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const entry = { fen, opts: { depth, multipv, timeoutMs, signal }, resolve, reject, cancelled: false, job: null };
      if (signal) {
        signal.addEventListener('abort', () => {
          if (!entry.job) { entry.cancelled = true; reject(abortError()); }
        }, { once: true });
      }
      queue.push(entry);
      pump();
    });
  }

  /** Cancel the search in flight (stop + drain, or terminate). Queued positions are kept. */
  async function cancel() {
    const j = job;
    if (j && !j.done) await abortJob(j, abortError());
  }

  /** Terminate the transport and fail everything pending. Idempotent; a later analyse() restarts lazily. */
  async function stop() {
    const err = new EngineError('engine_stopped', 'Engine stopped');
    for (const e of queue.splice(0)) { e.cancelled = true; e.reject(err); }
    if (job && !job.done) job.finish(err);
    await kill();
  }

  return {
    start,
    stop,
    cancel,
    analyse,
    isReady: () => alive,
    get info() { return info; },
  };
}
