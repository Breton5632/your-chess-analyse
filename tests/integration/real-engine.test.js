// Optional real-engine test (the only skipped test). Run with CHESS_REAL_ENGINE=1 (CONTRACT: the engine is the
// bundled Stockfish WASM, so there is no enginePath any more, D1). Bounded: depth 10, 3 positions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../../lib/engine/index.js';

const enabled = process.env.CHESS_REAL_ENGINE === '1' || !!process.env.CHESS_ENGINE_PATH;

test('real Stockfish: mate in 1, start position, simple ending', { skip: !enabled && 'set CHESS_REAL_ENGINE=1', timeout: 120000 }, async () => {
  const engine = createEngine({ depthFast: 10, depthDeep: 16, threads: 1, hashMb: 16 });
  try {
    const info = await engine.start();
    assert.match(String(info.name), /stockfish/i);
    // Back-rank mate in 1: Ra8#
    let r = await engine.analyse('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', { depth: 10, multipv: 2 });
    assert.equal(r.lines[0].mate, 1);
    assert.equal(r.lines[0].pv[0], 'a1a8');
    // Start position: roughly equal, within ±100 cp, 2 lines
    r = await engine.analyse('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', { depth: 10, multipv: 2 });
    assert.equal(r.lines.length, 2);
    assert.ok(Math.abs(r.lines[0].scoreCp) <= 100);
    // KQ vs K: strongly winning for the side to move
    r = await engine.analyse('8/8/8/4k3/8/8/4K3/7Q w - - 0 1', { depth: 10, multipv: 1 });
    assert.ok(r.lines[0].mate > 0 || r.lines[0].scoreCp > 500);
  } finally { await engine.stop(); }
});
