// Imports ONE pasted PGN as a game row (same shape as a chess.com game, see sync/parse.js mapGame).
import { createHash } from 'node:crypto';
import { HttpError } from '../settings.js';
import { parseGame } from '../analysis/pgn.js';
import { mapGame, pgnHeaders } from './parse.js';

export const MAX_PGN_CHARS = 200_000;

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };

function endTimeOf(h) {
  const d = String(h.UTCDate || h.Date || '').replace(/\./g, '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return 0;
  const ms = Date.parse(`${d}T${/^\d{2}:\d{2}:\d{2}$/.test(h.UTCTime || '') ? h.UTCTime : '00:00:00'}Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

/** @returns {{ row, username }} a games row, or throws HttpError 400 invalid_pgn */
export function rowFromPgn(pgn, username, nowIso) {
  const text = String(pgn ?? '').trim();
  if (!text) throw new HttpError(400, 'invalid_pgn', 'Paste a PGN first.');
  if (text.length > MAX_PGN_CHARS) throw new HttpError(400, 'invalid_pgn', 'The PGN is too large.');
  const parsed = parseGame(text);
  if (parsed.invalid) throw new HttpError(400, 'invalid_pgn', parsed.error || 'This PGN cannot be read.', { reason: parsed.reason });
  const h = pgnHeaders(text);
  const id = BigInt(`0x${createHash('sha1').update(text).digest('hex').slice(0, 12)}`).toString();
  const r = String(h.Result || '*');
  const [wRes, bRes] = r === '1-0' ? ['win', 'resigned'] : r === '0-1' ? ['resigned', 'win'] : r === '1/2-1/2' ? ['agreed', 'agreed'] : [null, null];
  const tc = String(h.TimeControl || '');
  const base = Number(tc.split('+')[0]);
  const timeClass = !tc || !Number.isFinite(base) ? null : base < 180 ? 'bullet' : base < 600 ? 'blitz' : base < 86400 ? 'rapid' : 'daily';
  const raw = {
    url: `pgn-import://game/${id}`,
    pgn: text,
    time_class: timeClass,
    time_control: tc || null,
    rated: false,
    rules: 'chess',
    end_time: endTimeOf(h),
    eco: h.ECOUrl || null,
    white: { username: h.White || 'White', rating: num(h.WhiteElo), result: wRes },
    black: { username: h.Black || 'Black', rating: num(h.BlackElo), result: bRes },
  };
  const row = mapGame(raw, username, { archiveUrl: null, nowIso });
  if (!row) throw new HttpError(400, 'invalid_pgn', 'This PGN cannot be stored.');
  return { row, id };
}
