// chess.com public API client: one request at a time, >= 400 ms apart, 429 handling, 20 s timeout.
// Only https://api.chess.com/ is ever contacted (read-only public data).

export const API_ORIGIN = 'https://api.chess.com';
export const NOT_FOUND_MSG = 'Account not found or profile not public.';

export class SyncError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    if (status) this.status = status;
  }
}

const realSleep = (ms) => new Promise((resolve) => { const t = setTimeout(resolve, ms); t.unref?.(); });

/** Retry-After in ms (seconds or HTTP date), or `fallback` when absent/invalid. Capped at 10 minutes. */
export function retryAfterMs(value, nowMs, fallback = 60_000) {
  const v = String(value ?? '').trim();
  if (!v) return fallback;
  let ms;
  if (/^\d+$/.test(v)) ms = Number(v) * 1000;
  else {
    const t = Date.parse(v);
    ms = Number.isFinite(t) ? t - nowMs : NaN;
  }
  if (!Number.isFinite(ms)) return fallback;
  return Math.min(Math.max(ms, 0), 600_000);
}

export const archivesUrl = (username) => `${API_ORIGIN}/pub/player/${encodeURIComponent(username)}/games/archives`;
export const isApiUrl = (url) => typeof url === 'string' && url.startsWith(`${API_ORIGIN}/`);

/**
 * @param {object} o
 * @param {Function} o.fetch   fetch-compatible function (ctx.fetch)
 * @param {Function} [o.sleep] (ms) => Promise  (injected in tests)
 * @param {Function} [o.now]   () => epoch ms   (injected in tests)
 */
export function createClient({ fetch, sleep = realSleep, now = Date.now, gapMs = 400, timeoutMs = 20_000, retryDefaultMs = 60_000, maxRetries = 3 }) {
  let tail = Promise.resolve();
  let lastEnd = null;

  async function once(url, headers) {
    const ac = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { ac.abort(); reject(new SyncError('network', `chess.com did not answer within ${Math.round(timeoutMs / 1000)} seconds.`)); }, timeoutMs);
      timer.unref?.();
    });
    const call = (async () => {
      const res = await fetch(url, { method: 'GET', headers, signal: ac.signal });
      const status = res.status;
      const text = status === 200 ? await res.text() : '';
      return { status, headers: res.headers, text };
    })();
    call.catch(() => {}); // a late failure after the timeout must not be an unhandled rejection
    try { return await Promise.race([call, timeout]); } finally { clearTimeout(timer); }
  }

  async function run(url, { headers = {}, retries = maxRetries, isStopped = () => false } = {}) {
    if (!isApiUrl(url)) throw new SyncError('bad_url', 'Refusing to contact a host other than api.chess.com.');
    for (let attempt = 0; ; attempt += 1) {
      if (isStopped()) throw new SyncError('stopped', 'Sync stopped.');
      if (lastEnd !== null) {
        const wait = gapMs - (now() - lastEnd);
        if (wait > 0) await sleep(wait);
      }
      let r;
      try {
        r = await once(url, headers);
      } catch (e) {
        lastEnd = now();
        if (e instanceof SyncError) throw e;
        throw new SyncError('network', 'Could not reach chess.com. Check your connection and try again.');
      }
      lastEnd = now();
      if (r.status === 429) {
        if (attempt >= retries) throw new SyncError('rate_limited', 'chess.com is rate limiting requests. Wait a few minutes and sync again.', 429);
        await sleep(retryAfterMs(r.headers?.get?.('retry-after'), now(), retryDefaultMs));
        continue;
      }
      if (r.status === 404) throw new SyncError('user_not_found', NOT_FOUND_MSG, 404);
      if (r.status === 304) return { status: 304, headers: r.headers, json: null };
      if (r.status !== 200) throw new SyncError('http_error', `chess.com answered HTTP ${r.status}.`, r.status);
      let json;
      try { json = JSON.parse(r.text); } catch { throw new SyncError('bad_response', 'chess.com sent an unreadable answer.'); }
      return { status: 200, headers: r.headers, json };
    }
  }

  return {
    /** Serialised: the next request starts only when the previous one (and its retries) has ended. */
    request(url, opts) {
      const p = tail.then(() => run(url, opts));
      tail = p.catch(() => {});
      return p;
    },
  };
}
