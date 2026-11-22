import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../../vendor/chess.js';
import { parseGame, fenKey, sanLine, sanOf, START_FEN } from '../../lib/analysis/pgn.js';
import { OPERA_GAME_SANS, pgnOf } from './helpers.js';

test('parseGame: plies, uci, colors, fens (1858 public-domain game, synthetic headers)', () => {
  const g = parseGame(pgnOf(OPERA_GAME_SANS, { headers: { White: 'PlayerA', Black: 'PlayerB' } }));
  assert.equal(g.invalid, undefined);
  assert.equal(g.rules, 'chess');
  assert.equal(g.moves.length, OPERA_GAME_SANS.length);
  assert.equal(g.initialFen, START_FEN);
  assert.deepEqual(g.moves.slice(0, 2).map((m) => [m.ply, m.san, m.uci, m.color]),
    [[1, 'e4', 'e2e4', 'white'], [2, 'e5', 'e7e5', 'black']]);
  assert.equal(g.moves[0].fenBefore, START_FEN);
  assert.equal(g.moves[1].fenBefore, g.moves[0].fenAfter);
  assert.equal(g.moves.at(-1).san, 'Rd8#');
  assert.equal(g.headers.White, 'PlayerA');
});

test('parseGame: promotions and castling are expressed in UCI', () => {
  const g = parseGame(pgnOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']));
  assert.equal(g.moves.at(-1).uci, 'e1g1');
  const p = parseGame(pgnOf(['a8=Q+'], { fen: '7k/P7/8/8/8/8/8/K7 w - - 0 1' }));
  assert.equal(p.moves[0].uci, 'a7a8q');
  assert.equal(p.initialFen, '7k/P7/8/8/8/8/8/K7 w - - 0 1');
});

test('parseGame: chess.com style PGN with clock comments and result tag', () => {
  const pgn = [
    '[Event "Live Chess"]', '[Site "Chess.com"]', '[White "a"]', '[Black "b"]', '[Result "1-0"]', '',
    '1. e4 {[%clk 0:09:59.9]} 1... e5 {[%clk 0:09:58.1]} 2. Nf3 {[%clk 0:09:57]} 2... Nc6 {[%clk 0:09:50]} 1-0',
  ].join('\n');
  const g = parseGame(pgn);
  assert.equal(g.invalid, undefined);
  assert.equal(g.moves.length, 4);
});

test('parseGame: variants are invalid with reason "variant", never thrown', () => {
  const crazy = '[Event "x"]\n[Variant "Crazyhouse"]\n\n1. e4 e5 *';
  const a = parseGame(crazy);
  assert.equal(a.invalid, true);
  assert.equal(a.reason, 'variant');
  assert.match(a.error, /crazyhouse/i);
  const b = parseGame('1. e4 e5 *', { rules: 'chess960' });
  assert.equal(b.reason, 'variant');
  assert.equal(parseGame('1. e4 e5 *', { rules: 'chess' }).invalid, undefined);
  assert.equal(parseGame('[Variant "Standard"]\n\n1. e4 e5 *').invalid, undefined);
});

test('parseGame: no moves, illegal moves and garbage are invalid with a reason', () => {
  assert.equal(parseGame('[Event "x"]\n\n*').reason, 'no_moves');
  assert.equal(parseGame('').reason, 'no_moves');
  assert.equal(parseGame(null).reason, 'no_moves');
  assert.equal(parseGame(undefined).reason, 'no_moves');
  const illegal = parseGame('1. e4 e5 2. Ke3 Ke6 3. Qh5 Qh4 4. Qxh7 *');
  assert.equal(illegal.invalid, true);
  assert.ok(['illegal', 'parse'].includes(illegal.reason));
  assert.ok(illegal.error.length > 0);
  for (const junk of ['\u0000\u0001', '1. Zz9 xx', '{{{{', 'e4 e5 Nf3', 42, {}, [], '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Bxf7+ Kxf7 5. Nxe5+ Kxe5 6. Qh5+ Kd4 7. Qd5+ Kc3 8. Qxd7 Zz'] ) {
    assert.doesNotThrow(() => parseGame(junk));
  }
  assert.equal(parseGame('1. e4 e5 2. Bb5 Bb4 3. Bxf7+ Qh4 4. Qxh7 Qxh7').invalid, true);
});

test('fenKey drops the move counters only', () => {
  assert.equal(fenKey('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'), 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
  assert.equal(fenKey(`${START_FEN}`), fenKey(START_FEN.replace(/0 1$/, '12 34')));
  assert.notEqual(fenKey(START_FEN), fenKey(START_FEN.replace(' w ', ' b ')));
  assert.notEqual(fenKey(START_FEN), fenKey(START_FEN.replace('KQkq', 'Kkq')));
});

test('sanLine: validated SAN, stops at the first illegal or malformed move, honours max', () => {
  assert.deepEqual(sanLine(START_FEN, ['e2e4', 'e7e5', 'g1f3']), ['e4', 'e5', 'Nf3']);
  assert.deepEqual(sanLine(START_FEN, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6']), ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
  assert.deepEqual(sanLine(START_FEN, ['e2e4', 'e2e4', 'e7e5']), ['e4']);
  assert.deepEqual(sanLine(START_FEN, ['e2e5']), []);
  assert.deepEqual(sanLine(START_FEN, ['e2e4', 'garbage', 'e7e5']), ['e4']);
  assert.deepEqual(sanLine(START_FEN, ['e2e4', 'e7e5'], 1), ['e4']);
  assert.deepEqual(sanLine('not a fen', ['e2e4']), []);
  assert.deepEqual(sanLine(START_FEN, null), []);
  assert.equal(sanOf(START_FEN, 'g1f3'), 'Nf3');
  assert.equal(sanOf(START_FEN, 'g1g3'), null);
  // castling and promotion render as proper SAN
  assert.equal(sanOf('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1'), 'O-O');
  assert.equal(sanOf('7k/P7/8/8/8/8/8/K7 w - - 0 1', 'a7a8q'), 'a8=Q+');
  const c = new Chess();
  assert.ok(sanLine(START_FEN, ['e2e4', 'c7c5']).every((s) => { try { c.move(s); return true; } catch { return false; } }));
});
