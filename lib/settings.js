// Settings of the Chess Insight plugin (docs/CONTRACT.md §6).
// Manifest settings are the instance defaults; PUT /settings stores per-user overrides in `kv`
// (key `setting:<name>`). Effective value = user override ?? manifest value ?? built-in default.
import { availableParallelism, cpus } from 'node:os';

export class HttpError extends Error {
  constructor(status, code, message, params) {
    super(message);
    this.status = status;
    this.code = code;
    if (params) this.params = params;
  }
}

/** Writes the contract's error body `{ error, code, message, params? }`. */
export function sendError(res, err) {
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = status === 500 && !err?.code ? 'Internal error.' : String(err?.message || 'Internal error.').slice(0, 500);
  const body = { error: message, code: err?.code || (status === 500 ? 'internal_error' : 'error'), message };
  if (err?.params) body.params = err.params;
  return res.status(status).json(body);
}

export const USERNAME_RE = /^[A-Za-z0-9_-]{3,25}$/;

export const DEFAULTS = Object.freeze({
  username: '',
  depthFast: 14,
  depthDeep: 20,
  threads: 0,
  hashMb: 64,
  contact: '',
  autoAnalyse: true,
  language: 'auto',
  showBestArrow: true,
});

export const BOUNDS = Object.freeze({
  depthFast: { min: 10, max: 20 },
  depthDeep: { min: 16, max: 28 },
  threads: { min: 0, max: 16 },
  hashMb: { min: 16, max: 2048 },
  contact: { maxLength: 80 },
  language: { values: ['auto', 'en', 'fr'] },
});

const KEYS = Object.keys(DEFAULTS);
const INT_KEYS = ['depthFast', 'depthDeep', 'threads', 'hashMb'];
const BOOL_KEYS = ['autoAnalyse', 'showBestArrow'];

const invalid = (key, message, extra = {}) => new HttpError(400, 'invalid_setting', message, { key, ...extra });

function normInt(key, v) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  const { min, max } = BOUNDS[key];
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    throw invalid(key, `Setting "${key}" must be an integer between ${min} and ${max}.`, { min, max });
  }
  return n;
}

function normOne(key, v) {
  if (INT_KEYS.includes(key)) return normInt(key, v);
  if (BOOL_KEYS.includes(key)) {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 'false') return v === 'true';
    throw invalid(key, `Setting "${key}" must be true or false.`);
  }
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : null;
  if (s === null) throw invalid(key, `Setting "${key}" must be text.`);
  if (key === 'username') {
    if (s === '') return '';
    if (!USERNAME_RE.test(s)) throw invalid(key, 'The chess.com username must be 3 to 25 letters, digits, "_" or "-".');
    return s.toLowerCase();
  }
  if (key === 'contact') {
    if (s.length > BOUNDS.contact.maxLength) throw invalid(key, `The contact must be at most ${BOUNDS.contact.maxLength} characters.`, { max: BOUNDS.contact.maxLength });
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f()]/.test(s)) throw invalid(key, 'The contact cannot contain parentheses or control characters.');
    return s;
  }
  if (key === 'language') {
    const l = s.toLowerCase();
    if (!BOUNDS.language.values.includes(l)) throw invalid(key, 'The language must be auto, en or fr.', { values: BOUNDS.language.values });
    return l;
  }
  return s;
}

/** Pure validation of a patch. Unknown keys → 400 unknown_setting. Returns the normalised patch. */
export function validateSettings(patch, current = DEFAULTS) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new HttpError(400, 'invalid_body', 'A JSON object is expected.');
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!KEYS.includes(k)) throw new HttpError(400, 'unknown_setting', `Unknown setting "${k}".`, { key: k });
    out[k] = normOne(k, v);
  }
  const fast = out.depthFast ?? current.depthFast;
  const deep = out.depthDeep ?? current.depthDeep;
  if (deep < fast) throw invalid('depthDeep', 'The deep depth must be greater than or equal to the first-pass depth.', { min: fast });
  return out;
}

/** Built-in defaults overlaid with the manifest values, each one re-validated (a bad value falls back). */
async function instanceDefaults(ctx) {
  const out = { ...DEFAULTS };
  if (typeof ctx?.settings?.get !== 'function') return out;
  for (const k of KEYS) {
    let v;
    try { v = await ctx.settings.get(k); } catch { v = undefined; }
    if (v === undefined || v === null || (v === '' && k !== 'username' && k !== 'contact')) continue;
    try { out[k] = normOne(k, v); } catch { /* keep the built-in default */ }
  }
  if (out.depthDeep < out.depthFast) out.depthDeep = Math.max(out.depthFast, DEFAULTS.depthDeep);
  return out;
}

function readOverrides(sql, userId) {
  const rows = sql.prepare("SELECT key, value FROM kv WHERE user_id = ? AND key LIKE 'setting:%'").all(String(userId));
  const out = {};
  for (const r of rows) {
    const k = r.key.slice('setting:'.length);
    if (!KEYS.includes(k)) continue;
    try { out[k] = JSON.parse(r.value); } catch { /* ignore a corrupt row */ }
  }
  return out;
}

/** Effective settings of one user. */
export async function getSettings(ctx, userId) {
  const base = await instanceDefaults(ctx);
  if (!userId || !ctx?.sql) return base;
  const merged = { ...base };
  for (const [k, v] of Object.entries(readOverrides(ctx.sql, userId))) {
    try { merged[k] = normOne(k, v); } catch { /* ignore an override that no longer validates */ }
  }
  if (merged.depthDeep < merged.depthFast) merged.depthDeep = merged.depthFast;
  return merged;
}

/** Validates and stores a per-user patch; returns the new effective settings. */
export async function putSettings(ctx, userId, patch) {
  if (!userId) throw new HttpError(401, 'unauthenticated', 'Sign-in required.');
  const current = await getSettings(ctx, userId);
  const clean = validateSettings(patch, current);
  const up = ctx.sql.prepare('INSERT INTO kv (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value');
  ctx.sql.transaction(() => {
    for (const [k, v] of Object.entries(clean)) up.run(String(userId), `setting:${k}`, JSON.stringify(v));
  });
  return getSettings(ctx, userId);
}

export function cpuCount() {
  try { return typeof availableParallelism === 'function' ? availableParallelism() : cpus().length || 1; } catch { return 1; }
}

/** 0 = automatic: min(4, floor(cores / 2)), at least 1. */
export function effectiveThreads(threads, cores = cpuCount()) {
  if (Number.isInteger(threads) && threads >= 1) return Math.min(16, threads);
  return Math.max(1, Math.min(4, Math.floor((cores || 1) / 2)));
}

/** Generic User-Agent; the contact (opt-in setting) is appended in parentheses when set. */
export function userAgent(version, contact = '') {
  const c = String(contact || '').trim();
  return c ? `TimonChessCoach/${version} (${c})` : `TimonChessCoach/${version}`;
}
