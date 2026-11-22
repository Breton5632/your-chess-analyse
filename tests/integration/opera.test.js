// Integration: the 1858 Opera Game analysed by createAnalysisService with a scripted fake engine.
// Written against CONTRACT 2.3 and 5 (GameAnalysis). Assumption to confirm with chess-coach.engine:
//   getSettings is called as getSettings(userId) and returns { depthFast, depthDeep, threads, hashMb }.
import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from '../helpers/ctx.js';
import { createAnalysisService } from '../../lib/analysis/index.js';
import { OPERA_PLIES, OPERA_WHITE_MOVES, OPERA_BLACK_MOVES, START_FEN, createScriptedEngine, insertGame, assertLegalLine, waitFor } from './opera-game.js';

const CLASSES = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
const SETTINGS = { depthFast: 12, depthDeep: 18, threads: 1, hashMb: 16 };
const quiet = { info() {}, warn() {}, error() {} };

function build(engine = createScriptedEngine()) {
  const sql = memoryDb();
  const published = [];
  const service = createAnalysisService({
    sql, engineFactory: () => engine, getSettings: async () => SETTINGS, log: quiet,
    publish: (userId, topic, payload) => published.push({ userId, topic, payload }),
  });
  return { sql, engine, service, published };
}

const finished = (service, userId, id) => waitFor(async () => {
  const x = await service.getAnalysis(userId, id);
  return ['ready', 'partial', 'failed', 'invalid'].includes(x.state) ? x : null;
}, 20000, `analysis of ${id}`);

async function analyseOpera() {
  const ctx = build();
  const id = insertGame(ctx.sql);
  await ctx.service.start();
  const queued = await ctx.service.enqueue('u1', [id]);
  const a = await finished(ctx.service, 'u1', id);
  return { ...ctx, id, a, queued };
}

test('Opera Game: complete GameAnalysis (CONTRACT 5)', async () => {
  const { service, a, id, engine, published, queued } = await analyseOpera();
  try {
    assert.equal(queued.queued, 1);
    assert.equal(a.state, 'ready', JSON.stringify(a.error || a.state));
    assert.equal(a.gameId, id);
    assert.equal(a.moves.length, OPERA_PLIES);
    a.moves.forEach((m, i) => assert.equal(m.ply, i + 1));
    for (const side of ['white', 'black']) {
      assert.ok(a.accuracy[side] >= 0 && a.accuracy[side] <= 100, `accuracy ${side}`);
      for (const c of CLASSES) assert.equal(typeof a.counts[side][c], 'number', `counts.${side}.${c} present`);
    }
    const sum = (side) => CLASSES.reduce((s, c) => s + a.counts[side][c], 0);
    assert.equal(sum('white'), OPERA_WHITE_MOVES);
    assert.equal(sum('black'), OPERA_BLACK_MOVES);
    assert.equal(a.moves.filter((m) => m.color === 'white').length, OPERA_WHITE_MOVES);
    assert.ok(a.engine.name);
    assert.equal(a.engine.depthFast, 12);
    assert.equal(a.engine.depthDeep, 18);
    assert.ok(a.initial && a.initial.eval && Array.isArray(a.initial.lines));
    for (const m of a.moves) {
      assert.ok(CLASSES.includes(m.classification), `class ${m.classification}`);
      assert.ok(m.loss >= 0, 'loss >= 0');
      assert.ok(m.accuracy >= 0 && m.accuracy <= 100);
      assert.ok(m.evalAfter && ('cp' in m.evalAfter || 'mate' in m.evalAfter));
      assertLegalLine(assert, m.fenBefore, [m.san], `ply ${m.ply} san`);
      if (m.bestSan) assertLegalLine(assert, m.fenBefore, [m.bestSan], `ply ${m.ply} bestSan`);
      if (m.secondSan) assertLegalLine(assert, m.fenBefore, [m.secondSan], `ply ${m.ply} secondSan`);
      assertLegalLine(assert, m.fenBefore, m.line, `ply ${m.ply} line`);
      assert.ok(m.line.length <= 6);
      for (const t of m.topLines || []) { assertLegalLine(assert, m.fenAfter, t.san, `ply ${m.ply} topLines`); assert.ok(t.san.length <= 6); }
    }
    for (const l of a.initial.lines) assertLegalLine(assert, START_FEN, l.san, 'initial');
    // White POV: the last move is evaluated as a mate for White; ply 32 leaves White mating.
    const last = a.moves.at(-1);
    assert.equal(last.san, 'Rd8#');
    assert.ok('mate' in last.evalAfter, 'final move evaluated as mate');
    assert.ok(a.moves[31].evalAfter.mate > 0, 'after Qb8+ Nxb8 White mates (WHITE POV, positive)');
    // critical moments
    assert.ok(a.criticalMoments.length <= 8);
    assert.deepEqual([...a.criticalMoments].sort((x, y) => x - y), a.criticalMoments);
    for (const p of a.criticalMoments) assert.ok(p >= 1 && p <= OPERA_PLIES);
    // the script swings the evaluation from +60 to +150 on Black's ply 18 (9...b5): a real loss must show
    assert.ok(a.moves.some((m) => m.loss > 0.05), 'scripted evaluation produces at least one real loss');
    assert.equal(engine.state.maxActive, 1, 'engine concurrency 1');
    assert.ok(published.every((e) => e.userId === 'u1'), 'realtime events go to the owner');
    assert.ok(published.some((e) => e.topic === 'analysis.done' && e.payload.gameId === id));
    assert.deepEqual(Object.keys(service.counts('u1')).sort(), ['done', 'queued', 'running']);
    assert.equal(service.counts('u1').done, 1);
  } finally { await service.stop(); }
});

test('Opera Game: pass A covers every position, pass B is a strict subset, MultiPV 2', async () => {
  const { service, engine } = await analyseOpera();
  try {
    const fast = new Set(engine.state.calls.filter((c) => c.depth === 12).map((c) => c.key));
    const deep = engine.state.calls.filter((c) => c.depth === 18);
    assert.ok(fast.size >= OPERA_PLIES, 'pass A covers all positions');
    assert.ok(deep.length > 0, 'pass B ran');
    assert.ok(deep.length < fast.size, 'pass B is a strict subset');
    assert.ok(engine.state.calls.every((c) => c.multipv === 2), 'MultiPV fixed at 2');
  } finally { await service.stop(); }
});

test('Opera Game: re-enqueue of a ready game is a no-op (engine not called again)', async () => {
  const { service, engine, id } = await analyseOpera();
  try {
    const before = engine.state.calls.length;
    const r = await service.enqueue('u1', [id]);
    assert.equal(r.queued, 0);
    await new Promise((r2) => setTimeout(r2, 150));
    assert.equal(engine.state.calls.length, before);
  } finally { await service.stop(); }
});

test('analysis is isolated per user', async () => {
  const { service, id } = await analyseOpera();
  try {
    const other = await service.getAnalysis('u2', id);
    assert.ok(!['ready', 'partial'].includes(other.state), `u2 must not see u1's analysis, got ${other.state}`);
    assert.equal(service.counts('u2').done, 0);
  } finally { await service.stop(); }
});

test('variant and illegal games end invalid with a reason, never crash', async () => {
  const { sql, service } = build();
  insertGame(sql, { id: '2000002', rules: 'chess960' });
  insertGame(sql, { id: '2000003', pgn: '[Event "x"]\n\n1. e4 e4 *' });
  await service.start();
  try {
    await service.enqueue('u1', ['2000002', '2000003']);
    for (const id of ['2000002', '2000003']) {
      const a = await finished(service, 'u1', id);
      assert.equal(a.state, 'invalid', id);
      assert.ok(a.error, 'reason present');
    }
  } finally { await service.stop(); }
});

test('stop() stops the engine (no worker left behind)', async () => {
  const { service, engine, id } = await analyseOpera();
  await service.stop();
  assert.equal(engine.state.stopped, true);
  assert.equal(engine.state.active, 0);
  assert.ok(id);
});
