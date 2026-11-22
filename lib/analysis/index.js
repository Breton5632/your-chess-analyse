// Analysis service (CONTRACT §2.3): persistent queue, eval cache, pass A / pass B, GameAnalysis storage.
import { Chess } from '../../vendor/chess.js';
import { parseGame, fenKey, sanLine, sanOf, isValidFen } from './pgn.js';
import { buildPositions, buildGameAnalysis, selectDeepKeys, moveCore, evalPosition, terminalPosition } from './build.js';
import { estimateElo } from './elo.js';

export { parseGame, fenKey, sanLine } from './pgn.js';
export { lookupOpening } from './eco.js';
export { CLASSIFICATIONS } from './classify.js';

const PROGRESS_MIN_GAP_MS = 250; // <= 4 events/s per user
const MAX_CONSECUTIVE_FAILURES = 5;
const FATAL_CODES = new Set(['engine_start', 'engine_missing', 'engine_stopped']);

const round4 = (x) => Math.round(x * 1e4) / 1e4;

function codedError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * @param {object} deps
 * @param {object} deps.sql              ctx.sql-like: prepare(sql).get/all/run, transaction(fn)
 * @param {(settings:object)=>object} deps.engineFactory   returns an Engine (see lib/engine)
 * @param {(userId:string, topic:string, payload:object)=>void} [deps.publish]
 * @param {(userId:string)=>Promise<object>|object} deps.getSettings  effective settings of the user
 */
export function createAnalysisService({ sql, engineFactory, publish = () => {}, getSettings, now = Date.now, log = () => {} }) {
  const get = (q, ...a) => sql.prepare(q).get(...a) ?? null;
  const all = (q, ...a) => sql.prepare(q).all(...a);
  const run = (q, ...a) => sql.prepare(q).run(...a);
  const iso = () => new Date(now()).toISOString();

  let stopped = true;
  let loopPromise = null;
  let current = null; // { userId, gameId, ac, reason }
  let engine = null;
  let engineKey = null;
  let engineInfo = null;
  let engineState = 'idle';
  let engineError = null;

  // ---- engine access (priority mutex: concurrency 1, trainer requests jump the queue) -----------
  const gate = { busy: false, waiters: [] };
  async function withEngine(priority, fn) {
    if (gate.busy) {
      await new Promise((resolve) => {
        gate.waiters.push({ priority, resolve });
        gate.waiters.sort((a, b) => b.priority - a.priority); // stable: FIFO within a priority
      });
    } else {
      gate.busy = true;
    }
    try {
      return await fn();
    } finally {
      const next = gate.waiters.shift();
      if (next) next.resolve(); else gate.busy = false;
    }
  }

  async function ensureEngine(settings) {
    const key = `${settings.threads ?? 0}|${settings.hashMb ?? 64}|${settings.engineVariant ?? ''}`;
    if (engine && key !== engineKey) {
      await engine.stop();
      engine = null;
    }
    if (!engine) {
      engine = engineFactory(settings);
      engineKey = key;
    }
    if (!engine.isReady()) engineState = 'starting';
    try {
      engineInfo = await engine.start();
      engineState = 'ready';
      engineError = null;
      return engineInfo;
    } catch (err) {
      engineState = err?.code === 'engine_missing' ? 'missing' : 'error';
      engineError = String(err?.message ?? err);
      throw err;
    }
  }

  // ---- eval cache ----------------------------------------------------------------------------------
  function cachedEval(userId, key, depth) {
    const row = get('SELECT depth, multipv_json FROM evals WHERE user_id = ? AND fen_key = ?', userId, key);
    if (!row || row.depth < depth) return null;
    try {
      const lines = JSON.parse(row.multipv_json);
      return Array.isArray(lines) ? { depth: row.depth, lines } : null;
    } catch {
      return null;
    }
  }

  function storeEval(userId, key, depth, lines) {
    run(
      `INSERT INTO evals (user_id, fen_key, depth, multipv_json, engine, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, fen_key) DO UPDATE SET depth = excluded.depth, multipv_json = excluded.multipv_json,
         engine = excluded.engine, created_at = excluded.created_at WHERE excluded.depth >= evals.depth`,
      userId, key, depth, JSON.stringify(lines), engineInfo?.name ?? null, iso(),
    );
  }

  /** Evaluate (or reuse) one position at >= depth. Returns { depth, lines }; throws on engine failure. */
  async function evaluate(userId, fen, depth, { priority = 0, signal, settings }) {
    const key = fenKey(fen);
    const hit = cachedEval(userId, key, depth);
    if (hit) return hit;
    return withEngine(priority, async () => {
      if (signal?.aborted) throw codedError('cancelled', 'Analysis cancelled');
      await ensureEngine(settings);
      engineState = 'busy';
      try {
        const res = await engine.analyse(fen, { depth, multipv: 2, signal });
        if (!res.lines.length) throw codedError('no_result', 'The engine returned no evaluation');
        storeEval(userId, key, depth, res.lines);
        return { depth, lines: res.lines };
      } finally {
        if (engineState === 'busy') engineState = 'ready';
      }
    });
  }

  // ---- progress ------------------------------------------------------------------------------------
  const lastPublished = new Map();
  function progress(userId, gameId, done, total, phase) {
    run('UPDATE analysis_queue SET phase = ?, done = ?, total = ?, updated_at = ? WHERE user_id = ? AND game_id = ?', phase, done, total, iso(), userId, gameId);
    const t = now();
    if (t - (lastPublished.get(userId) ?? -Infinity) < PROGRESS_MIN_GAP_MS) return;
    lastPublished.set(userId, t);
    publish(userId, 'analysis.progress', { gameId, done, total, phase });
  }

  // ---- one game --------------------------------------------------------------------------------------
  function saveInvalid(userId, gameId, state, error, settings) {
    run(
      `INSERT INTO analyses (user_id, game_id, state, depth_fast, depth_deep, error, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, game_id) DO UPDATE SET state = excluded.state, error = excluded.error, finished_at = excluded.finished_at`,
      userId, gameId, state, settings?.depthFast ?? null, settings?.depthDeep ?? null, error, iso(), iso(),
    );
  }

  function saveAnalysis(userId, a, startedAt) {
    sql.transaction(() => {
      run('DELETE FROM move_analyses WHERE user_id = ? AND game_id = ?', userId, a.gameId);
      const ins = sql.prepare(
        `INSERT INTO move_analyses (user_id, game_id, ply, san, uci, color, fen_before, fen_after, eval_cp, eval_mate,
           best_uci, best_san, second_san, loss, classification, accuracy, phase, line_json, top_json, failed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const m of a.moves) {
        ins.run(
          userId, a.gameId, m.ply, m.san, m.uci, m.color, m.fenBefore, m.fenAfter,
          m.evalAfter.cp ?? null, m.evalAfter.mate ?? null,
          m.bestUci, m.bestSan, m.secondSan ?? null, m.loss, m.classification, m.accuracy, m.phase,
          JSON.stringify(m.line), JSON.stringify(m.topLines), m.failed ? 1 : 0,
        );
      }
      run(
        `INSERT INTO analyses (user_id, game_id, state, engine_name, depth_fast, depth_deep, acc_white, acc_black,
           counts_json, critical_json, initial_json, error, started_at, finished_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
         ON CONFLICT(user_id, game_id) DO UPDATE SET state = excluded.state, engine_name = excluded.engine_name,
           depth_fast = excluded.depth_fast, depth_deep = excluded.depth_deep, acc_white = excluded.acc_white,
           acc_black = excluded.acc_black, counts_json = excluded.counts_json, critical_json = excluded.critical_json,
           initial_json = excluded.initial_json, error = NULL, started_at = excluded.started_at, finished_at = excluded.finished_at`,
        userId, a.gameId, a.state, a.engine.name, a.engine.depthFast, a.engine.depthDeep, a.accuracy.white, a.accuracy.black,
        JSON.stringify(a.counts), JSON.stringify(a.criticalMoments), JSON.stringify(a.initial), startedAt, iso(),
      );
      run('UPDATE games SET analyzed = 1, plies = ? WHERE user_id = ? AND id = ?', a.moves.length, userId, a.gameId);
    });
  }

  async function analyseGame(userId, gameId, signal) {
    const game = get('SELECT pgn, rules FROM games WHERE user_id = ? AND id = ?', userId, gameId);
    if (!game) throw codedError('game_not_found', 'Game not found');
    const settings = await getSettings(userId);
    const { depthFast, depthDeep } = settings;
    const parsed = parseGame(game.pgn, { rules: game.rules });
    if (parsed.invalid) {
      saveInvalid(userId, gameId, 'invalid', parsed.error, settings);
      return { state: 'invalid', error: parsed.error };
    }
    const startedAt = iso();
    const positions = buildPositions(parsed, () => null);
    const todo = [];
    const seen = new Set();
    for (const p of positions) {
      if (p.terminal || seen.has(p.key)) continue;
      seen.add(p.key);
      todo.push({ key: p.key, fen: p.fen });
    }
    const fenOf = new Map(todo.map((p) => [p.key, p.fen]));
    const best = new Map(); // key -> { depth, lines } (deepest known)
    const failedKeys = new Set();
    let consecutiveFailures = 0;

    const step = async (item, depth) => {
      if (signal.aborted) throw codedError('cancelled', 'Analysis cancelled');
      try {
        const ev = await evaluate(userId, item.fen, depth, { signal, settings });
        best.set(item.key, ev);
        failedKeys.delete(item.key);
        consecutiveFailures = 0;
      } catch (err) {
        if (signal.aborted || FATAL_CODES.has(err?.code)) throw err;
        log('position failed', item.key, err?.message);
        if (!best.has(item.key)) failedKeys.add(item.key);
        if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) throw err;
      }
    };

    // Pass A: every position at depthFast.
    let done = 0;
    progress(userId, gameId, 0, todo.length, 'A');
    for (const item of todo) {
      await step(item, depthFast);
      progress(userId, gameId, ++done, todo.length, 'A');
    }

    // Pass B: positions around the moves that lost >= 0.05, at depthDeep.
    if (depthDeep > depthFast) {
      const deepKeys = selectDeepKeys(parsed, (k) => best.get(k) ?? null, 0.05);
      done = 0;
      progress(userId, gameId, 0, deepKeys.length, 'B');
      for (const key of deepKeys) {
        await step({ key, fen: fenOf.get(key) }, depthDeep);
        progress(userId, gameId, ++done, deepKeys.length, 'B');
      }
    }

    const info = engineInfo ?? { name: 'Stockfish', version: '' };
    const analysis = buildGameAnalysis({
      gameId, parsed, getEval: (k) => best.get(k) ?? null, engine: info, depthFast, depthDeep,
    });
    saveAnalysis(userId, analysis, startedAt);
    return { state: analysis.state };
  }

  // ---- queue loop ------------------------------------------------------------------------------------
  const nextRow = () => get(
    "SELECT user_id, game_id FROM analysis_queue WHERE state = 'queued' ORDER BY priority DESC, enqueued_at ASC, rowid ASC LIMIT 1",
  );
  const setQueueState = (userId, gameId, state) =>
    run('UPDATE analysis_queue SET state = ?, updated_at = ? WHERE user_id = ? AND game_id = ?', state, iso(), userId, gameId);

  async function processRow({ user_id: userId, game_id: gameId }) {
    const ac = new AbortController();
    current = { userId, gameId, ac, reason: null };
    setQueueState(userId, gameId, 'running');
    try {
      const res = await analyseGame(userId, gameId, ac.signal);
      setQueueState(userId, gameId, res.state === 'invalid' ? 'failed' : 'done');
      publish(userId, 'analysis.done', { gameId, state: res.state });
    } catch (err) {
      if (current.reason === 'stop') {
        setQueueState(userId, gameId, 'queued'); // resumed by the next start()
      } else if (current.reason === 'cancel' || err?.code === 'cancelled') {
        setQueueState(userId, gameId, 'cancelled');
        publish(userId, 'analysis.done', { gameId, state: 'cancelled' });
      } else {
        const message = String(err?.message ?? err);
        log('analysis failed', gameId, message);
        saveInvalid(userId, gameId, 'failed', message, null);
        setQueueState(userId, gameId, 'failed');
        publish(userId, 'analysis.done', { gameId, state: 'failed' });
      }
    } finally {
      current = null;
    }
  }

  async function runLoop() {
    while (!stopped) {
      const row = nextRow();
      if (!row) return;
      await processRow(row);
    }
  }

  function kick() {
    if (stopped || loopPromise) return;
    loopPromise = runLoop()
      .catch((err) => log('analysis loop crashed', err))
      .finally(() => {
        loopPromise = null;
        if (!stopped && nextRow()) kick();
      });
  }

  // ---- public API --------------------------------------------------------------------------------------
  function enqueue(userId, gameIds, priority = 0) {
    let queued = 0;
    const ids = [...new Set((gameIds ?? []).map(String))];
    for (const id of ids) {
      const g = get(
        `SELECT a.state AS astate FROM games g LEFT JOIN analyses a ON a.user_id = g.user_id AND a.game_id = g.id
         WHERE g.user_id = ? AND g.id = ?`, userId, id,
      );
      if (!g || g.astate === 'ready') continue;
      const q = get('SELECT state, priority FROM analysis_queue WHERE user_id = ? AND game_id = ?', userId, id);
      if (q && (q.state === 'queued' || q.state === 'running')) {
        if (q.state === 'queued' && priority > q.priority) {
          run('UPDATE analysis_queue SET priority = ?, updated_at = ? WHERE user_id = ? AND game_id = ?', priority, iso(), userId, id);
        }
        continue;
      }
      const t = iso();
      run(
        `INSERT INTO analysis_queue (user_id, game_id, priority, state, phase, done, total, enqueued_at, updated_at)
         VALUES (?, ?, ?, 'queued', NULL, 0, 0, ?, ?)
         ON CONFLICT(user_id, game_id) DO UPDATE SET priority = excluded.priority, state = 'queued', phase = NULL,
           done = 0, total = 0, enqueued_at = excluded.enqueued_at, updated_at = excluded.updated_at`,
        userId, id, priority, t, t,
      );
      queued++;
    }
    kick();
    return { queued };
  }

  function cancel(userId, gameId) {
    let cancelled = 0;
    const filter = gameId === undefined || gameId === null ? '' : ' AND game_id = ?';
    const args = gameId === undefined || gameId === null ? [userId] : [userId, String(gameId)];
    cancelled += run(
      `UPDATE analysis_queue SET state = 'cancelled', updated_at = ? WHERE user_id = ? AND state = 'queued'${filter}`,
      iso(), ...args,
    ).changes ?? 0;
    if (current && current.userId === userId && (gameId === undefined || gameId === null || current.gameId === String(gameId))) {
      current.reason = 'cancel';
      current.ac.abort();
      cancelled++;
    }
    return { cancelled };
  }

  function counts(userId) {
    const out = { queued: 0, running: 0, done: 0 };
    for (const r of all('SELECT state, COUNT(*) AS n FROM analysis_queue WHERE user_id = ? GROUP BY state', userId)) {
      if (r.state in out) out[r.state] = r.n;
    }
    return out;
  }

  function getAnalysis(userId, gameId) {
    const id = String(gameId);
    const a = get('SELECT * FROM analyses WHERE user_id = ? AND game_id = ?', userId, id);
    if (a && (a.state === 'ready' || a.state === 'partial')) return rebuild(userId, a);
    const q = get('SELECT state, phase, done, total FROM analysis_queue WHERE user_id = ? AND game_id = ?', userId, id);
    if (q && (q.state === 'queued' || q.state === 'running')) {
      return { state: q.state === 'queued' ? 'pending' : 'running', progress: { done: q.done, total: q.total, phase: q.phase ?? 'A' } };
    }
    if (a) return { state: a.state, error: a.error ?? '' };
    return { state: 'none' };
  }

  function rebuild(userId, a) {
    const rows = all('SELECT * FROM move_analyses WHERE user_id = ? AND game_id = ? ORDER BY ply', userId, a.game_id);
    const json = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
    const name = a.engine_name ?? 'Stockfish';
    return {
      gameId: a.game_id,
      state: a.state,
      engine: { name, version: /\b(\d+(?:\.\d+)*)\b/.exec(name)?.[1] ?? '', depthFast: a.depth_fast, depthDeep: a.depth_deep },
      accuracy: { white: a.acc_white, black: a.acc_black },
      counts: json(a.counts_json, null),
      initial: json(a.initial_json, { eval: { cp: 0 }, lines: [] }),
      moves: rows.map((r) => {
        const m = {
          ply: r.ply, san: r.san, uci: r.uci, color: r.color, fenBefore: r.fen_before, fenAfter: r.fen_after,
          evalAfter: r.eval_mate !== null ? { mate: r.eval_mate } : { cp: r.eval_cp ?? 0 },
          bestUci: r.best_uci, bestSan: r.best_san,
          loss: r.loss, classification: r.classification, accuracy: r.accuracy, phase: r.phase,
          failed: !!r.failed, line: json(r.line_json, []), topLines: json(r.top_json, []),
        };
        if (r.second_san) m.secondSan = r.second_san;
        return m;
      }),
      criticalMoments: json(a.critical_json, []),
      elo: estimateElo(rows.map((r) => ({ color: r.color, loss: r.loss, classification: r.classification, failed: !!r.failed }))),
    };
  }

  function engineStatus() {
    const s = { state: engineState, name: engineInfo?.name ?? '', version: engineInfo?.version ?? '', path: 'bundled-wasm', variant: engine?.variant ?? engineInfo?.variant ?? '' };
    if (engineError && (engineState === 'error' || engineState === 'missing')) s.error = engineError;
    return s;
  }

  async function start() {
    stopped = false;
    run("UPDATE analysis_queue SET state = 'queued', updated_at = ? WHERE state = 'running'", iso());
    kick();
  }

  async function stop() {
    stopped = true;
    if (current) { current.reason = 'stop'; current.ac.abort(); }
    // Stop the engine first: a pending start or search fails fast instead of delaying shutdown.
    if (engine) { try { await engine.stop(); } catch (err) { log('engine stop failed', err); } }
    if (loopPromise) await loopPromise;
    engine = null;
    engineKey = null;
    engineState = 'idle';
  }

  return {
    start, stop, enqueue, cancel, getAnalysis, counts, engineStatus,
    /** Resolves when the queue loop has nothing left to run (tests / graceful shutdown). */
    whenIdle: async () => { while (loopPromise) await loopPromise; },
  };
}
