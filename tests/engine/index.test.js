import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, checkEngine, resolveThreads, missingEngineFiles, ENGINE_PATH_LABEL } from '../../lib/engine/index.js';
import { createFakeUci } from './fake-uci.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('resolveThreads: 0 = min(4, floor(cores/2)) with a floor of 1', () => {
  assert.equal(resolveThreads(0, 1), 1);
  assert.equal(resolveThreads(0, 2), 1);
  assert.equal(resolveThreads(0, 8), 4);
  assert.equal(resolveThreads(0, 64), 4);
  assert.equal(resolveThreads(3, 64), 3);
  assert.equal(resolveThreads(99, 64), 16);
});

test('vendored Stockfish lite files are present (not executed here)', () => {
  assert.deepEqual(missingEngineFiles('lite-single'), []);
  assert.deepEqual(missingEngineFiles('lite'), []);
  assert.equal(ENGINE_PATH_LABEL, 'bundled-wasm');
});

test('createEngine follows the Engine interface through an injected transport', async () => {
  const fake = createFakeUci();
  const engine = createEngine({ threads: 0, hashMb: 64, spawnLine: fake.spawnLine });
  assert.equal(engine.isReady(), false);
  const info = await engine.start();
  assert.equal(info.name, 'Fake Stockfish 19');
  assert.equal(engine.isReady(), true);
  const res = await engine.analyse(START, { depth: 6 });
  assert.equal(res.lines.length, 2);
  await engine.cancel(); // nothing running: no-op
  await engine.stop();
  assert.equal(engine.isReady(), false);
});

test('the multi-thread lite variant is the default and honours the Threads setting', async () => {
  const fake = createFakeUci();
  const engine = createEngine({ threads: 8, spawnLine: fake.spawnLine });
  assert.equal(engine.variant, 'lite');
  await engine.start();
  assert.ok(fake.state.commands.includes('setoption name Threads value 8'));
  await engine.stop();
});

test('the single-thread variant stays available and always sends Threads 1', async () => {
  const fake = createFakeUci();
  const engine = createEngine({ threads: 8, engineVariant: 'lite-single', spawnLine: fake.spawnLine });
  assert.equal(engine.variant, 'lite-single');
  await engine.start();
  assert.ok(fake.state.commands.includes('setoption name Threads value 1'));
  await engine.stop();
});

test('checkEngine reports ok + identity, and never throws on failure', async () => {
  const fake = createFakeUci();
  const ok = await checkEngine({ spawnLine: fake.spawnLine });
  assert.equal(ok.ok, true);
  assert.equal(ok.name, 'Fake Stockfish 19');
  assert.equal(ok.nnue, true);
  assert.equal(typeof ok.cores, 'number');
  assert.equal(ok.variant, 'lite');
  assert.equal(fake.state.terminated, 1); // one-shot: nothing left running

  const bad = await checkEngine({ spawnLine: () => { throw new Error('boom'); } });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /boom/);
  assert.equal(bad.code, 'engine_start');
});

// Optional: runs the real bundled WASM in a worker thread. Operator approval is needed first (P5).
test('REAL engine: start position and mate in one (CHESS_ENGINE_REAL=1)', { skip: process.env.CHESS_ENGINE_REAL !== '1' }, async () => {
  const engine = createEngine({ threads: 1, hashMb: 16 });
  try {
    const info = await engine.start();
    assert.match(info.name, /stockfish/i);
    const start = await engine.analyse(START, { depth: 8 });
    assert.ok(start.lines.length >= 1 && start.lines[0].pv.length > 0);
    const mate = await engine.analyse('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { depth: 8 });
    assert.equal(mate.lines[0].pv[0], 'a1a8');
    assert.equal(mate.lines[0].mate, 1);
  } finally {
    await engine.stop();
  }
});

test('the default threaded build falls back to the single-thread build when it cannot start (real worker, lite files hidden)', { skip: process.env.CHESS_REAL_ENGINE === '1' ? false : 'set CHESS_REAL_ENGINE=1 (it temporarily renames a vendored file)' }, async () => {
  const { renameSync, existsSync } = await import('node:fs');
  const dir = new URL('../../vendor/stockfish/', import.meta.url);
  const wasm = new URL('stockfish-19-lite.wasm', dir);
  const bak = new URL('stockfish-19-lite.wasm.bak', dir);
  if (!existsSync(wasm)) return;
  renameSync(wasm, bak);
  const engine = createEngine({ threads: 0, hashMb: 16 });
  try {
    const info = await engine.start();
    assert.equal(engine.variant, 'lite-single');
    assert.match(info.name, /Stockfish/i);
  } finally {
    await engine.stop();
    renameSync(bak, wasm);
  }
});
