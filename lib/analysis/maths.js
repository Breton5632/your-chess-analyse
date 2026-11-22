// Score normalisation, win probability, loss and accuracy maths (CONTRACT §4.2, spec §7.4).
// Everything here is pure. "White POV" = positive favours White.

export const MATE_CP = 10000;
const WIN_K = 0.00368208;

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Turn a raw UCI line (score from the SIDE TO MOVE) into a white-POV value.
 *  Returns { cp, mate? } where cp is always a finite number in [-MATE_CP, MATE_CP] used for the maths
 *  and mate (if any) is the signed white-POV mate distance (+n White mates, -n Black mates). */
export function normalizeScore(line, turn) {
  const sign = turn === 'b' ? -1 : 1;
  if (line && Number.isFinite(line.mate)) {
    const n = Math.trunc(line.mate);
    // "mate 0" = the side to move is checkmated.
    const stmSign = n > 0 ? 1 : -1;
    const whiteSign = sign * stmSign;
    const dist = Math.abs(n);
    return { cp: whiteSign * clamp(MATE_CP - dist, 1, MATE_CP), mate: whiteSign * dist || 0 };
  }
  const cp = line && Number.isFinite(line.scoreCp) ? Math.trunc(line.scoreCp) : 0;
  return { cp: clamp(sign * cp, -MATE_CP, MATE_CP) || 0 }; // || 0 avoids -0
}

/** Public Eval shape: { cp } | { mate } (white POV). */
export function toEval(norm) {
  return norm.mate !== undefined ? { mate: norm.mate } : { cp: norm.cp };
}

/** Win percentage (0..100) for White from a white-POV centipawn value. */
export function winPercent(cp) {
  const c = clamp(cp, -MATE_CP, MATE_CP);
  return 50 + 50 * (2 / (1 + Math.exp(-WIN_K * c)) - 1);
}

/** Win percentage from the point of view of `color` ('w' | 'b'). */
export function moverWin(cpWhite, color) {
  const w = winPercent(cpWhite);
  return color === 'b' ? 100 - w : w;
}

/** Expected points (0..1) from the point of view of `color`. */
export function xp(cpWhite, color) {
  return moverWin(cpWhite, color) / 100;
}

/** loss = max(0, xp(best) - xp(played)), both from the mover's side. */
export function moveLoss(xpBest, xpPlayed) {
  return Math.max(0, xpBest - xpPlayed);
}

/** Per-move accuracy from the mover's win% before and after the move. */
export function moveAccuracy(winBefore, winAfter) {
  const a = 103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1669;
  return clamp(a, 0, 100);
}

function stdev(values) {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
}

/** Volatility weights for each move. `winSeries` = white win% of positions P0..Pn (n+1 values),
 *  move i goes from P(i) to P(i+1). Window size = clamp(round(n/10), 2, 8); weight = stdev of the
 *  window clamped to [0.5, 12] (the first windows reuse the first full window). */
export function volatilityWeights(winSeries) {
  const moves = Math.max(0, winSeries.length - 1);
  const size = clamp(Math.round(moves / 10), 2, 8);
  const weights = [];
  for (let i = 0; i < moves; i++) {
    const start = i < size - 2 ? 0 : i - (size - 2);
    const win = winSeries.slice(start, start + size);
    weights.push(clamp(stdev(win), 0.5, 12));
  }
  return weights;
}

/** Game accuracy of one side = mean(volatility-weighted mean, harmonic mean) of its move accuracies.
 *  `items` = [{ accuracy, weight }]. Returns null when the side has no scored move. */
export function gameAccuracy(items) {
  if (!items.length) return null;
  const sumW = items.reduce((s, it) => s + it.weight, 0);
  const weighted = items.reduce((s, it) => s + it.accuracy * it.weight, 0) / sumW;
  const harmonic = items.length / items.reduce((s, it) => s + 1 / Math.max(it.accuracy, 0.001), 0);
  return clamp((weighted + harmonic) / 2, 0, 100);
}
