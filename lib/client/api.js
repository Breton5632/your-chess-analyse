// clientCtx.api wrapper: JSON bodies for every write, no query string (the proxy drops it).
import { parseApiError } from '@timon/ui';

export class ApiError extends Error {
  constructor(message, { code = 'unknown', status = 0, params } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.params = params;
  }
}

export function createApi(ctx) {
  async function call(method, path, body) {
    const init = { method, cache: 'no-store' };
    if (method !== 'GET') {
      init.headers = { 'content-type': 'application/json' };
      init.body = JSON.stringify(body ?? {});
    }
    let res;
    try {
      res = await ctx.api(path, init);
    } catch (e) {
      throw new ApiError(e && e.message ? e.message : 'network error', { code: 'network' });
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const failure = (parseApiError && parseApiError(json)) || {};
      throw new ApiError((json && (json.message || json.error)) || `HTTP ${res.status}`, {
        code: failure.code || (json && json.code) || `http_${res.status}`,
        status: res.status,
        params: failure.params || (json && json.params),
      });
    }
    return json;
  }
  return {
    get: (path) => call('GET', path),
    post: (path, body) => call('POST', path, body),
    put: (path, body) => call('PUT', path, body),
  };
}

// Human message for an error: translated by code when the locale knows it, else the server's English.
export function errorText(t, e) {
  if (!e) return '';
  const key = `errors.${e.code}`;
  const text = t(key, e.params || {});
  return text && text !== key ? text : (e.message || t('errors.generic'));
}
