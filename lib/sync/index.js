// Sync service: downloads the public chess.com monthly archives of one user into `games`.
// One request at a time (client.js), idempotent inserts, completed past months never refetched.
import { HttpError, USERNAME_RE } from '../settings.js';
import { insertGame, getKv, setKv, nowIso, countGames } from '../store.js';
import { createClient, archivesUrl, isApiUrl, SyncError } from './client.js';
import { mapGame, monthOfArchiveUrl } from './parse.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DEFAULT_RECENT_COUNT = 10;
const MAX_RANGE_MONTHS = 24;
const dayStart = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);
const dayEnd = (d) => Math.floor(Date.parse(`${d}T23:59:59Z`) / 1000);

/** Validated range → { fromSec, toSec, fromMonth, toMonth } or throws HttpError 400. */
export function parseRange(from, to) {
  if (!DATE_RE.test(String(from || '')) || !DATE_RE.test(String(to || '')) || Number.isNaN(dayStart(from)) || Number.isNaN(dayStart(to))) {
    throw new HttpError(400, 'invalid_range', 'from and to must look like YYYY-MM-DD.');
  }
  if (from > to) throw new HttpError(400, 'invalid_range', 'The start date must not be after the end date.');
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
  if (months > MAX_RANGE_MONTHS) throw new HttpError(400, 'invalid_range', `The period must not exceed ${MAX_RANGE_MONTHS} months.`);
  return { fromSec: dayStart(from), toSec: dayEnd(to), fromMonth: from.slice(0, 7), toMonth: to.slice(0, 7) };
}

export function parseCount(count) {
  if (count === undefined || count === null) return DEFAULT_RECENT_COUNT;
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > RECENT_GAMES) throw new HttpError(400, 'invalid_count', `count must be an integer between 1 and ${RECENT_GAMES}.`);
  return n;
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
/** scope 'recent' keeps only the newest games, whatever the number of months it takes. */
export const RECENT_GAMES = 15;
const STATE_BY_CODE = { rate_limited: 'rate_limited', user_not_found: 'not_found' };

/**
 * createSyncService({ sql, fetch, getSettings, publish, userAgent, version, now, sleep })
 * - userAgent(version, contact) → string (lib/settings.js `userAgent`)
 * - publish(userId, topic, payload)
 */
export function createSyncService({ sql, fetch, getSettings, publish = () => {}, userAgent, version = '1.0.0', now = Date.now, sleep, log = {} }) {
  const client = createClient({ fetch, sleep, now });
  const runs = new Map();        // userId → { state, ..., promise }
  let stopped = false;

  const uaFor = async (userId) => {
    const s = await getSettings(userId);
    return { settings: s, ua: userAgent(version, s.contact) };
  };
  const headersFor = (ua, extra = {}) => ({ 'User-Agent': ua, Accept: 'application/json', ...extra });
  const pub = (userId, topic, payload) => { try { publish(userId, topic, payload); } catch (e) { log.warn?.('sync publish failed', e); } };

  function lastOf(userId) {
    try { return JSON.parse(getKv(sql, userId, 'sync:last') || 'null'); } catch { return null; }
  }

  async function checkUsername(username, userId) {
    const name = String(username ?? '').trim();
    if (!USERNAME_RE.test(name)) throw new HttpError(400, 'invalid_username', 'The chess.com username must be 3 to 25 letters, digits, "_" or "-".');
    const lower = name.toLowerCase();
    const { ua } = userId ? await uaFor(userId) : { ua: userAgent(version, '') };
    try {
      const r = await client.request(archivesUrl(lower), { headers: headersFor(ua), retries: 0 });
      const archives = Array.isArray(r.json?.archives) ? r.json.archives.length : 0;
      return { ok: true, username: lower, archives };
    } catch (e) {
      if (!(e instanceof SyncError)) throw e;
      if (e.code === 'user_not_found') return { ok: false, code: 'user_not_found', error: e.message };
      if (e.code === 'rate_limited') return { ok: false, code: 'rate_limited', error: e.message };
      return { ok: false, code: 'network', error: e.message };
    }
  }

  function selectArchives(urls, scope, month, range) {
    const items = urls.filter(isApiUrl).map((url) => ({ url, month: monthOfArchiveUrl(url) })).filter((a) => a.month);
    items.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)); // newest first
    if (scope === 'all') return items;
    if (scope === 'month') return items.filter((a) => a.month === month);
    if (scope === 'range') return items.filter((a) => a.month >= range.fromMonth && a.month <= range.toMonth);
    return items.slice(0, 3);
  }

  async function execute(userId, username, scope, month, run, opts = {}) {
    const { ua } = await uaFor(userId);
    const isStopped = () => stopped;
    const currentMonth = nowIso(now()).slice(0, 7);
    let added = 0;
    const limit = scope === 'recent' ? opts.count : scope === 'range' ? RECENT_GAMES : Infinity;
    let collected = 0;
    const res = await client.request(archivesUrl(username), { headers: headersFor(ua), isStopped });
    const list = selectArchives(Array.isArray(res.json?.archives) ? res.json.archives : [], scope, month, opts.range);
    run.archivesTotal = list.length;
    pub(userId, 'sync.progress', { state: 'running', archivesDone: 0, archivesTotal: list.length, games: 0 });
    const sel = sql.prepare('SELECT etag, last_modified, complete, games FROM archives WHERE user_id = ? AND url = ?');
    const upsert = sql.prepare(`INSERT INTO archives (user_id, url, month, etag, last_modified, fetched_at, games, complete) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, url) DO UPDATE SET etag = excluded.etag, last_modified = excluded.last_modified, fetched_at = excluded.fetched_at, games = excluded.games, complete = excluded.complete`);
    for (const a of list) {
      if (collected >= limit) break;
      const row = sel.get(userId, a.url);
      const isPast = a.month < currentMonth;
      if (scope === 'range' || !(row?.complete === 1 && isPast)) {
        const cond = {};
        // Conditional requests only for the current month; a past month not yet complete is refetched whole.
        if (!isPast && row?.etag) cond['If-None-Match'] = row.etag;
        if (!isPast && row?.last_modified) cond['If-Modified-Since'] = row.last_modified;
        let r = null;
        try {
          r = await client.request(a.url, { headers: headersFor(ua, cond), isStopped });
        } catch (e) {
          if (!(e instanceof SyncError && e.code === 'user_not_found')) throw e;
          // A month that disappeared is skipped; the other months are still worth downloading.
        }
        if (r && r.status === 200) {
          const every = Array.isArray(r.json?.games) ? r.json.games : [];
          const all = scope === 'range' ? every.filter((g) => Number(g.end_time) >= opts.range.fromSec && Number(g.end_time) <= opts.range.toSec) : every;
          // chess.com lists a month oldest-first: keep the newest ones still needed.
          const games = limit === Infinity ? all : all.slice(Math.max(0, all.length - (limit - collected)));
          collected += games.length;
          const stamp = nowIso(now());
          sql.transaction(() => {
            for (const raw of games) {
              const g = mapGame(raw, username, { archiveUrl: a.url, nowIso: stamp });
              if (g && insertGame(sql, userId, g)) added += 1;
            }
            upsert.run(userId, a.url, a.month, r.headers?.get?.('etag') ?? null, r.headers?.get?.('last-modified') ?? null, stamp, all.length, (isPast && games.length === all.length) ? 1 : 0);
          });
          run.games += games.length;
        } else if (r && r.status === 304) {
          sql.prepare('UPDATE archives SET fetched_at = ? WHERE user_id = ? AND url = ?').run(nowIso(now()), userId, a.url);
        }
      } else {
        collected += Math.min(Number(row.games) || 0, limit - collected); // already stored: counts toward the limit
      }
      run.archivesDone += 1;
      pub(userId, 'sync.progress', { state: 'running', archivesDone: run.archivesDone, archivesTotal: list.length, games: run.games });
    }
    return added;
  }

  /** Starts a sync in the background. Resolves immediately with { started: true }. */
  async function start(userId, { scope = 'recent', month, count, from, to } = {}) {
    userId = String(userId);
    if (!['recent', 'all', 'month', 'range'].includes(scope)) throw new HttpError(400, 'invalid_scope', 'scope must be recent, all, month or range.');
    const opts = { count: scope === 'recent' ? parseCount(count) : undefined, range: scope === 'range' ? parseRange(from, to) : undefined };
    if (scope === 'month' && !MONTH_RE.test(String(month || ''))) throw new HttpError(400, 'invalid_month', 'month must look like YYYY-MM.');
    const { settings } = await uaFor(userId);
    if (!settings.username) throw new HttpError(400, 'not_configured', 'Set your chess.com username first.');
    if (runs.get(userId)?.state === 'running') throw new HttpError(409, 'sync_running', 'A sync is already running.');
    const run = { state: 'running', startedAt: now(), archivesDone: 0, archivesTotal: 0, games: 0, error: null, added: 0 };
    runs.set(userId, run);
    setKv(sql, userId, 'sync:last_attempt', String(now()));
    run.promise = (async () => {
      let state = 'idle';
      try {
        run.added = await execute(userId, settings.username, scope, month, run, opts);
      } catch (e) {
        if (e instanceof SyncError) {
          state = e.code === 'stopped' ? 'idle' : STATE_BY_CODE[e.code] || 'error';
          run.error = e.message;
        } else {
          state = 'error';
          run.error = 'Unexpected sync failure.';
          log.error?.('sync failed', e);
        }
      }
      run.state = state;
      setKv(sql, userId, 'sync:last', JSON.stringify({ at: nowIso(now()), state, added: run.added, error: run.error }));
      pub(userId, 'sync.done', { state, added: run.added });
    })();
    return { started: true };
  }

  function status(userId) {
    userId = String(userId);
    const run = runs.get(userId);
    const last = lastOf(userId);
    const archives = Number(sql.prepare('SELECT COUNT(*) AS n FROM archives WHERE user_id = ?').get(userId).n);
    const games = countGames(sql, userId, { demo: false });
    const state = run ? run.state : last && last.state !== 'idle' ? last.state : 'idle';
    const error = run?.error || (state !== 'idle' && state !== 'running' ? last?.error : null);
    return { state, last: last?.at ?? null, archives, games, ...(error ? { error } : {}) };
  }

  async function whenIdle(userId) {
    const run = runs.get(String(userId));
    if (run?.promise) await run.promise;
  }

  function stop() {
    stopped = true;
  }

  return { start, status, checkUsername, whenIdle, stop };
}
