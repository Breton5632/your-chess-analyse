// Thin helpers over chess.js (bundled; never a third-party board library).
import { Chess } from '../../vendor/chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FILES = 'abcdefgh';

// 64 entries, rank 8 to rank 1, file a to h; each null or 'wK' / 'bP'...
export function piecesFromFen(fen) {
  const out = [];
  for (const row of String(fen || START_FEN).split(' ')[0].split('/')) {
    for (const ch of row) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase());
    }
  }
  while (out.length < 64) out.push(null);
  return out.slice(0, 64);
}
export const sideToMove = (fen) => (String(fen || START_FEN).split(' ')[1] === 'b' ? 'black' : 'white');
export const squareAt = (index) => FILES[index % 8] + (8 - Math.floor(index / 8));
export function uciSquares(uci) {
  return uci && uci.length >= 4 ? { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] } : null;
}

function load(fen) {
  try { return new Chess(fen); } catch { return null; }
}
export function legalTargets(fen, square) {
  const g = load(fen);
  if (!g) return [];
  try { return g.moves({ square, verbose: true }).map((m) => m.to); } catch { return []; }
}
export function ownPiece(fen, square) {
  const g = load(fen);
  const p = g && g.get(square);
  return !!p && (p.color === 'w') === (sideToMove(fen) === 'white');
}
// Plays from -> to (auto-queen); returns { san, uci, fen } or null when illegal.
export function tryMove(fen, from, to, promotion = 'q') {
  const g = load(fen);
  if (!g) return null;
  try {
    const m = g.move({ from, to, promotion });
    return { san: m.san, uci: m.from + m.to + (m.promotion || ''), fen: g.fen() };
  } catch { return null; }
}
export function playSan(fen, san) {
  const g = load(fen);
  if (!g) return null;
  try {
    const m = g.move(san);
    return { san: m.san, uci: m.from + m.to + (m.promotion || ''), fen: g.fen(), from: m.from, to: m.to };
  } catch { return null; }
}
// Replays SAN tokens from a FEN; stops at the first illegal one (an invented move is never shown).
export function playLine(fen, sans) {
  const out = { sans: [], fens: [fen], moves: [] };
  let cur = fen;
  for (const s of sans || []) {
    const m = playSan(cur, s);
    if (!m) break;
    out.sans.push(m.san); out.fens.push(m.fen); out.moves.push({ from: m.from, to: m.to });
    cur = m.fen;
  }
  return out;
}
export const isLegalSan = (fen, san) => !!playSan(fen, san);

// ---- evaluation (White POV) ----
export const clampCp = (cp) => Math.max(-2000, Math.min(2000, cp));
export function winPct(ev) {
  if (!ev) return 50;
  if (ev.mate != null) return ev.mate > 0 ? 100 : ev.mate < 0 ? 0 : 50;
  const cp = clampCp(ev.cp || 0);
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}
export function formatEval(ev, minus = '−') {
  if (!ev) return '';
  if (ev.mate != null) return (ev.mate < 0 ? minus : '') + 'M' + Math.abs(ev.mate);
  const v = (ev.cp || 0) / 100;
  if (Math.abs(v) < 0.05) return '0.0';
  return (v > 0 ? '+' : minus) + Math.abs(v).toFixed(1);
}
export const whiteLeads = (ev) => (ev ? (ev.mate != null ? ev.mate > 0 : (ev.cp || 0) >= 0) : true);
