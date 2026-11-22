// Worker thread entry: hosts the vendored Stockfish WASM build and relays UCI lines through postMessage.
// Never imported on the main thread; started by lib/engine/index.js with workerData = { variant }.
import { parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const VARIANT_FILES = { 'lite-single': 'stockfish-19-lite-single.js', lite: 'stockfish-19-lite.js' };
const file = VARIANT_FILES[workerData?.variant];
if (!parentPort || !file) throw new Error(`Unknown engine variant: ${workerData?.variant}`);

const require = createRequire(import.meta.url);
// vendor/stockfish/package.json marks the folder as CommonJS, which the engine build requires.
const factory = require(fileURLToPath(new URL(`../../vendor/stockfish/${file}`, import.meta.url)));
const engine = factory();
engine.listener = (line) => parentPort.postMessage({ type: 'line', line: String(line) });
parentPort.on('message', (msg) => {
  if (msg?.type === 'cmd' && typeof msg.line === 'string') engine.processCommand(msg.line);
});
parentPort.postMessage({ type: 'online' });
