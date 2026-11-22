// Pure construction of a GameAnalysis (CONTRACT §5) from a parsed game and per-position engine evaluations.
// No engine, no SQL: `getEval(fenKey)` returns the best known raw evaluation of a position
// ({ depth, lines:[{ multipv, depth, scoreCp?, mate?, pv:[uci] }] }, side-to-move POV) or null.
import { Chess } from '../../vendor/chess.js';
import { fenKey, sanLine, sanOf, material, terminalStatus } from './pgn.js';
import { MATE_CP, normalizeScore, toEval, moverWin, xp, moveLoss, moveAccuracy, winPercent, volatilityWeights, gameAccuracy } from './maths.js';
import { classifyMove, phaseOf, criticalMoments, emptyCounts, BOOK_MAX_PLY } from './classify.js';
import { inBook } from './eco.js';

const round = (x, d) => (x === null || x === undefined ? x : Math.round(x * 10 ** d) / 10 ** d);
const turnOf = (fen) => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

/**
 * Per-position info for P0..Pn. `ok` false = no usable evaluation (failed / missing).
 * Lines carry both the raw engine line and its white-POV normalisation.
 */
export function buildPositions(parsed, getEval) {
  const fens = [parsed.initialFen, ...parsed.moves.map((m) => m.fenAfter)];
  const lastMover = parsed.moves[parsed.moves.length - 1]?.color;
  return fens.map((fen, i) => {
    if (i === fens.length - 1) {
      const terminal = terminalPosition(fen, lastMover);
      if (terminal) return terminal;
    }
    return evalPosition(fen, getEval(fenKey(fen)));
  });
}

/** Synthetic position for a finished game (checkmate / stalemate); null when the game goes on.
 *  Checkmate is { mate: 0 } in the public Eval: the side that just moved (lastMover) has won. */
export function terminalPosition(fen, lastMover) {
  const status = terminalStatus(fen);
  const base = { fen, key: fenKey(fen), turn: turnOf(fen), ok: true, lines: [], terminal: status };
  if (status === 'checkmate') return { ...base, top: { cp: (lastMover === 'white' || lastMover === 'w' ? 1 : -1) * MATE_CP, mate: 0 } };
  if (status === 'stalemate') return { ...base, top: { cp: 0 } };
  return null;
}

/** Position info from a raw engine evaluation (null / empty raw → ok:false). */
export function evalPosition(fen, raw) {
  const turn = turnOf(fen);
  const base = { fen, key: fenKey(fen), turn, ok: false, lines: [], terminal: null };
  const lines = (raw?.lines ?? [])
    .filter((l) => l && (Number.isFinite(l.scoreCp) || Number.isFinite(l.mate)))
    .map((l) => ({ ...l, pv: Array.isArray(l.pv) ? l.pv : [], norm: normalizeScore(l, turn) }));
  if (!lines.length) return base;
  return { ...base, ok: true, depth: raw.depth, lines, top: lines[0].norm };
}

/**
 * Core numbers of one move, shared by the game pipeline and evaluateMove.
 * @param {{ color:'w'|'b', uci:string, before:{ lines }, afterTop:{cp,mate?} }} a
 */
export function moveCore({ fenBefore, color, uci, before, afterTop }) {
  const l1 = before.lines[0];
  const l2 = before.lines[1] ?? null;
  const bestUci = l1.pv[0] && sanOf(fenBefore, l1.pv[0]) ? l1.pv[0] : null;
  const secondUci = l2?.pv[0] && sanOf(fenBefore, l2.pv[0]) ? l2.pv[0] : null;
  const playedIsBest = bestUci !== null && uci === bestUci;
  const xpBest = xp(l1.norm.cp, color);
  const winBest = moverWin(l1.norm.cp, color);
  let cpPlayed;
  if (playedIsBest) cpPlayed = l1.norm.cp;
  else if (secondUci !== null && uci === secondUci) cpPlayed = l2.norm.cp;
  else cpPlayed = afterTop.cp;
  const xpPlayed = xp(cpPlayed, color);
  const winAfter = moverWin(cpPlayed, color);
  const loss = playedIsBest ? 0 : moveLoss(xpBest, xpPlayed);
  const gap = l2 && secondUci !== null ? xpBest - xp(l2.norm.cp, color) : null;
  return {
    bestUci, secondUci, playedIsBest, xpBest, winBest, winAfter, loss, gap,
    accuracy: moveAccuracy(winBest, winAfter),
  };
}

/** Net material (pawns) the mover gives up over the 3 plies of the engine line that follow the move. */
function sacrificeOf(fenBefore, fenAfter, pv, color) {
  const bal = (fen) => {
    const m = material(fen);
    return color === 'w' ? m.w - m.b : m.b - m.w;
  };
  let chess;
  try { chess = new Chess(fenAfter); } catch { return 0; }
  let plies = 0;
  for (const uci of pv ?? []) {
    if (plies >= 3) break;
    try { chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { break; }
    plies++;
  }
  return bal(fenBefore) - bal(chess.fen());
}

/** Fast pass-A style losses (no SAN work): used to choose the pass-B positions. */
export function quickLosses(parsed, getEval) {
  const pos = buildPositions(parsed, getEval);
  return parsed.moves.map((mv, i) => {
    const before = pos[i];
    const after = pos[i + 1];
    if (!before.ok || !after.ok) return null;
    return moveCore({ fenBefore: mv.fenBefore, color: turnOf(mv.fenBefore), uci: mv.uci, before, afterTop: after.top }).loss;
  });
}

/** Position keys to re-evaluate in pass B: the position before each move with loss >= threshold, plus the 3 after it. */
export function selectDeepKeys(parsed, getEval, threshold = 0.05) {
  const losses = quickLosses(parsed, getEval);
  const pos = buildPositions(parsed, () => null); // only for fens/keys
  const keys = new Set();
  losses.forEach((loss, i) => {
    if (loss === null || loss < threshold) return;
    for (let k = i; k <= Math.min(i + 3, parsed.moves.length); k++) {
      if (!(k === parsed.moves.length && terminalStatus(pos[k].fen))) keys.add(pos[k].key);
    }
  });
  return [...keys];
}

function publicLines(position) {
  return position.lines.slice(0, 2).map((l) => ({ eval: toEval(l.norm), san: sanLine(position.fen, l.pv, 6) }));
}

/**
 * Build the full GameAnalysis.
 * @param {{ gameId, parsed, getEval, engine:{name,version}, depthFast, depthDeep }} args
 */
export function buildGameAnalysis({ gameId, parsed, getEval, engine, depthFast, depthDeep }) {
  const pos = buildPositions(parsed, getEval);
  const moves = [];
  let bookActive = true;
  let prevClass = null;
  let lastEval = { cp: 0 };
  let lastNorm = { cp: 0 };
  const series = [winPercent(0)];
  if (pos[0].ok) { lastEval = toEval(pos[0].top); lastNorm = pos[0].top; series[0] = winPercent(lastNorm.cp); }
  const accuracyOf = [];

  parsed.moves.forEach((mv, i) => {
    const before = pos[i];
    const after = pos[i + 1];
    const color = turnOf(mv.fenBefore);
    const failed = !before.ok || !after.ok;

    // Book state is independent of the engine.
    let book = false;
    if (bookActive && mv.ply <= BOOK_MAX_PLY && inBook(mv.fenAfter)) book = true;
    else bookActive = false;

    if (after.ok) { lastEval = toEval(after.top); lastNorm = after.top; }
    series.push(winPercent(lastNorm.cp));

    const out = {
      ply: mv.ply, san: mv.san, uci: mv.uci, color: mv.color,
      fenBefore: mv.fenBefore, fenAfter: mv.fenAfter,
      evalAfter: lastEval,
      bestUci: null, bestSan: null,
      loss: 0, classification: null, accuracy: null,
      phase: phaseOf(mv.ply, mv.fenAfter),
      failed, line: [], topLines: after.ok ? publicLines(after) : [],
    };
    if (failed) {
      if (book) out.classification = 'book';
      accuracyOf.push(null);
      prevClass = out.classification;
      moves.push(out);
      return;
    }

    const core = moveCore({ fenBefore: mv.fenBefore, color, uci: mv.uci, before, afterTop: after.top });
    const classification = classifyMove({
      inBook: book,
      loss: core.loss,
      playedIsBest: core.playedIsBest,
      winBest: core.winBest,
      winAfter: core.winAfter,
      gap: core.gap,
      legalMoves: () => new Chess(mv.fenBefore).moves().length,
      sacrifice: () => sacrificeOf(mv.fenBefore, mv.fenAfter, after.lines[0]?.pv, color),
      prevOpponent: prevClass,
    });
    out.bestUci = core.bestUci;
    out.line = sanLine(mv.fenBefore, before.lines[0].pv, 6);
    out.bestSan = core.bestUci ? out.line[0] ?? sanOf(mv.fenBefore, core.bestUci) : null;
    if (core.secondUci) out.secondSan = sanOf(mv.fenBefore, core.secondUci);
    out.loss = round(core.loss, 4);
    out.classification = classification;
    out.accuracy = round(core.accuracy, 2);
    accuracyOf.push(core.accuracy);
    prevClass = classification;
    moves.push(out);
  });

  const weights = volatilityWeights(series);
  const sideItems = { white: [], black: [] };
  moves.forEach((mv, i) => {
    if (accuracyOf[i] !== null) sideItems[mv.color].push({ accuracy: accuracyOf[i], weight: weights[i] });
  });
  const counts = { white: emptyCounts(), black: emptyCounts() };
  for (const mv of moves) if (mv.classification) counts[mv.color][mv.classification]++;

  return {
    gameId,
    state: moves.some((m) => m.failed) || !pos[0].ok ? 'partial' : 'ready',
    engine: { name: engine?.name ?? 'Stockfish', version: engine?.version ?? '', depthFast, depthDeep },
    accuracy: { white: round(gameAccuracy(sideItems.white), 2), black: round(gameAccuracy(sideItems.black), 2) },
    counts,
    initial: {
      eval: pos[0].ok ? toEval(pos[0].top) : { cp: 0 },
      lines: pos[0].ok ? publicLines(pos[0]) : [],
    },
    moves,
    criticalMoments: criticalMoments(moves),
  };
}
