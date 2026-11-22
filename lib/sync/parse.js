// Maps one chess.com archive game (public API JSON) to a `games` row (docs/CONTRACT.md §3).

const DRAW_CODES = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);

/** Numeric id at the end of a chess.com game URL, or null. */
export function gameIdFromUrl(url) {
  const m = /\/(\d+)\/?(?:[?#].*)?$/.exec(String(url || ''));
  return m ? m[1] : null;
}

/** Header tag pairs of a PGN as a plain object (first occurrence wins). */
export function pgnHeaders(pgn) {
  const out = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let m;
  while ((m = re.exec(String(pgn || '')))) if (!(m[1] in out)) out[m[1]] = m[2].replace(/\\(["\\])/g, '$1');
  return out;
}

/** Approximate half-move count from the movetext (comments and variations removed). */
export function countPlies(pgn) {
  let text = String(pgn || '').replace(/^\[[^\n]*\]\s*$/gm, '');
  text = text.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  for (let i = 0; i < 4; i += 1) text = text.replace(/\([^()]*\)/g, ' ');
  text = text.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');
  return text.split(/\s+/).filter((t) => /^[KQRBNOa-h0]/.test(t)).length;
}

/** "Sicilian-Defense-Open-Najdorf-Variation-6.Bg5-e6" → "Sicilian Defense Open Najdorf Variation". */
export function openingFromEcoUrl(url) {
  const m = /\/openings\/([^/?#]+)/.exec(String(url || ''));
  if (!m) return null;
  let slug;
  try { slug = decodeURIComponent(m[1]); } catch { slug = m[1]; }
  const words = [];
  for (const w of slug.split('-')) {
    if (/^\d+\.{1,3}/.test(w) || w === '...') break;
    words.push(w);
  }
  const name = words.join(' ').trim();
  return name || null;
}

/** 'win' | 'loss' | 'draw' from a chess.com result code. */
export function outcomeOf(code) {
  if (code === 'win') return 'win';
  return DRAW_CODES.has(code) ? 'draw' : 'loss';
}

const num = (v) => (Number.isFinite(v) ? v : null);

/**
 * @returns the row to insert, or null when the game cannot be stored (no URL id or no PGN).
 * Games with rules != 'chess' are stored with their `rules` so that the analysis can skip them.
 */
export function mapGame(raw, username, { archiveUrl = null, nowIso }) {
  if (!raw || typeof raw !== 'object') return null;
  const id = gameIdFromUrl(raw.url);
  if (!id || typeof raw.pgn !== 'string' || !raw.pgn.trim()) return null;
  const white = raw.white || {};
  const black = raw.black || {};
  const me = String(username || '').toLowerCase();
  const color = me && String(white.username || '').toLowerCase() === me ? 'white'
    : me && String(black.username || '').toLowerCase() === me ? 'black' : null;
  const mine = color === 'white' ? white : color === 'black' ? black : null;
  const opp = color === 'white' ? black : color === 'black' ? white : null;
  const result = mine ? outcomeOf(mine.result) : null;
  // Termination = result code of the side that did not win (the winner's code is just "win").
  const termination = mine ? (result === 'win' ? opp.result : mine.result) : null;
  const headers = pgnHeaders(raw.pgn);
  const ecoUrl = (typeof raw.eco === 'string' && raw.eco) || headers.ECOUrl || null;
  return {
    id,
    url: String(raw.url),
    pgn: raw.pgn,
    time_class: raw.time_class || null,
    time_control: raw.time_control == null ? null : String(raw.time_control),
    rated: raw.rated ? 1 : 0,
    rules: raw.rules || 'chess',
    end_time: Number.isInteger(raw.end_time) ? raw.end_time : 0,
    white_name: white.username ?? null, white_rating: num(white.rating), white_result: white.result ?? null,
    black_name: black.username ?? null, black_rating: num(black.rating), black_result: black.result ?? null,
    color,
    my_rating: mine ? num(mine.rating) : null,
    opp_name: opp ? opp.username ?? null : null,
    opp_rating: opp ? num(opp.rating) : null,
    result,
    termination: termination ?? null,
    eco_code: headers.ECO || null,
    opening: openingFromEcoUrl(ecoUrl),
    eco_url: ecoUrl,
    acc_white: num(raw.accuracies?.white),
    acc_black: num(raw.accuracies?.black),
    plies: countPlies(raw.pgn),
    analyzed: 0,
    demo: 0,
    archive_url: archiveUrl,
    created_at: nowIso,
  };
}

/** 'YYYY-MM' from an archive URL ending in /YYYY/MM, or null. */
export function monthOfArchiveUrl(url) {
  const m = /\/(\d{4})\/(0[1-9]|1[0-2])\/?$/.exec(String(url || ''));
  return m ? `${m[1]}-${m[2]}` : null;
}
