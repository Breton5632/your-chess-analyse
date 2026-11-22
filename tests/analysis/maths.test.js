import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MATE_CP, normalizeScore, toEval, winPercent, moverWin, xp, moveLoss, moveAccuracy, volatilityWeights, gameAccuracy,
} from '../../lib/analysis/maths.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test('normalisation: engine scores are side-to-move, results are white POV', () => {
  assert.deepEqual(normalizeScore({ scoreCp: 80 }, 'w'), { cp: 80 });
  assert.deepEqual(normalizeScore({ scoreCp: 80 }, 'b'), { cp: -80 });
  assert.deepEqual(normalizeScore({ scoreCp: -35 }, 'b'), { cp: 35 });
  assert.deepEqual(normalizeScore({ scoreCp: 0 }, 'b'), { cp: 0 });
});

test('normalisation: mate n becomes +-(10000 - n) and the sign follows the winning side', () => {
  // White to move, mates in 3
  assert.deepEqual(normalizeScore({ mate: 3 }, 'w'), { cp: 9997, mate: 3 });
  // Black to move, black mates in 2 -> good for black -> negative for white
  assert.deepEqual(normalizeScore({ mate: 2 }, 'b'), { cp: -9998, mate: -2 });
  // White to move and being mated in 4
  assert.deepEqual(normalizeScore({ mate: -4 }, 'w'), { cp: -9996, mate: -4 });
  // Black to move and being mated in 1 -> white mates
  assert.deepEqual(normalizeScore({ mate: -1 }, 'b'), { cp: 9999, mate: 1 });
  // mate 0: side to move is checkmated
  assert.deepEqual(normalizeScore({ mate: 0 }, 'w'), { cp: -MATE_CP, mate: 0 });
  assert.deepEqual(normalizeScore({ mate: 0 }, 'b'), { cp: MATE_CP, mate: 0 });
});

test('normalisation: bounds and garbage', () => {
  assert.equal(normalizeScore({ scoreCp: 99999 }, 'w').cp, MATE_CP);
  assert.equal(normalizeScore({ scoreCp: -99999 }, 'w').cp, -MATE_CP);
  assert.equal(normalizeScore({ mate: 50000 }, 'w').cp, 1); // absurdly distant mate stays on the winning side
  assert.deepEqual(normalizeScore({}, 'w'), { cp: 0 });
  assert.deepEqual(normalizeScore(null, 'b'), { cp: 0 });
  assert.deepEqual(toEval({ cp: 12 }), { cp: 12 });
  assert.deepEqual(toEval({ cp: 9997, mate: 3 }), { mate: 3 });
});

test('win% formula: 50 at 0, symmetric, monotonic, bounded', () => {
  near(winPercent(0), 50);
  near(winPercent(100) + winPercent(-100), 100);
  near(winPercent(100), 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * 100)) - 1));
  let prev = -1;
  for (let cp = -MATE_CP; cp <= MATE_CP; cp += 250) {
    const w = winPercent(cp);
    assert.ok(w >= 0 && w <= 100);
    assert.ok(w >= prev);
    prev = w;
  }
  assert.ok(winPercent(MATE_CP) > 99.99);
  near(moverWin(300, 'w') + moverWin(300, 'b'), 100);
  near(xp(300, 'b'), 1 - xp(300, 'w'));
});

test('loss is never negative and accuracy stays in [0, 100]', () => {
  assert.equal(moveLoss(0.5, 0.7), 0);
  near(moveLoss(0.8, 0.3), 0.5);
  for (let before = 0; before <= 100; before += 5) {
    for (let after = 0; after <= 100; after += 5) {
      const a = moveAccuracy(before, after);
      assert.ok(a >= 0 && a <= 100, `${before}->${after}: ${a}`);
    }
  }
  near(moveAccuracy(50, 50), 103.1668 - 3.1669);
  assert.ok(moveAccuracy(90, 10) < 5);
});

test('volatility weights are within [0.5, 12], one per move', () => {
  const series = [50, 50, 52, 80, 20, 90, 10, 50, 50, 50, 51, 49];
  const w = volatilityWeights(series);
  assert.equal(w.length, series.length - 1);
  for (const x of w) assert.ok(x >= 0.5 && x <= 12);
  assert.deepEqual(volatilityWeights([50]), []);
  assert.ok(volatilityWeights([50, 50, 50]).every((x) => x === 0.5)); // flat game -> floor
});

test('game accuracy = mean of weighted and harmonic means', () => {
  const items = [{ accuracy: 100, weight: 1 }, { accuracy: 50, weight: 3 }];
  const weighted = (100 * 1 + 50 * 3) / 4;
  const harmonic = 2 / (1 / 100 + 1 / 50);
  near(gameAccuracy(items), (weighted + harmonic) / 2);
  assert.equal(gameAccuracy([]), null);
  const zero = gameAccuracy([{ accuracy: 0, weight: 1 }, { accuracy: 0, weight: 2 }]);
  assert.ok(zero >= 0 && zero < 1);
  assert.ok(gameAccuracy([{ accuracy: 100, weight: 12 }]) <= 100);
});
