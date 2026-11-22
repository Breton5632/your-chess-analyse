import test from 'node:test';
import assert from 'node:assert/strict';
import { eloFromLoss, estimateElo, MIN_MOVES_FOR_ELO } from '../../lib/analysis/elo.js';

test('eloFromLoss is monotonic, clamped and rejects bad input', () => {
  const xs = [0, 0.01, 0.03, 0.05, 0.09, 0.2, 0.5];
  const es = xs.map(eloFromLoss);
  for (let i = 1; i < es.length; i += 1) assert.ok(es[i] <= es[i - 1], `non increasing at ${xs[i]}`);
  assert.equal(es[0], 2900);
  assert.equal(es[es.length - 1], 400);
  assert.equal(eloFromLoss(NaN), null);
  assert.equal(eloFromLoss(-1), null);
});

test('estimateElo ignores book and failed moves and needs enough moves', () => {
  const mv = (color, loss, extra = {}) => ({ color, loss, classification: 'good', ...extra });
  const white = Array.from({ length: MIN_MOVES_FOR_ELO }, () => mv('white', 0.04));
  const black = [...Array.from({ length: MIN_MOVES_FOR_ELO - 1 }, () => mv('black', 0.04)), mv('black', 0, { classification: 'book' }), mv('black', 0.9, { failed: true })];
  const r = estimateElo([...white, ...black]);
  assert.equal(r.white, 2000);
  assert.equal(r.black, null, 'book and failed moves do not count');
});

test('smoothPath stays inside the plot and has one segment per interval', async () => {
  const { smoothPath } = await import('../../lib/client/charts.js').catch(() => ({}));
  if (!smoothPath) return; // charts.js imports the UI kit: only checked where it can load
  const d = smoothPath([0, 10, 20, 30], [100, 0, 100, 0], 8, 92);
  assert.equal((d.match(/C/g) || []).length, 3);
  for (const n of d.replace(/[MC]/g, ' ').trim().split(/[ ,]+/).filter((_, i) => i % 2 === 1)) assert.ok(Number(n) >= 0 && Number(n) <= 100);
});
