// PGN parsing, FEN keys and validated SAN lines. Everything goes through chess.js (vendored);
// nothing here ever throws on bad input (parseGame returns an `invalid` result instead).
import { Chess } from '../../vendor/chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** FEN without the halfmove/fullmove counters: pieces, side to move, castling, en passant. */
export function fenKey(fen) {
  return String(fen).trim().split(/\s+/).slice(0, 4).join(' ');
}

const STANDARD_VARIANTS = new Set(['', 'chess', 'standard', 'live chess']);

/** Variant name found in the PGN headers ('chess' when standard). */
function variantOf(headers) {
  const raw = String(headers.Variant ?? '').trim().toLowerCase();
  if (STANDARD_VARIANTS.has(raw)) return 'chess';
  return raw.replace(/\s+/g, '');
}

function invalid(reason, error, extra = {}) {
  return { headers: {}, initialFen: START_FEN, moves: [], rules: 'chess', invalid: true, reason, error, ...extra };
}

/**
 * Parse a PGN into plies.
 * @param {string} pgn
 * @param {{ rules?: string }} [opts] rules from the archive ('chess' or a variant name)
 * @returns {{ headers, initialFen, moves:[{ ply, san, uci, color, fenBefore, fenAfter }], rules,
 *             invalid?: true, reason?: 'variant'|'no_moves'|'illegal'|'parse', error?: string }}
 */
export function parseGame(pgn, opts = {}) {
  if (typeof pgn !== 'string' || !pgn.trim()) return invalid('no_moves', 'The game has no PGN.');
  const declared = String(opts.rules ?? '').trim().toLowerCase();
  if (declared && declared !== 'chess') {
    return invalid('variant', `Variant "${declared}" is not supported (standard chess only).`, { rules: declared });
  }
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (err) {
    // chess.js throws on both syntax errors and illegal moves.
    const message = String(err?.message ?? err);
    const illegal = /invalid move|illegal/i.test(message);
    return invalid(illegal ? 'illegal' : 'parse', `Cannot read the game: ${message.split('\n')[0]}`);
  }
  const headers = chess.getHeaders();
  const variant = variantOf(headers);
  if (variant !== 'chess') {
    return { ...invalid('variant', `Variant "${variant}" is not supported (standard chess only).`), headers, rules: variant };
  }
  const verbose = chess.history({ verbose: true });
  if (!verbose.length) return { ...invalid('no_moves', 'The game has no moves.'), headers };
  const moves = verbose.map((m, i) => ({
    ply: i + 1,
    san: m.san,
    uci: `${m.from}${m.to}${m.promotion ?? ''}`,
    color: m.color === 'w' ? 'white' : 'black',
    fenBefore: m.before,
    fenAfter: m.after,
  }));
  return { headers, initialFen: moves[0].fenBefore, moves, rules: 'chess' };
}

const UCI_RE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** SAN for a list of UCI moves from `fen`, validated by chess.js. Stops at the first illegal move. */
export function sanLine(fen, uciMoves, max = 6) {
  const out = [];
  let chess;
  try { chess = new Chess(fen); } catch { return out; }
  for (const uci of uciMoves ?? []) {
    if (out.length >= max) break;
    const m = UCI_RE.exec(String(uci));
    if (!m) break;
    try {
      out.push(chess.move({ from: m[1], to: m[2], promotion: m[3] }).san);
    } catch {
      break;
    }
  }
  return out;
}

/** SAN of one UCI move from `fen`, or null when illegal. */
export function sanOf(fen, uci) {
  return sanLine(fen, [uci], 1)[0] ?? null;
}

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material of a FEN in pawn units: { w, b, pieces } (pieces = combined non-pawn, non-king material). */
export function material(fen) {
  const board = String(fen).split(' ')[0];
  const out = { w: 0, b: 0, pieces: 0 };
  for (const ch of board) {
    const lower = ch.toLowerCase();
    if (!(lower in PIECE_VALUE)) continue;
    const side = ch === lower ? 'b' : 'w';
    out[side] += PIECE_VALUE[lower];
    if (lower !== 'p' && lower !== 'k') out.pieces += PIECE_VALUE[lower];
  }
  return out;
}

/** Number of legal moves in a position (0 when the FEN is unreadable). */
export function legalMoveCount(fen) {
  try { return new Chess(fen).moves().length; } catch { return 0; }
}

/** Terminal status of a position: 'checkmate' | 'stalemate' | null. */
export function terminalStatus(fen) {
  try {
    const c = new Chess(fen);
    if (c.isCheckmate()) return 'checkmate';
    if (c.isStalemate()) return 'stalemate';
  } catch { /* unreadable */ }
  return null;
}

/** Whether a string is a FEN chess.js accepts. */
export function isValidFen(fen) {
  try { new Chess(String(fen)); return true; } catch { return false; }
}
