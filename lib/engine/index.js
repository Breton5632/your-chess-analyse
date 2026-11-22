// Engine entry point (CONTRACT §2.2): Adapter B = Stockfish WASM (npm `stockfish` 19.0.1, GPL-3.0, lite NNUE)
// running in a node:worker_threads Worker, driven by the transport-agnostic UCI driver.
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createUciEngine, EngineError } from './uci.js';

export { createUciEngine, EngineError, parseInfo } from './uci.js';

const WORKER_URL = new URL('./worker.js', import.meta.url);
const VENDOR_DIR = new URL('../../vendor/stockfish/', import.meta.url);
const VARIANT_FILES = { 'lite-single': 'stockfish-19-lite-single', lite: 'stockfish-19-lite' };
/** WASM linear memory is limited: never ask the engine for more hash than this. */
export const WASM_HASH_CAP_MB = 512;
export const ENGINE_PATH_LABEL = 'bundled-wasm';

export function cores() {
  try { return availableParallelism(); } catch { return 1; }
}

/** threads: 0 = automatic = min(4, floor(cores/2)), at least 1. */
export function resolveThreads(threads, coreCount = cores()) {
  const t = Number(threads) || 0;
  if (t >= 1) return Math.min(16, Math.floor(t));
  return Math.max(1, Math.min(4, Math.floor(coreCount / 2)));
}

/** Files of a vendored variant that are missing on disk (empty = complete). */
export function missingEngineFiles(variant = 'lite-single') {
  const base = VARIANT_FILES[variant];
  if (!base) return [`unknown variant ${variant}`];
  return [`${base}.js`, `${base}.wasm`].filter((f) => !existsSync(fileURLToPath(new URL(f, VENDOR_DIR))));
}

/** Transport over a worker thread. Resolves once the thread is running; commands sent early are queued by the engine. */
export function workerTransport(variant) {
  return function spawnLine({ onLine, onExit }) {
    const worker = new Worker(WORKER_URL, { workerData: { variant } });
    let exited = false;
    const exit = (err) => { if (!exited) { exited = true; onExit(err); } };
    worker.on('message', (msg) => { if (msg?.type === 'line') onLine(msg.line); });
    worker.on('error', (err) => exit(err));
    worker.on('exit', (code) => exit(code ? new Error(`worker exited with code ${code}`) : undefined));
    return {
      send: (line) => worker.postMessage({ type: 'cmd', line }),
      terminate: () => worker.terminate(),
    };
  };
}

/**
 * @param {{ threads?:number, hashMb?:number, engineVariant?:'lite-single'|'lite', spawnLine?:Function }} settings
 *   `spawnLine` is a test hook replacing the worker transport.
 */
export function createEngine(settings = {}) {
  // Multi-thread lite build by default (about 2x faster at depth 20 with 4 threads, measured); the single-thread build
  // stays available through settings.engineVariant === 'lite-single' (the Threads option has no effect on it).
  let variant = settings.engineVariant === 'lite-single' ? 'lite-single' : 'lite';
  const threads = resolveThreads(settings.threads);
  const makeDriver = (v) => createUciEngine({
    spawnLine: settings.spawnLine ?? workerTransport(v),
    options: { threads: v === 'lite' ? threads : 1, hashMb: settings.hashMb ?? 64, hashCapMb: WASM_HASH_CAP_MB, variant: v },
    log: settings.log,
  });
  let driver = makeDriver(variant);
  const checkFiles = () => {
    if (settings.spawnLine || driver.isReady()) return;
    const missing = missingEngineFiles(variant);
    if (missing.length) throw new EngineError('engine_missing', `Stockfish files are missing from the package: ${missing.join(', ')}`);
  };
  const engine = {
    get variant() { return variant; },
    start: async () => {
      try {
        checkFiles();
        return await driver.start();
      } catch (err) {
        // The threaded build needs SharedArrayBuffer / worker threads: fall back to the single-thread build on another runtime.
        if (variant !== 'lite' || settings.spawnLine) throw err;
        try { await driver.stop(); } catch { /* ignore */ }
        variant = 'lite-single';
        driver = makeDriver(variant);
        checkFiles();
        return driver.start();
      }
    },
    stop: () => driver.stop(),
    cancel: () => driver.cancel(),
    isReady: () => driver.isReady(),
    analyse: (fen, opts) => driver.analyse(fen, opts),
    get info() { return driver.info; },
  };
  return engine;
}

/** One-shot health check used by `POST engine/check`. Never throws. */
export async function checkEngine(settings = {}) {
  const coreCount = cores();
  const threads = resolveThreads(settings.threads, coreCount);
  const engine = createEngine(settings);
  try {
    const info = await engine.start();
    return { ok: true, name: info.name, version: info.version, nnue: info.nnue, cores: coreCount, threads: info.threads ?? threads, variant: engine.variant };
  } catch (err) {
    return { ok: false, name: '', version: '', nnue: false, cores: coreCount, threads, variant: engine.variant, error: String(err?.message ?? err), code: err?.code };
  } finally {
    await engine.stop();
  }
}
