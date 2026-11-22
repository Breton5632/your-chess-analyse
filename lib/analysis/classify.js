// Move classification (spec §7.5, CONTRACT §4.3). Pure: callers pass already-computed numbers.
import { material } from './pgn.js';

/** Machine names, in display order. */
export const CLASSIFICATIONS = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

export const BOOK_MAX_PLY = 20;
export const ERROR_CLASSES = new Set(['inaccuracy', 'mistake', 'miss', 'blunder']);

export const THRESHOLDS = { excellent: 0.02, good: 0.05, inaccuracy: 0.10, mistake: 0.20 };

/**
 * @param {object} m
 * @param {boolean} m.inBook        position after the move is in the book AND the game never left it AND ply <= 20
 * @param {number}  m.loss          expected points lost (>= 0)
 * @param {boolean} m.playedIsBest  played move equals the engine's first choice
 * @param {number}  m.winBest       mover's win% after the engine's best move (= before the move)
 * @param {number}  m.winAfter      mover's win% after the played move
 * @param {number|null} m.gap       xp(best) - xp(second choice), null when there is no second choice
 * @param {() => number} m.legalMoves  number of legal moves before the move (lazy)
 * @param {() => number} m.sacrifice   net material (pawns) the mover gives up over the next 3 plies (lazy)
 * @param {string|null} m.prevOpponent classification of the opponent's previous move
 */
export function classifyMove(m) {
  if (m.inBook) return 'book';
  const { loss } = m;
  if (loss <= 0.02 && m.winAfter >= 50 && m.winBest <= 85 && m.sacrifice() >= 2) return 'brilliant';
  if (
    m.playedIsBest && m.gap !== null && m.gap >= 0.15 && m.winBest >= 15 && m.winBest <= 85 && m.legalMoves() > 1
  ) return 'great';
  if (
    (m.prevOpponent === 'mistake' || m.prevOpponent === 'blunder') &&
    m.winBest >= 65 && loss > 0.10 && loss <= THRESHOLDS.mistake
  ) return 'miss';
  if (loss === 0) return 'best';
  if (loss <= THRESHOLDS.excellent) return 'excellent';
  if (loss <= THRESHOLDS.good) return 'good';
  if (loss <= THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (loss <= THRESHOLDS.mistake) return 'mistake';
  return 'blunder';
}

/** 'opening' (ply <= 30), else 'endgame' (combined non-pawn, non-king material <= 26), else 'middlegame'. */
export function phaseOf(ply, fenAfter) {
  if (ply <= 30) return 'opening';
  return material(fenAfter).pieces <= 26 ? 'endgame' : 'middlegame';
}

/** Up to 8 plies with the largest loss among inaccuracy/mistake/miss/blunder, sorted by ply. */
export function criticalMoments(moves, max = 8) {
  return moves
    .filter((mv) => ERROR_CLASSES.has(mv.classification))
    .sort((a, b) => b.loss - a.loss || a.ply - b.ply)
    .slice(0, max)
    .map((mv) => mv.ply)
    .sort((a, b) => a - b);
}

export function emptyCounts() {
  return Object.fromEntries(CLASSIFICATIONS.map((c) => [c, 0]));
}
