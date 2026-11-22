// Classification tests (spec §7.5): scripted evaluations, independent of Stockfish.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../../vendor/chess.js';
import { parseGame } from '../../lib/analysis/pgn.js';
import { setEcoTable, inBook } from '../../lib/analysis/eco.js';
import { buildGameAnalysis } from '../../lib/analysis/build.js';
import { classifyMove, phaseOf, criticalMoments, CLASSIFICATIONS } from '../../lib/analysis/classify.js';
import { pgnOf, scriptEvals, randomGame, OPERA_GAME_SANS } from './helpers.js';

const ENGINE = { name: 'Fake Stockfish', version: '19' };

function analyse(sans, spec, { fen, pvLen } = {}) {
  const parsed = parseGame(pgnOf(sans, { fen }));
  assert.equal(parsed.invalid, undefined);
  const script = scriptEvals(parsed, spec, { pvLen });
  return buildGameAnalysis({ gameId: 'g', parsed, getEval: script.getEval, engine: ENGINE, depthFast: 14, depthDeep: 20 });
}
const classOf = (a, ply) => a.moves[ply - 1].classification;

// ---- pure rule table ---------------------------------------------------------------------------------
const base = () => ({
  inBook: false, loss: 0.3, playedIsBest: false, winBest: 50, winAfter: 20, gap: null,
  legalMoves: () => 20, sacrifice: () => 0, prevOpponent: null,
});

test('classifyMove: one move per category', () => {
  const c = (over) => classifyMove({ ...base(), ...over });
  assert.equal(c({ inBook: true, loss: 0.5 }), 'book');
  assert.equal(c({ loss: 0, playedIsBest: true, winBest: 50, winAfter: 50, sacrifice: () => 3 }), 'brilliant');
  assert.equal(c({ loss: 0, playedIsBest: true, winBest: 50, winAfter: 50, gap: 0.2 }), 'great');
  assert.equal(c({ loss: 0.15, prevOpponent: 'blunder', winBest: 80, winAfter: 65 }), 'miss');
  assert.equal(c({ loss: 0, playedIsBest: true }), 'best');
  assert.equal(c({ loss: 0.015 }), 'excellent');
  assert.equal(c({ loss: 0.04 }), 'good');
  assert.equal(c({ loss: 0.08 }), 'inaccuracy');
  assert.equal(c({ loss: 0.15 }), 'mistake');
  assert.equal(c({ loss: 0.35 }), 'blunder');
});

test('classifyMove: priority and boundaries', () => {
  const c = (over) => classifyMove({ ...base(), ...over });
  // thresholds are inclusive upper bounds
  assert.equal(c({ loss: 0.02 }), 'excellent');
  assert.equal(c({ loss: 0.05 }), 'good');
  assert.equal(c({ loss: 0.10 }), 'inaccuracy');
  assert.equal(c({ loss: 0.20 }), 'mistake');
  assert.equal(c({ loss: 0.2001 }), 'blunder');
  // book beats brilliant; brilliant beats great
  assert.equal(c({ inBook: true, loss: 0, playedIsBest: true, sacrifice: () => 5 }), 'book');
  assert.equal(c({ loss: 0, playedIsBest: true, gap: 0.5, winAfter: 50, sacrifice: () => 2 }), 'brilliant');
  // brilliant needs the sacrifice, win% after >= 50 and win% before <= 85
  assert.equal(c({ loss: 0, playedIsBest: true, sacrifice: () => 1 }), 'best');
  assert.equal(c({ loss: 0, playedIsBest: true, sacrifice: () => 3, winAfter: 49 }), 'best');
  assert.equal(c({ loss: 0, playedIsBest: true, sacrifice: () => 3, winBest: 86, winAfter: 90 }), 'best');
  // great window: 15..85 win%, gap >= .15, best move, more than one legal move
  assert.equal(c({ loss: 0, playedIsBest: true, gap: 0.149 }), 'best');
  assert.equal(c({ loss: 0, playedIsBest: true, gap: 0.3, winBest: 14 }), 'best');
  assert.equal(c({ loss: 0, playedIsBest: true, gap: 0.3, winBest: 90 }), 'best');
  assert.equal(c({ loss: 0, playedIsBest: true, gap: 0.3, legalMoves: () => 1 }), 'best');
  assert.equal(c({ loss: 0, playedIsBest: false, gap: 0.3 }), 'best'); // equal-eval alternative is not "unique"
  // miss: previous opponent error, winBest >= 65, 0.10 < loss, not already a blunder
  assert.equal(c({ loss: 0.12, prevOpponent: 'mistake', winBest: 65 }), 'miss');
  assert.equal(c({ loss: 0.12, prevOpponent: 'mistake', winBest: 64 }), 'mistake');
  assert.equal(c({ loss: 0.12, prevOpponent: 'good', winBest: 80 }), 'mistake');
  assert.equal(c({ loss: 0.10, prevOpponent: 'blunder', winBest: 80 }), 'inaccuracy');
  assert.equal(c({ loss: 0.25, prevOpponent: 'blunder', winBest: 90 }), 'blunder');
});

test('phase rule (D9): opening <= ply 30, endgame <= 26 of piece material, else middlegame', () => {
  const full = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const rooks = '4k3/pppp4/8/8/8/8/PPPP4/R3K2R w - - 0 1';
  assert.equal(phaseOf(30, rooks), 'opening');
  assert.equal(phaseOf(31, full), 'middlegame');
  assert.equal(phaseOf(31, rooks), 'endgame');
  assert.equal(phaseOf(80, '4k3/8/8/8/8/8/8/4K3 w - - 0 1'), 'endgame');
  // exactly 26: Q9 + R5 + R5 + B3 + N3 + N... = queen + two rooks + bishop + 2 knights = 9+10+3+6 = 28 > 26
  assert.equal(phaseOf(40, '4k3/8/8/8/8/8/8/RNBQK2R w - - 0 1'), 'endgame'); // 5+3+3+9+5 = 25
  assert.equal(phaseOf(40, '4k3/8/8/8/8/8/8/RNBQK1NR w - - 0 1'), 'middlegame'); // 28
});

// ---- scenarios through the full pipeline (book disabled unless stated) ------------------------------
before(() => setEcoTable({}));
after(() => setEcoTable(null));

test('threshold categories from scripted evals (white moves e4 from an equal position)', () => {
  const at = (cpAfter, best = 'd2d4') => classOf(analyse(['e4'], { 0: { cp: 0, best }, 1: { cp: cpAfter } }), 1);
  assert.equal(at(0, 'e2e4'), 'best'); // played = engine best
  assert.equal(at(-20), 'excellent');
  assert.equal(at(-50), 'good');
  assert.equal(at(-80), 'inaccuracy');
  assert.equal(at(-200), 'mistake');
  assert.equal(at(-400), 'blunder');
});

test('Great: the only move that holds the balance (gap >= 0.15)', () => {
  const a = analyse(['e4', 'e5'], { 0: { cp: 0, second: { cp: -300, uci: 'd2d4' } }, 1: { cp: 0 } });
  assert.equal(classOf(a, 1), 'great');
  assert.equal(a.moves[0].secondSan, 'd4');
  assert.equal(a.moves[0].loss, 0);
  // same shape but the second choice is almost as good: just Best
  const b = analyse(['e4', 'e5'], { 0: { cp: 0, second: { cp: -20, uci: 'd2d4' } }, 1: { cp: 0 } });
  assert.equal(classOf(b, 1), 'best');
});

test('Great is for the mover on both colours', () => {
  // Black to move at ply 2; scores are white POV: black's best keeps 0, the alternative gives White +300.
  const a = analyse(['e4', 'e5'], { 0: { cp: 0 }, 1: { cp: 0, second: { cp: 300, uci: 'd7d5' } }, 2: { cp: 0 } });
  assert.equal(classOf(a, 2), 'great');
});

test('a single forced legal move is never Great', () => {
  const fen = '7k/5K2/8/8/8/8/8/8 b - - 0 1'; // Black has exactly one legal move: Kh7
  assert.equal(new Chess(fen).moves().length, 1);
  // The engine reports only one line; even a (bogus, illegal) second line cannot make it Great.
  const one = analyse(['Kh7'], { 0: { cp: 0 }, 1: { cp: 0 } }, { fen });
  assert.equal(classOf(one, 1), 'best');
  const bogus = analyse(['Kh7'], { 0: { cp: 0, second: { cp: 900, uci: 'h8g8' } }, 1: { cp: 0 } }, { fen });
  assert.equal(classOf(bogus, 1), 'best');
  assert.equal(bogus.moves[0].secondSan, undefined);
});

test('a lost position played perfectly is Best, not Great (and a won one too)', () => {
  // Black is lost (+900 for White) and plays the engine move; the alternative is not much worse.
  const lost = analyse(['e4', 'e5'], { 0: { cp: 0 }, 1: { cp: 900, second: { cp: 1500, uci: 'd7d5' } }, 2: { cp: 900 } });
  assert.equal(classOf(lost, 2), 'best');
  // White is winning (+700) and plays the only good move.
  const won = analyse(['e4', 'e5'], { 0: { cp: 700, second: { cp: -100, uci: 'd2d4' } }, 1: { cp: 700 } });
  assert.equal(classOf(won, 1), 'best');
});

test('a missed mate is a Blunder', () => {
  const a = analyse(['e4', 'e5', 'Nf3'], {
    0: { cp: 0 }, 1: { cp: 0 }, 2: { mate: 2, best: 'd1h5' }, 3: { cp: 0 },
  });
  assert.equal(classOf(a, 3), 'blunder');
  assert.ok(a.moves[2].loss > 0.4);
  assert.deepEqual(a.moves[2].evalAfter, { cp: 0 });
});

test('Miss: opponent just erred, the best move kept a clear win, loss in (0.10, 0.20]', () => {
  const spec = {
    0: { cp: 0 },
    1: { cp: 0, best: 'd7d5' },          // Black errs ...
    2: { cp: 200, best: 'd2d4' },        // ... White could have kept +200 ...
    3: { cp: 0 },                        // ... but lets it slip to equal: loss ~0.18
  };
  const a = analyse(['e4', 'e5', 'Nf3'], spec);
  assert.equal(classOf(a, 2), 'mistake');
  assert.equal(classOf(a, 3), 'miss');
  // Without the opponent's error the same loss is a plain Mistake.
  const calm = analyse(['e4', 'e5', 'Nf3'], { 0: { cp: 0 }, 1: { cp: 0 }, 2: { cp: 0, best: 'd2d4' }, 3: { cp: -180 } });
  assert.equal(classOf(calm, 3), 'mistake');
});

test('Miss is replaced by Blunder when the loss is above 0.20', () => {
  const a = analyse(['e4', 'e5', 'Nf3'], {
    0: { cp: 0 }, 1: { cp: 0, best: 'd7d5' }, 2: { cp: 400, best: 'd2d4' }, 3: { cp: 0 },
  });
  assert.equal(classOf(a, 3), 'blunder');
});

test('Brilliant: a piece sacrifice (net >= 2 pawns over the next 3 plies) that keeps the position sound', () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Nb4'];
  const sound = { 10: { cp: 30 }, 11: { cp: 40 } };
  const a = analyse(sans, sound);
  assert.equal(a.moves[10].san, 'Nxf7');
  assert.equal(classOf(a, 11), 'brilliant');
  // Too good already before the move (win% > 85): just Best.
  assert.equal(classOf(analyse(sans, { 10: { cp: 900 }, 11: { cp: 900 } }), 11), 'best');
  // The sacrifice leaves the mover worse (win% after < 50): not brilliant.
  assert.equal(classOf(analyse(sans, { 10: { cp: -60 }, 11: { cp: -60 } }), 11), 'best');
  // A sacrifice that was a mistake is judged by its loss.
  assert.equal(classOf(analyse(sans, { 10: { cp: 30, best: 'd5f6' }, 11: { cp: -300 } }), 11), 'blunder');
  // Quiet moves with the same numbers are not brilliant.
  assert.equal(classOf(analyse(sans, sound), 1), 'best');
});

test('Book: stays book while the game follows the table, never comes back after leaving, caps at ply 20', () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'];
  const g = parseGame(pgnOf(sans));
  const fen = (ply) => g.moves[ply - 1].fenAfter.split(' ').slice(0, 4).join(' ');
  // plies 1, 2 and 4 are "in the table"; ply 3 is not -> ply 4 must NOT be book
  setEcoTable({ [fen(1)]: { eco: 'B00', name: 'x' }, [fen(2)]: { eco: 'C20', name: 'x' }, [fen(4)]: { eco: 'C44', name: 'x' } });
  const a = analyse(sans, {});
  assert.deepEqual(a.moves.map((m) => m.classification === 'book'), [true, true, false, false, false, false, false]);
  assert.equal(a.counts.white.book, 1 + 0);
  assert.equal(a.counts.black.book, 1);

  // every position in the table: book up to ply 20 only
  const opera = parseGame(pgnOf(OPERA_GAME_SANS));
  setEcoTable(Object.fromEntries(opera.moves.map((m) => [m.fenAfter.split(' ').slice(0, 4).join(' '), { eco: 'A00', name: 'all' }])));
  const o = analyse(OPERA_GAME_SANS, {});
  assert.equal(o.moves.filter((m) => m.classification === 'book').length, 20);
  assert.equal(o.moves[20].classification === 'book', false);
  setEcoTable({});
});

test('Book with the real table: classification is book exactly while the game stays in data/eco.json', () => {
  setEcoTable(null);
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'h4', 'Be7'];
  const a = analyse(sans, {});
  const flags = a.moves.map((m) => m.classification === 'book');
  let left = false;
  a.moves.forEach((m, i) => {
    const expected = !left && inBook(m.fenAfter);
    if (!expected) left = true;
    assert.equal(flags[i], expected, `ply ${i + 1}`);
  });
  assert.ok(flags.slice(0, 5).every(Boolean), 'first five plies are the Ruy Lopez book');
  assert.equal(flags[8], false, '5.h4 is out of book');
  setEcoTable({});
});

test('terminal positions: checkmate is { mate: 0 } and the mating move keeps full accuracy', () => {
  const parsed = parseGame(pgnOf(OPERA_GAME_SANS));
  const script = scriptEvals(parsed, { 31: { mate: 1 } });
  const a = buildGameAnalysis({ gameId: 'g', parsed, getEval: script.getEval, engine: ENGINE, depthFast: 14, depthDeep: 20 });
  assert.equal(a.state, 'ready');
  assert.deepEqual(a.moves.at(-1).evalAfter, { mate: 0 });
  assert.equal(a.moves.at(-1).san, 'Rd8#');
  assert.deepEqual(a.moves.at(-1).topLines, []);
  assert.ok(a.moves.at(-1).accuracy > 95);
  const stale = analyse(['e4'], {});
  assert.equal(stale.state, 'ready');
});

test('failed (missing) positions make the game partial and are excluded from counts', () => {
  const parsed = parseGame(pgnOf(['e4', 'e5', 'Nf3', 'Nc6']));
  const script = scriptEvals(parsed, {});
  const missing = new Set([parsed.moves[1].fenAfter.split(' ').slice(0, 4).join(' ')]); // position after ply 2
  const a = buildGameAnalysis({
    gameId: 'g', parsed, getEval: (k) => (missing.has(k) ? null : script.getEval(k)), engine: ENGINE, depthFast: 14, depthDeep: 20,
  });
  assert.equal(a.state, 'partial');
  assert.deepEqual(a.moves.map((m) => m.failed), [false, true, true, false]);
  assert.equal(a.moves[1].classification, null);
  assert.equal(a.moves[1].accuracy, null);
  const total = (side) => Object.values(a.counts[side]).reduce((s, n) => s + n, 0);
  assert.equal(total('white') + total('black'), 2);
  assert.deepEqual(a.moves[1].evalAfter, a.moves[0].evalAfter); // carried forward for the curve
});

// ---- invariants ------------------------------------------------------------------------------------
test('invariants on 60 random games: loss >= 0, accuracy in [0,100], counts sum to the side\'s moves, SAN legal', () => {
  setEcoTable(null);
  for (let seed = 1; seed <= 60; seed++) {
    const g = randomGame(seed, 20 + (seed % 5) * 20);
    const a = buildGameAnalysis({ gameId: String(seed), parsed: g.parsed, getEval: g.getEval, engine: ENGINE, depthFast: 14, depthDeep: 20 });
    assert.equal(a.moves.length, g.parsed.moves.length);
    for (const side of ['white', 'black']) {
      const mine = a.moves.filter((m) => m.color === side);
      const total = Object.values(a.counts[side]).reduce((s, n) => s + n, 0);
      assert.equal(total, mine.length, `seed ${seed} ${side}`);
      assert.deepEqual(Object.keys(a.counts[side]), CLASSIFICATIONS);
      if (mine.length) {
        assert.ok(a.accuracy[side] >= 0 && a.accuracy[side] <= 100, `game accuracy ${a.accuracy[side]}`);
      }
    }
    for (const m of a.moves) {
      assert.ok(m.loss >= 0 && m.loss <= 1, `loss ${m.loss}`);
      assert.ok(m.accuracy >= 0 && m.accuracy <= 100, `accuracy ${m.accuracy}`);
      assert.ok(CLASSIFICATIONS.includes(m.classification));
      assert.ok(['opening', 'middlegame', 'endgame'].includes(m.phase));
      assert.ok('cp' in m.evalAfter || 'mate' in m.evalAfter);
      // every displayed SAN is legal according to chess.js
      for (const [fen, uciLine] of [[m.fenBefore, m.line], ...m.topLines.map((t) => [m.fenAfter, t.san])]) {
        const c = new Chess(fen);
        for (const san of uciLine) assert.doesNotThrow(() => c.move(san), `seed ${seed} ply ${m.ply}: ${san}`);
      }
      if (m.bestSan) assert.doesNotThrow(() => new Chess(m.fenBefore).move(m.bestSan));
      if (m.secondSan) assert.doesNotThrow(() => new Chess(m.fenBefore).move(m.secondSan));
      assert.ok(m.line.length <= 6 && m.topLines.length <= 2 && m.topLines.every((t) => t.san.length <= 6));
    }
    assert.ok(a.criticalMoments.length <= 8);
    assert.deepEqual([...a.criticalMoments].sort((x, y) => x - y), a.criticalMoments);
    for (const ply of a.criticalMoments) assert.ok(['inaccuracy', 'mistake', 'miss', 'blunder'].includes(a.moves[ply - 1].classification));
  }
  setEcoTable({});
});

test('criticalMoments: at most 8, the largest losses of both sides, sorted by ply', () => {
  const moves = Array.from({ length: 30 }, (_, i) => ({
    ply: i + 1, loss: ((i * 7) % 30) / 100, classification: i % 3 === 0 ? 'blunder' : i % 3 === 1 ? 'good' : 'mistake',
  }));
  const crit = criticalMoments(moves);
  assert.equal(crit.length, 8);
  assert.deepEqual([...crit].sort((a, b) => a - b), crit);
  const eligible = moves.filter((m) => m.classification !== 'good').sort((a, b) => b.loss - a.loss).slice(0, 8).map((m) => m.ply).sort((a, b) => a - b);
  assert.deepEqual(crit, eligible);
  assert.deepEqual(criticalMoments([{ ply: 1, loss: 0.5, classification: 'best' }]), []);
});
