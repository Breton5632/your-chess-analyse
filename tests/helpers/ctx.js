// Shared fake plugin context for `node --test` (owned by the lead, see docs/CONTRACT.md §10).
// Same surface as the parts of Timon's `ctx` the plugin uses: sql, settings, user(), router(),
// fetch (logged), realtime, agents, messages, backends, notify, effect. No daemon, no network.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const MIGRATIONS_DIR = join(ROOT, 'migrations');

export function migrationFiles(dir = MIGRATIONS_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{3}-.+\.sql$/.test(f)).sort();
}

/** In-memory SQLite with ctx.sql's surface. `upTo` = apply migrations 1..upTo (default all). */
export function memoryDb({ upTo = Infinity, dir = MIGRATIONS_DIR } = {}) {
  const db = new DatabaseSync(':memory:');
  const sql = {
    raw: db,
    prepare: (s) => db.prepare(s),
    exec: (s) => db.exec(s),
    transaction(fn) {
      db.exec('BEGIN');
      try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    applied: 0,
  };
  sql.migrate = (to = Infinity) => {
    for (const f of migrationFiles(dir)) {
      const n = Number(f.slice(0, 3));
      if (n <= sql.applied || n > to) continue;
      sql.transaction(() => db.exec(readFileSync(join(dir, f), 'utf8')));
      sql.applied = n;
    }
    return sql;
  };
  return sql.migrate(upTo);
}

/** Minimal Express-like router: get/post/put/patch/delete/all/use + call() to drive it in tests. */
export function fakeRouter() {
  const routes = [];
  const add = (method) => (path, ...handlers) => { routes.push({ method, path, keys: [], re: compile(path), handlers }); return router; };
  function compile(path) {
    const keys = [];
    const re = new RegExp('^' + path.replace(/\/+$/, '').replace(/:([A-Za-z0-9_]+)/g, (_m, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    re.keys = keys;
    return re;
  }
  const router = {
    routes,
    get: add('GET'), post: add('POST'), put: add('PUT'), patch: add('PATCH'), delete: add('DELETE'), all: add('ALL'),
    use: (...args) => { const handlers = args.filter((a) => typeof a === 'function'); routes.push({ method: 'USE', path: '', re: /.*/, handlers }); return router; },
    /** Calls the router like the UI proxy would. Returns { status, body, headers }. */
    async call(method, path, body, { headers = {}, onUser } = {}) {
      onUser?.();
      const url = path.startsWith('/') ? path : `/${path}`;
      const [pathname] = url.split('?');
      const res = fakeRes();
      const req = {
        method, url, originalUrl: url, path: pathname, params: {}, query: {},
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? (method === 'GET' ? undefined : {}) : body,
      };
      for (const r of routes) {
        if (r.method !== 'USE' && r.method !== 'ALL' && r.method !== method) continue;
        const m = r.method === 'USE' ? [] : pathname.match(r.re);
        if (!m) continue;
        req.params = Object.fromEntries((r.re.keys || []).map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        let goNext = false;
        for (const h of r.handlers) {
          goNext = false;
          await h(req, res, (err) => { if (err) throw err; goNext = true; });
          if (res.finished) break;
          if (!goNext) break;
        }
        if (res.finished) break;
        if (!goNext && r.method !== 'USE') break;
      }
      if (!res.finished) res.status(404).json({ error: 'not found', code: 'not_found' });
      return { status: res.statusCode, body: res.body, headers: res.headers };
    },
  };
  return router;
}

function fakeRes() {
  const res = {
    statusCode: 200, body: undefined, headers: {}, finished: false,
    status(c) { res.statusCode = c; return res; },
    set(k, v) { res.headers[String(k).toLowerCase()] = v; return res; },
    setHeader(k, v) { return res.set(k, v); },
    json(b) { res.body = JSON.parse(JSON.stringify(b ?? null)); res.finished = true; return res; },
    send(b) { res.body = b; res.finished = true; return res; },
    end() { res.finished = true; return res; },
  };
  return res;
}

/** fetch double: `responder(url, init)` returns { status, headers, body } or a Response; every call is logged. */
export function fakeFetch(responder = () => ({ status: 404, body: {} })) {
  const log = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fn = async (url, init = {}) => {
    inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
    log.push({ url: String(url), method: init.method || 'GET', headers: { ...(init.headers || {}) }, at: Date.now() });
    try {
      const r = await responder(String(url), init);
      if (r instanceof Response) return r;
      const status = r.status ?? 200;
      const body = r.body === undefined || status === 304 ? null : typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
      return new Response(body, { status, headers: r.headers || { 'content-type': 'application/json' } });
    } finally { inFlight -= 1; }
  };
  fn.log = log;
  fn.maxInFlight = () => maxInFlight;
  return fn;
}

/** Fake agents/messages/backends with the shapes of the Timon SDK (subset used by the coach). */
export function fakeAgentsPlatform({ backends = defaultBackends(), conflict = [] } = {}) {
  const agents = new Map(conflict.map((n) => [n.toLowerCase(), { name: n, mine: false, role: 'coder' }]));
  const inboxes = new Map();
  const sent = [];
  let nextId = 1;
  const api = {
    agents: {
      async list() { return [...agents.values()].map((a) => ({ ...a })); },
      async create(input) {
        const k = input.name.toLowerCase();
        if (agents.has(k)) throw Object.assign(new Error('conflict'), { code: 'conflict' });
        if (!input.role) throw Object.assign(new Error('role required'), { code: 'invalid' });
        const a = { ...input, mine: true };
        agents.set(k, a);
        return { ...a };
      },
      async update(name, patch) {
        const a = agents.get(name.toLowerCase());
        if (!a || !a.mine) throw Object.assign(new Error('not found'), { code: 'not_found' });
        Object.assign(a, patch);
        return { ...a };
      },
    },
    messages: {
      async send({ to, kind = 'msg', payload, as, inReplyTo }) {
        const msg = { id: String(nextId++), from: as || 'plugin:chess-coach', to, kind, payload, inReplyTo, status: 'pending', createdAt: new Date().toISOString() };
        sent.push(msg);
        if (!inboxes.has(to)) inboxes.set(to, []);
        inboxes.get(to).push(msg);
        return { id: msg.id };
      },
      async recv(agent, { status = 'pending', limit = 50 } = {}) {
        return (inboxes.get(agent) || []).filter((m) => m.status === status).slice(0, limit).map((m) => ({ ...m }));
      },
      async pick(id) { for (const box of inboxes.values()) for (const m of box) if (m.id === String(id)) m.status = 'picked'; return true; },
      async reply(id, payload) {
        const orig = sent.find((m) => m.id === String(id));
        return api.messages.send({ to: orig.from, kind: 'response', payload, as: orig.to, inReplyTo: orig.id });
      },
    },
    backends: { async list() { return backends; } },
    /** Test helper: the coach answers the n-th (default last) request it received. */
    async answer(payload, { requestId } = {}) {
      const req = requestId ? sent.find((m) => m.id === String(requestId)) : [...sent].reverse().find((m) => m.kind === 'request');
      return api.messages.send({ to: req.from, kind: 'response', payload, as: req.to, inReplyTo: req.id });
    },
    sent, agentsMap: agents,
  };
  return api;
}

export function defaultBackends() {
  return {
    defaultBackend: 'claude',
    backends: [{ id: 'claude', label: 'Claude', signedIn: true, defaultModel: 'model-default', models: [{ slug: 'model-default', tier: 'standard' }, { slug: 'model-top', tier: 'flagship', contextWindow: 200000 }] }],
  };
}

/**
 * createFakeCtx({ user, settings, fetch, migrations })
 * - `ctx.setUser(id|null)` switches the caller (ctx.user() → { id } | undefined).
 * - `ctx.published` logs realtime events; `ctx.fetchLog` logs outbound calls; `ctx.notifications` logs notify.
 * - `ctx.runEffects()` / `ctx.unload()` run and dispose registered effects.
 */
export function createFakeCtx({ user = 'u1', settings = {}, fetch, upTo, agentsPlatform } = {}) {
  let current = user;
  const store = { ...settings };
  const effects = [];
  const disposers = [];
  const published = [];
  const notifications = [];
  const router = fakeRouter();
  const platform = agentsPlatform || fakeAgentsPlatform();
  const fetchFn = fetch || fakeFetch();
  const ctx = {
    id: 'chess-coach',
    sql: memoryDb({ upTo }),
    user: () => (current ? { id: current, name: current } : undefined),
    setUser: (id) => { current = id; },
    settings: {
      async get(k) { return store[k]; },
      async set(k, v) { store[k] = v; },
      _store: store,
    },
    router: () => router,
    fetch: fetchFn,
    fetchLog: fetchFn.log,
    realtime: { publish(topic, payload, { ownerUserId } = {}) { if (!ownerUserId) throw new Error('ownerUserId required'); published.push({ topic, payload, ownerUserId }); } },
    published,
    notify: { async report(text, opts) { notifications.push({ kind: 'report', text, opts }); }, async alert(text, opts) { notifications.push({ kind: 'alert', text, opts }); } },
    notifications,
    agents: platform.agents,
    messages: platform.messages,
    backends: platform.backends,
    platform,
    storage: { dir: null },
    effect(fn) { effects.push(fn); const d = fn(); if (typeof d === 'function') disposers.push(d); return () => { if (typeof d === 'function') d(); }; },
    async unload() { while (disposers.length) { const d = disposers.pop(); await d(); } },
    log: { info() {}, warn() {}, error() {} },
  };
  return ctx;
}
