// Rough performance-rating estimate from the average expected points lost per move (loss is 0..1, see classify.js).
// Anchors are a heuristic calibration (not chess.com data): indicative only, about +/- 300 points.
const ANCHORS = [[0.0, 2900], [0.015, 2600], [0.04, 2000], [0.07, 1500], [0.11, 1000], [0.18, 600], [0.3, 400]];
export const MIN_MOVES_FOR_ELO = 8;

export function eloFromLoss(avgLoss) {
  if (!Number.isFinite(avgLoss) || avgLoss < 0) return null;
  for (let i = 1; i < ANCHORS.length; i += 1) {
    const [x0, y0] = ANCHORS[i - 1];
    const [x1, y1] = ANCHORS[i];
    if (avgLoss <= x1) return Math.round((y0 + ((y1 - y0) * (avgLoss - x0)) / (x1 - x0)) / 10) * 10;
  }
  return ANCHORS[ANCHORS.length - 1][1];
}

/** moves: [{ color, loss, classification, failed }] → { white, black } estimate or null (too few moves). Book moves are ignored. */
export function estimateElo(moves) {
  const out = { white: null, black: null };
  for (const color of ['white', 'black']) {
    const own = (moves ?? []).filter((m) => m.color === color && !m.failed && m.classification !== 'book' && Number.isFinite(m.loss));
    if (own.length < MIN_MOVES_FOR_ELO) continue;
    out[color] = eloFromLoss(own.reduce((s, m) => s + m.loss, 0) / own.length);
  }
  return out;
}
