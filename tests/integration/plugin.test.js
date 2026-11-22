// Integration: lib/index.js apply(ctx) end to end through the fake router (no daemon, no network).
//
// TEST HOOKS expected from lib/index.js (lead implements, documented here):
//   ctx.__engineFactory : () => Engine   — replaces engine.createEngine (CONTRACT 2.2 interface).
//   ctx.__sleep         : (ms) => Promise — optional; replaces the 400 ms / Retry-After waits of the sync service.
//   ctx.__now           : () => number    — optional clock.
// Only synthetic games are used (the Opera Game PGN under made-up player names and ids).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeCtx, fakeFetch } from '../helpers/ctx.js';
import * as plugin from '../../lib/index.js';
import { OPERA_PGN, createScriptedEngine, assertLegalLine, waitFor } from './opera-game.js';

const USER = 'synthetic_user';
const MONTHS = ['2026/09', '2026/10', '2026/11'];
const archiveUrl = (m) => `https://api.chess.com/pub/player/${USER}/games/${m}`;
const GAME_IDS = ['900000001', '900000002', '900000003', '900000004', '900000005', '900000006'];

function syntheticGame(id, month, { asBlack = false, rules = 'chess', name = USER } = {}) {
  const [y, m] = month.split('/');
  const me = { username: asBlack ? 'Opp_Synthetic' : name, rating: 1500, result: 'win' };
  const opp = { username: asBlack ? name : 'Opp_Synthetic', rating: 1480, result: 'checkmated' };
  return {
    url: `https://www.chess.com/game/live/${id}`, pgn: OPERA_PGN, time_class: 'rapid', time_control: '600', rated: true, rules,
    end_time: Math.floor(Date.UTC(Number(y), Number(m) - 1, 15) / 1000),
    white: asBlack ? me : { ...me, username: name }, black: asBlack ? { ...opp, result: 'checkmated' } : opp,
    eco: 'https://www.chess.com/openings/Philidor-Defense',
  };
}

function archivesFetch() {
  return fakeFetch((url) => {
    if (url === `https://api.chess.com/pub/player/${USER}/games/archives`) return { body: { archives: MONTHS.map(archiveUrl) } };
    const i = MONTHS.findIndex((m) => url === archiveUrl(m));
    if (i >= 0) {
      const games = [syntheticGame(GAME_IDS[i * 2], MONTHS[i], { name: i === 0 ? 'Synthetic_User' : USER }), syntheticGame(GAME_IDS[i * 2 + 1], MONTHS[i], { asBlack: true })];
      if (i === 2) games.push(syntheticGame('900000099', MONTHS[i], { rules: 'chess960' }));
      return { body: { games }, headers: { 'content-type': 'application/json', etag: `"e${i}"` } };
    }
    return { status: 404, body: {} };
  });
}

function boot() {
  const fetch = archivesFetch();
  const ctx = createFakeCtx({ fetch });
  const engine = createScriptedEngine();
  ctx.__engineFactory = () => engine;
  ctx.__sleep = async () => {};
  plugin.apply(ctx);
  const api = (method, path, body, opts) => ctx.router().call(method, path, body, opts);
  return { ctx, engine, fetch, api };
}

const SAN_RE = /\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x?[a-h]?[1-8](?:=[QRBN])?)[+#]?/g;

test('plugin end to end: status → settings → sync → analysis → coach → purge → unload', async () => {
  const { ctx, engine, fetch, api } = boot();

  // status, empty
  let r = await api('GET', 'status');
  assert.equal(r.status, 200);
  assert.equal(r.body.configured, false);
  assert.equal(r.body.username, '');
  for (const k of ['engine', 'sync', 'analysis', 'coach', 'onboarding']) assert.ok(r.body[k], `status.${k}`);
  assert.ok(ctx.fetchLog.length === 0, 'no network call before configuration');

  // settings: validation and defaults
  r = await api('GET', 'prefs');
  assert.equal(r.status, 200);
  assert.equal(r.body.settings.username, '');
  assert.equal(r.body.settings.contact, '');
  r = await api('PUT', 'prefs', { enginePath: 'C:\\x\\stockfish.exe' });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'unknown_setting');
  r = await api('PUT', 'prefs', { depthFast: 99 });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'invalid_setting');
  assert.ok(r.body.error && r.body.message);
  r = await api('PUT', 'prefs', { username: 'bad name!' });
  assert.equal(r.status, 400);
  r = await api('PUT', 'prefs', { username: 'Synthetic_User', depthFast: 12, depthDeep: 18, autoAnalyse: false });
  assert.equal(r.status, 200);
  assert.equal(r.body.settings.username, USER, 'stored lowercase');
  r = await api('GET', 'status');
  assert.equal(r.body.configured, true);

  // sync/check then sync/start
  r = await api('POST', 'sync/check', { username: 'Synthetic_User' });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.archives, 3);
  r = await api('POST', 'sync/start', { scope: 'recent' });
  assert.equal(r.status, 200);
  assert.ok(r.body.started);
  await waitFor(async () => (await api('GET', 'status')).body.sync.state === 'idle' && (await api('GET', 'status')).body.sync.games >= 6, 15000, 'sync');
  r = await api('POST', 'games/list', { sort: 'date_desc', page: 1, pageSize: 25 });
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 6, 'variant game is not listed (3 archives x 2 games)');
  assert.ok(r.body.items.every((g) => g.url.startsWith('https://www.chess.com/game/live/')));
  const white = r.body.items.find((g) => g.id === GAME_IDS[0]);
  const black = r.body.items.find((g) => g.id === GAME_IDS[1]);
  assert.equal(white.color, 'white', 'username matched case-insensitively');
  assert.equal(black.color, 'black');
  assert.equal(white.result, 'win');
  assert.equal(black.result, 'loss');
  assert.equal(white.analyzed, false);

  // idempotence: a second sync adds no duplicate; past archives are not downloaded again
  const fetchesAfterFirst = fetch.log.length;
  await api('POST', 'sync/start', { scope: 'recent' });
  await waitFor(async () => (await api('GET', 'status')).body.sync.state === 'idle', 15000, 'second sync');
  r = await api('POST', 'games/list', { page: 1, pageSize: 100 });
  assert.equal(r.body.total, 6, 'no duplicate after re-sync');
  const repeated = fetch.log.slice(fetchesAfterFirst).filter((e) => /games\/2026\/(09|10)$/.test(e.url));
  assert.equal(repeated.length, 0, 'complete past archives never refetched');
  assert.equal(fetch.maxInFlight(), 1, 'never two concurrent chess.com requests');

  // game detail
  r = await api('GET', `games/${GAME_IDS[0]}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.moves.length, 33);
  r = await api('GET', 'games/does-not-exist');
  assert.equal(r.status, 404);
  assert.equal(r.body.code, 'game_not_found');

  // engine/check (fake engine)
  r = await api('POST', 'engine/check', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.ok(r.body.name);

  // analysis
  r = await api('POST', 'analysis/enqueue', { gameIds: [GAME_IDS[0]] });
  assert.equal(r.status, 200);
  assert.equal(r.body.queued, 1);
  const ready = await waitFor(async () => { const x = (await api('GET', `analysis/${GAME_IDS[0]}`)).body; return x.state === 'ready' ? x : (['failed', 'invalid'].includes(x.state) ? Promise.reject(new Error(JSON.stringify(x))) : null); }, 20000, 'analysis ready');
  assert.equal(ready.moves.length, 33);
  for (const m of ready.moves) assertLegalLine(assert, m.fenBefore, m.line, `ply ${m.ply}`);
  r = await api('POST', 'games/list', { analyzed: true, page: 1, pageSize: 25 });
  assert.equal(r.body.total, 1);
  assert.ok(r.body.items[0].accuracy && r.body.items[0].accuracy.mine >= 0 && r.body.items[0].accuracy.mine <= 100);
  r = await api('GET', `analysis/${GAME_IDS[2]}`);
  assert.equal(r.body.state, 'none');
  r = await api('POST', 'analysis/cancel', { gameId: GAME_IDS[3] });
  assert.equal(r.status, 200);

  // coach: not analysed → 409; analysed → request to the agents platform, reply, SAN verification
  r = await api('POST', 'coach/report', { gameId: GAME_IDS[2] });
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'not_analyzed');
  r = await api('POST', 'coach/report', { gameId: GAME_IDS[0] });
  assert.equal(r.status, 200);
  assert.ok(['queued', 'ready'].includes(r.body.state));
  const req = await waitFor(() => ctx.platform.sent.find((m) => m.kind === 'request'), 10000, 'request sent to the coach');
  const payloadText = typeof req.payload === 'string' ? req.payload : JSON.stringify(req.payload);
  assert.ok(payloadText.length <= 24000, 'payload ≤ 24000 chars');
  assert.ok(!/stockfish|C:\\\\|enginePath|hashMb|api[_-]?key/i.test(payloadText), 'payload contains no setting, path or secret');
  assert.ok(!payloadText.includes('"username"') || !payloadText.includes(USER), 'payload does not carry the configured username setting');
  const inPayload = new Set(payloadText.match(SAN_RE) || []);
  const real = [...inPayload].find((s) => /^[KQRBN]/.test(s) || /x/.test(s));
  assert.ok(real, 'payload contains SAN moves');
  const invented = ['Qh8#', 'Kd5', 'Nb1c3x', 'Bh6+'].find((s) => !payloadText.includes(s));
  assert.ok(invented);
  await ctx.platform.answer(`## Lessons\n1. The key move was ${real}. Instead you could have tried ${invented}, but the engine did not suggest it.\nExercise: replay the position.`);
  const report = await waitFor(async () => { const x = (await api('GET', `coach/report/${GAME_IDS[0]}`)).body; return x.state === 'ready' ? x : null; }, 15000, 'coach report');
  assert.ok(report.markdown.includes('Lessons'));
  assert.ok(report.flagged.includes(invented), `invented SAN "${invented}" must be flagged`);
  assert.ok(!report.flagged.includes(real), `payload SAN "${real}" must not be flagged`);
  // ask → polling
  r = await api('POST', 'coach/ask', { gameId: GAME_IDS[0], question: 'Why was 9...b5 a mistake?' });
  assert.equal(r.status, 200);
  assert.ok(r.body.requestId);
  r = await api('POST', 'coach/ask', { question: '' });
  assert.equal(r.status, 400);
  r = await api('GET', 'coach/ask/unknown');
  assert.ok([404, 200].includes(r.status));

  // leftovers of the removed demo feature: purged on status, real games untouched
  const realRows = () => ctx.sql.prepare('SELECT COUNT(*) AS n FROM games WHERE demo = 0').get().n;
  const before = realRows();
  ctx.sql.prepare("INSERT INTO games (user_id, id, url, pgn, time_class, time_control, rated, rules, end_time, white_name, white_rating, white_result, black_name, black_rating, black_result, color, my_rating, opp_name, opp_rating, result, termination, plies, analyzed, demo, created_at) SELECT user_id, 'demo-x', 'demo://game/x', pgn, time_class, time_control, rated, rules, end_time, white_name, white_rating, white_result, black_name, black_rating, black_result, color, my_rating, opp_name, opp_rating, result, termination, plies, analyzed, 1, created_at FROM games WHERE demo = 0 LIMIT 1").run();
  assert.equal(ctx.sql.prepare('SELECT COUNT(*) AS n FROM games WHERE demo = 1').get().n, 1);
  r = await api('GET', 'status');
  assert.equal(r.status, 200);
  assert.equal(r.body.demo, undefined);
  assert.equal(ctx.sql.prepare('SELECT COUNT(*) AS n FROM games WHERE demo = 1').get().n, 0);
  assert.equal(realRows(), before, 'purge leaves real games alone');
  assert.equal((await api('POST', 'demo/load', {})).status === 200, false, 'demo/load no longer exists');

  // network: only api.chess.com
  assert.ok(ctx.fetchLog.length > 0);
  for (const e of ctx.fetchLog) assert.equal(new URL(e.url).hostname, 'api.chess.com', e.url);
  for (const e of ctx.fetchLog) {
    const ua = e.headers['User-Agent'] || e.headers['user-agent'];
    assert.match(ua, /^TimonChessCoach\/\d+\.\d+\.\d+$/, 'generic User-Agent, no contact by default');
  }

  // reset: back to a first launch (no username, no games, onboarding cleared), other users untouched
  assert.ok(ctx.sql.prepare('SELECT COUNT(*) AS n FROM games').get().n > 0);
  r = await api('POST', 'reset', {});
  assert.equal(r.status, 200);
  assert.equal(ctx.sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ?').get('u1').n, 0);
  r = await api('GET', 'status');
  assert.equal(r.body.configured, false);
  assert.equal(r.body.sync.games, 0);
  assert.ok(!r.body.onboarding.completed);

  // unload stops everything
  await ctx.unload();
  assert.equal(engine.state.stopped, true, 'engine stopped on unload');
  assert.equal(engine.state.active, 0);
  const n = ctx.fetchLog.length;
  await new Promise((res) => setTimeout(res, 200));
  assert.equal(ctx.fetchLog.length, n, 'no request after unload');
});

test('routes: auth, methods, no query string, JSON errors', async () => {
  const { ctx, api } = boot();
  ctx.setUser(null);
  for (const [m, p] of [['GET', 'status'], ['GET', 'prefs'], ['POST', 'games/list']]) {
    const r = await api(m, p, m === 'GET' ? undefined : {});
    assert.equal(r.status, 401, `${m} ${p} without session`);
  }
  ctx.setUser('u1');
  const bad = await api('DELETE', 'status');
  assert.equal(bad.status, 405);
  assert.equal(bad.body.code, 'method_not_allowed');
  const patch = await api('PATCH', 'prefs', {});
  assert.equal(patch.status, 405);
  const ct = await api('PUT', 'prefs', { depthFast: 12 }, { headers: { 'content-type': 'text/plain' } });
  assert.equal(ct.status, 415);
  for (const r of ctx.router().routes) assert.ok(!String(r.path).includes('?'), `route ${r.path} has no query string`);
  await ctx.unload();
});

test('two users never see each other data', async () => {
  const { ctx, api } = boot();
  await api('PUT', 'prefs', { username: USER });
  await api('POST', 'sync/start', { scope: 'recent' });
  await waitFor(async () => (await api('POST', 'games/list', {})).body.total >= 6, 15000, 'sync u1');
  ctx.setUser('u2');
  let r = await api('POST', 'games/list', {});
  assert.equal(r.body.total, 0);
  r = await api('GET', 'status');
  assert.equal(r.body.configured, false);
  r = await api('GET', `games/${GAME_IDS[0]}`);
  assert.equal(r.status, 404);
  r = await api('GET', `analysis/${GAME_IDS[0]}`);
  assert.ok(['none'].includes(r.body.state) || r.status === 404);
  await ctx.unload();
});

test('sync errors are explicit: 404 user, 429 rate limit', async () => {
  const fetch = fakeFetch((url) => {
    if (url.includes('/ghost_user/')) return { status: 404, body: { message: 'not found' } };
    return { status: 429, headers: { 'retry-after': '1' }, body: {} };
  });
  const ctx = createFakeCtx({ fetch });
  ctx.__engineFactory = () => createScriptedEngine();
  ctx.__sleep = async () => {};
  plugin.apply(ctx);
  const api = (m, p, b) => ctx.router().call(m, p, b);
  let r = await api('POST', 'sync/check', { username: 'ghost_user' });
  assert.equal(r.body.ok, false);
  assert.equal(r.body.code, 'user_not_found');
  assert.ok(r.body.error);
  r = await api('POST', 'sync/check', { username: 'x' });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'invalid_username');
  await api('PUT', 'prefs', { username: 'busy_user' });
  r = await api('POST', 'sync/start', { scope: 'recent' });
  assert.equal(r.status, 200);
  const st = await waitFor(async () => { const s = (await api('GET', 'status')).body.sync; return s.state === 'rate_limited' ? s : null; }, 15000, 'rate_limited state');
  assert.ok(st.error, 'readable message');
  assert.equal(fetch.maxInFlight(), 1);
  await ctx.unload();
});

test('after a sync the newest games are queued for analysis once, with no timer', async () => {
  const { ctx, api } = boot();
  await api('PUT', 'prefs', { username: USER });
  await api('POST', 'sync/start', { scope: 'recent' });
  await waitFor(async () => (await api('POST', 'games/list', {})).body.total >= 6, 15000, 'sync');
  await waitFor(async () => {
    const r = await api('POST', 'games/list', {});
    return r.body.items.some((g) => g.analyzed);
  }, 20000, 'auto analysis started');
  await ctx.unload();
});

test('autoAnalyse off: a sync does not queue any analysis', async () => {
  const { ctx, api } = boot();
  await api('PUT', 'prefs', { username: USER, autoAnalyse: false });
  await api('POST', 'sync/start', { scope: 'recent' });
  await waitFor(async () => (await api('POST', 'games/list', {})).body.total >= 6, 15000, 'sync');
  await new Promise((r) => setTimeout(r, 400));
  const r = await api('POST', 'games/list', {});
  assert.ok(!r.body.items.some((g) => g.analyzed), 'nothing analysed');
  await ctx.unload();
});

test('a new visitor links their own chess.com username, stored locally per user', async () => {
  const seen = [];
  const fetch = fakeFetch((url) => {
    seen.push(url);
    const m = /\/player\/([^/]+)\/games\/archives$/.exec(url);
    if (m) return { body: { archives: m[1] === 'ghost' ? [] : [archiveUrl(MONTHS[0]).replace(/player\/[^/]+/, `player/${m[1]}`)] } };
    return { body: { games: [] } };
  });
  const ctx = createFakeCtx({ fetch, user: 'visitor-a' });
  ctx.__engineFactory = () => createScriptedEngine();
  ctx.__sleep = async () => {};
  plugin.apply(ctx);
  const api = (m, p, b) => ctx.router().call(m, p, b);

  // brand new: nothing configured, no username anywhere
  let r = await api('GET', 'status');
  assert.equal(r.body.configured, false);
  assert.equal(r.body.username, '');
  assert.equal(r.body.onboarding.completed, false);

  // verify then save (what the profile page does)
  r = await api('POST', 'sync/check', { username: 'Alice_Chess' });
  assert.equal(r.body.ok, true);
  assert.equal(r.body.username, 'alice_chess');
  r = await api('PUT', 'prefs', { username: 'Alice_Chess' });
  assert.equal(r.status, 200);
  assert.equal(r.body.settings.username, 'alice_chess');
  r = await api('GET', 'status');
  assert.equal(r.body.configured, true);
  assert.equal(r.body.username, 'alice_chess');

  // it is stored locally, in the plugin database, under this user only
  const row = ctx.sql.prepare("SELECT user_id, value FROM kv WHERE key = 'setting:username'").all();
  assert.deepEqual(row.map((x) => [x.user_id, JSON.parse(x.value)]), [['visitor-a', 'alice_chess']]);

  // a second visitor starts empty and links another account
  ctx.setUser('visitor-b');
  r = await api('GET', 'status');
  assert.equal(r.body.configured, false);
  await api('PUT', 'prefs', { username: 'Bob99' });
  r = await api('GET', 'status');
  assert.equal(r.body.username, 'bob99');
  ctx.setUser('visitor-a');
  r = await api('GET', 'status');
  assert.equal(r.body.username, 'alice_chess', 'the first visitor is unaffected');

  // each visitor's sync reads their own account
  await api('POST', 'sync/start', { scope: 'recent' });
  await waitFor(async () => seen.some((u) => u.includes('/player/alice_chess/')), 5000, 'alice sync');
  assert.ok(!seen.some((u) => u.includes('/player/bob99/')), 'visitor-a never reads visitor-b account');

  // bad input is refused
  r = await api('PUT', 'prefs', { username: 'bad name!' });
  assert.equal(r.status, 400);
  await ctx.unload();
});
