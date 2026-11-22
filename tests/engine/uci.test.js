import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUciEngine, parseInfo, EngineError } from '../../lib/engine/uci.js';
import { createFakeUci, sleep } from './fake-uci.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function setup(opts = {}, engineOpts = {}) {
  const fake = createFakeUci(opts);
  const engine = createUciEngine({
    spawnLine: fake.spawnLine,
    options: { threads: 2, hashMb: 128, variant: 'fake', ...engineOpts.options },
    startTimeoutMs: 200,
    stopGraceMs: 80,
    terminateWaitMs: 50,
    defaultTimeoutMs: 1000,
    ...engineOpts,
  });
  return { fake, engine };
}

test('parseInfo: cp, mate, multipv, bounds, malformed', () => {
  assert.deepEqual(parseInfo('info depth 12 seldepth 18 multipv 2 score cp -34 nodes 5 pv e7e5 g1f3'),
    { multipv: 2, depth: 12, pv: ['e7e5', 'g1f3'], bound: null, scoreCp: -34 });
  assert.equal(parseInfo('info depth 20 score mate 3 pv h5f7').mate, 3);
  assert.equal(parseInfo('info depth 20 score mate -2 pv h5f7').mate, -2);
  assert.equal(parseInfo('info depth 9 score cp 50 lowerbound pv e2e4').bound, 'lowerbound');
  assert.equal(parseInfo('info depth 9 score cp 50 pv e2e4 zz99 e7e5').pv.length, 1);
  for (const bad of ['', 'info', 'info depth', 'info depth x score cp 1', 'info depth 3 score cp abc',
    'info depth 3 score wat 5', 'info string depth 3 score cp 9', 'bestmove e2e4', 'info nodes 5', 'info depth 3']) {
    assert.equal(parseInfo(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('handshake sends uci then the four options then isready, and reports identity', async () => {
  const { fake, engine } = setup();
  const info = await engine.start();
  assert.equal(info.name, 'Fake Stockfish 19');
  assert.equal(info.version, '19');
  assert.equal(info.variant, 'fake');
  assert.equal(engine.isReady(), true);
  assert.deepEqual(fake.state.commands, [
    'uci',
    'setoption name Threads value 2',
    'setoption name Hash value 128',
    'setoption name MultiPV value 2',
    'setoption name UCI_AnalyseMode value true',
    'isready',
  ]);
  await engine.stop();
  assert.equal(engine.isReady(), false);
  assert.equal(fake.state.terminated, 1);
});

test('hash is clamped to the engine maximum and to the WASM cap', async () => {
  const a = setup({}, { options: { hashMb: 4096 } });
  await a.engine.start();
  assert.ok(a.fake.state.commands.includes('setoption name Hash value 2048'));
  await a.engine.stop();
  const b = setup({}, { options: { hashMb: 4096, hashCapMb: 512 } });
  const info = await b.engine.start();
  assert.ok(b.fake.state.commands.includes('setoption name Hash value 512'));
  assert.equal(info.hashMb, 512);
  await b.engine.stop();
});

test('analyse: go depth N, lines sorted by multipv, raw side-to-move scores', async () => {
  const evalFor = () => [
    { cp: 35, pv: ['e7e5', 'g1f3'] },
    { mate: -3, pv: ['c7c5'] },
  ];
  const { fake, engine } = setup({ evalFor });
  const res = await engine.analyse(AFTER_E4, { depth: 14 });
  assert.equal(res.lines.length, 2);
  assert.deepEqual(res.lines[0], { multipv: 1, depth: 14, pv: ['e7e5', 'g1f3'], scoreCp: 35 });
  assert.deepEqual(res.lines[1], { multipv: 2, depth: 14, pv: ['c7c5'], mate: -3 });
  assert.ok(fake.state.commands.includes(`position fen ${AFTER_E4}`));
  assert.ok(fake.state.commands.includes('go depth 14'));
  await engine.stop();
});

test('multipv option change is applied before the search', async () => {
  const { fake, engine } = setup();
  const res = await engine.analyse(START, { depth: 5, multipv: 1 });
  assert.equal(res.lines.length, 1);
  const cmds = fake.state.commands;
  assert.ok(cmds.lastIndexOf('setoption name MultiPV value 1') < cmds.indexOf('go depth 5'));
  await engine.stop();
});

test('concurrency is 1: searches never overlap and run in order', async () => {
  const { fake, engine } = setup({ goDelayMs: 15 });
  const fens = [START, AFTER_E4, START];
  const results = await Promise.all(fens.map((f) => engine.analyse(f, { depth: 6 })));
  assert.equal(results.length, 3);
  assert.equal(fake.state.maxActiveSearches, 1);
  assert.deepEqual(fake.state.goLog.map((g) => g.fen), fens);
  await engine.stop();
});

test('cancel: stop + drain, under 500 ms, engine kept alive (no respawn)', async () => {
  const { fake, engine } = setup({ goDelayMs: 5000 });
  await engine.start();
  const p = engine.analyse(START, { depth: 30 });
  const rejected = assert.rejects(p, (e) => e.code === 'cancelled');
  await sleep(20);
  const t0 = Date.now();
  await engine.cancel();
  const elapsed = Date.now() - t0;
  await rejected;
  assert.ok(elapsed < 500, `cancel took ${elapsed} ms`);
  assert.ok(fake.state.commands.includes('stop'));
  assert.equal(fake.state.terminated, 0);
  // still usable
  fake.state.behavior.delayFor.set(START.split(' ').slice(0, 4).join(' '), 0);
  const res = await engine.analyse(START, { depth: 4 });
  assert.equal(res.lines.length, 2);
  assert.equal(fake.state.spawns, 1);
  await engine.stop();
});

test('cancel when the engine ignores stop: terminate fallback within 500 ms, lazy restart afterwards', async () => {
  const { fake, engine } = setup({ goDelayMs: 5000 });
  fake.setMode('ignoreStop');
  const p = engine.analyse(START, { depth: 30 });
  const rejected = assert.rejects(p, (e) => e.code === 'cancelled');
  await sleep(20);
  const t0 = Date.now();
  await engine.cancel();
  const elapsed = Date.now() - t0;
  await rejected;
  assert.ok(elapsed < 500, `cancel took ${elapsed} ms`);
  assert.equal(fake.state.terminated, 1);
  assert.equal(engine.isReady(), false);
  fake.setMode('normal');
  fake.state.behavior.delayFor.set(START.split(' ').slice(0, 4).join(' '), 0);
  const res = await engine.analyse(START, { depth: 4 });
  assert.equal(res.lines.length, 2);
  assert.equal(fake.state.spawns, 2);
  await engine.stop();
});

test('abort signal cancels the running search; queued jobs behind it still run', async () => {
  const { fake, engine } = setup({ goDelayMs: 5000 });
  const ac = new AbortController();
  const first = engine.analyse(START, { depth: 30, signal: ac.signal });
  const second = engine.analyse(AFTER_E4, { depth: 7 });
  const firstRejected = assert.rejects(first, (e) => e.code === 'cancelled');
  await sleep(20);
  fake.state.behavior.delayFor.set(AFTER_E4.split(' ').slice(0, 4).join(' '), 0);
  const t0 = Date.now();
  ac.abort();
  await firstRejected;
  const res = await second;
  assert.ok(Date.now() - t0 < 500);
  assert.equal(res.lines.length, 2);
  await engine.stop();
});

test('a job aborted while still queued never reaches the engine', async () => {
  const { fake, engine } = setup({ goDelayMs: 40 });
  const ac = new AbortController();
  const first = engine.analyse(START, { depth: 3 });
  const queued = engine.analyse(AFTER_E4, { depth: 3, signal: ac.signal });
  ac.abort();
  await assert.rejects(queued, (e) => e.code === 'cancelled');
  await first;
  await sleep(30);
  assert.equal(fake.state.goLog.length, 1);
  await engine.stop();
});

test('per-position timeout rejects, recovers the engine, and the next position works', async () => {
  const { fake, engine } = setup();
  fake.state.behavior.hangFens.add(START.split(' ').slice(0, 4).join(' '));
  await assert.rejects(engine.analyse(START, { depth: 12, timeoutMs: 60 }), (e) => e instanceof EngineError && e.code === 'timeout');
  const res = await engine.analyse(AFTER_E4, { depth: 5 });
  assert.equal(res.lines.length, 2);
  await engine.stop();
});

test('engine that never answers uci is killed and start() rejects with engine_start', async () => {
  const { fake, engine } = setup();
  fake.setMode('noUciok');
  const t0 = Date.now();
  await assert.rejects(engine.start(), (e) => e.code === 'engine_start' && /uciok/.test(e.message));
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(fake.state.terminated, 1);
  assert.equal(engine.isReady(), false);
  // restart works once the engine behaves
  fake.setMode('normal');
  await engine.start();
  assert.equal(engine.isReady(), true);
  await engine.stop();
});

test('spawn failure surfaces as engine_start', async () => {
  const engine = createUciEngine({ spawnLine: () => { throw new Error('ENOENT'); } });
  await assert.rejects(engine.analyse(START, { depth: 3 }), (e) => e.code === 'engine_start' && /ENOENT/.test(e.message));
});

test('malformed engine output is tolerated and never poisons the result', async () => {
  const { fake, engine } = setup({ evalFor: () => [{ cp: 20, pv: ['e2e4', 'e7e5'] }, { cp: 5, pv: ['d2d4'] }] });
  fake.setMode('malformed');
  const res = await engine.analyse(START, { depth: 9 });
  assert.equal(res.lines.length, 2);
  assert.equal(res.lines[0].depth, 9);
  assert.equal(res.lines[0].scoreCp, 20);
  assert.deepEqual(res.lines[0].pv, ['e2e4', 'e7e5']);
  await engine.stop();
});

test('crash mid-search rejects with engine_crashed and the next call restarts the engine', async () => {
  const { fake, engine } = setup();
  fake.setMode('crashOnGo');
  await assert.rejects(engine.analyse(START, { depth: 8 }), (e) => e.code === 'engine_crashed');
  assert.equal(engine.isReady(), false);
  fake.setMode('normal');
  const res = await engine.analyse(START, { depth: 8 });
  assert.equal(res.lines.length, 2);
  assert.equal(fake.state.spawns, 2);
  await engine.stop();
});

test('invalid FEN / depth / multipv are rejected before touching the engine (no command injection)', async () => {
  const { fake, engine } = setup();
  await assert.rejects(engine.analyse(`${START}\nquit`, { depth: 5 }), (e) => e.code === 'bad_input');
  await assert.rejects(engine.analyse('x; rm -rf', { depth: 5 }), (e) => e.code === 'bad_input');
  await assert.rejects(engine.analyse(START, { depth: 0 }), (e) => e.code === 'bad_input');
  await assert.rejects(engine.analyse(START, { depth: 5, multipv: 99 }), (e) => e.code === 'bad_input');
  assert.equal(fake.state.spawns, 0);
  assert.equal(fake.state.commands.length, 0);
});

test('stop() fails queued and running jobs and terminates the transport', async () => {
  const { fake, engine } = setup({ goDelayMs: 5000 });
  const a = engine.analyse(START, { depth: 30 });
  const b = engine.analyse(AFTER_E4, { depth: 30 });
  const ra = assert.rejects(a, (e) => e.code === 'engine_stopped');
  const rb = assert.rejects(b, (e) => e.code === 'engine_stopped');
  await sleep(20);
  await engine.stop();
  await ra;
  await rb;
  assert.equal(fake.state.terminated, 1);
  assert.equal(fake.state.activeSearches, 0);
});

test('position without legal moves yields no lines instead of hanging', async () => {
  const mated = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1';
  const { engine } = setup({ evalFor: () => [] });
  const res = await engine.analyse(mated, { depth: 5 });
  assert.deepEqual(res.lines, []);
  await engine.stop();
});
