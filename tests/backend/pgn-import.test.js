import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from '../helpers/ctx.js';
import { insertGame } from '../../lib/store.js';
import { rowFromPgn } from '../../lib/sync/pgn-import.js';

const PGN = `[Event "Casual"]\n[White "Me"]\n[Black "Foe"]\n[Result "1-0"]\n[Date "2026.11.01"]\n[WhiteElo "1500"]\n[TimeControl "300"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

test('rowFromPgn builds a storable row, stable id, colour from the username', () => {
  const a = rowFromPgn(PGN, 'me', '2026-11-21T00:00:00Z');
  const b = rowFromPgn(PGN, 'me', '2026-11-21T00:00:00Z');
  assert.equal(a.id, b.id, 'same PGN, same id');
  assert.equal(a.row.color, 'white');
  assert.equal(a.row.result, 'win');
  assert.equal(a.row.time_class, 'blitz');
  const sql = memoryDb();
  assert.equal(insertGame(sql, 'u1', a.row), true);
  assert.equal(insertGame(sql, 'u1', a.row), false, 'importing twice does not duplicate');
});

test('rowFromPgn rejects empty, illegal and oversized input', () => {
  for (const bad of ['', '   ', '1. e4 e4', 'x'.repeat(200_001)]) {
    assert.throws(() => rowFromPgn(bad, 'me', 'now'), (e) => e.code === 'invalid_pgn' || e.status === 400);
  }
});
