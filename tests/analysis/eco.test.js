import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseGame } from '../../lib/analysis/pgn.js';
import { lookupOpening, inBook, ecoEntry } from '../../lib/analysis/eco.js';
import { pgnOf } from './helpers.js';

const fensAfter = (sans) => parseGame(pgnOf(sans)).moves.map((m) => m.fenAfter);

test('1.e4 e5 2.Nf3 Nc6 3.Bb5 is C60 Ruy Lopez at ply 5', () => {
  const found = lookupOpening(fensAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']));
  assert.equal(found.eco, 'C60');
  assert.match(found.name, /^Ruy Lopez/);
  assert.equal(found.ply, 5);
});

test('lookupOpening returns the deepest known position and null for unknown games', () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'];
  const found = lookupOpening(fensAfter(sans));
  assert.match(found.eco, /^C\d\d$/);
  assert.ok(found.ply >= 6 && found.ply <= sans.length);
  assert.equal(lookupOpening([]), null);
  assert.equal(lookupOpening(null), null);
  const odd = lookupOpening(fensAfter(['a3', 'a6', 'h3', 'h6']));
  assert.ok(odd === null || odd.ply <= 4);
});

test('transpositions reach the same entry (move counters ignored)', () => {
  const a = fensAfter(['d4', 'Nf6', 'c4']).at(-1);
  const b = fensAfter(['c4', 'Nf6', 'd4']).at(-1);
  assert.deepEqual(ecoEntry(a), ecoEntry(b));
  assert.ok(inBook(a));
});

test('data/eco.json is small (<= 1.5 MB) and well formed', () => {
  const path = fileURLToPath(new URL('../../data/eco.json', import.meta.url));
  assert.ok(statSync(path).size <= 1.5 * 1024 * 1024);
  const sample = ecoEntry(fensAfter(['e4']).at(-1));
  assert.match(sample.eco, /^[A-E]\d\d$/);
  assert.ok(sample.name.length > 0);
});
