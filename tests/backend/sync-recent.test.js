import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from '../helpers/ctx.js';
import { createSyncService, RECENT_GAMES } from '../../lib/sync/index.js';

const A = 'https://api.chess.com/pub/player/me/games';
const months = ['2026/07', '2026/08', '2026/09'].map((m) => `${A}/${m}`);
const gameOf = (month, i) => ({
  url: `https://www.chess.com/game/live/${month.replace('/', '')}${String(i).padStart(3, '0')}`,
  pgn: `[Event "x"]\n[Date "${month.replace('/', '.')}.01"]\n\n1. e4 e5 1-0`,
  white: { username: 'me', rating: 1000, result: 'win' }, black: { username: 'foe', rating: 1000, result: 'resigned' },
  time_control: '600', time_class: 'rapid', rated: true, end_time: 1,
});
const fakeFetch = (log) => async (url) => {
  log.push(url);
  const body = url.endsWith('/archives') ? { archives: months }
    : { games: Array.from({ length: 10 }, (_, i) => gameOf(url.split('/games/')[1], i)) };
  return { ok: true, status: 200, headers: new Map(), json: async () => body, text: async () => JSON.stringify(body) };
};

test('recent sync keeps only the 15 newest games and stops fetching older months', async () => {
  const sql = memoryDb();
  const log = [];
  const svc = createSyncService({
    sql, fetch: fakeFetch(log), sleep: async () => {}, getSettings: async () => ({ username: 'me' }),
    userAgent: () => 'test',
  });
  await svc.start('u1', { scope: 'recent', count: 15 });
  await svc.whenIdle('u1');
  const n = sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ?').get('u1').n;
  assert.equal(RECENT_GAMES, 15);
  assert.equal(n, 15, 'exactly 15 games stored');
  assert.equal(log.filter((u) => !u.endsWith('/archives')).length, 2, 'only the two newest months fetched');
});

test('deleteRealGames removes real games, archives and sync state, keeps demo games', async () => {
  const { deleteRealGames } = await import('../../lib/store.js');
  const sql = memoryDb();
  const svc = createSyncService({ sql, fetch: fakeFetch([]), sleep: async () => {}, getSettings: async () => ({ username: 'me' }), userAgent: () => 'test' });
  await svc.start('u1', { scope: 'recent', count: 15 });
  await svc.whenIdle('u1');
  const one = sql.prepare('SELECT * FROM games WHERE user_id = ? LIMIT 1').get('u1');
  const cols = Object.keys(one);
  const demo = { ...one, id: 'demo-1', url: 'https://example.invalid/demo-1', demo: 1 };
  sql.prepare(`INSERT INTO games (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => demo[c] ?? null));
  const r = deleteRealGames(sql, 'u1');
  assert.equal(r.deleted, 15);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ? AND demo = 0').get('u1').n, 0);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ? AND demo = 1').get('u1').n, 1);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM archives WHERE user_id = ?').get('u1').n, 0);
});

test('pruneRealGames keeps the 15 newest real games and never touches demo games', async () => {
  const { pruneRealGames, MAX_REAL_GAMES } = await import('../../lib/store.js');
  const sql = memoryDb();
  const svc = createSyncService({ sql, fetch: fakeFetch([]), sleep: async () => {}, getSettings: async () => ({ username: 'me' }), userAgent: () => 'test' });
  await svc.start('u1', { scope: 'all' });
  await svc.whenIdle('u1');
  const count = () => sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ? AND demo = 0').get('u1').n;
  assert.equal(count(), 30, 'all scope stores 3 months x 10');
  assert.equal(MAX_REAL_GAMES, 15);
  const keepOne = sql.prepare('SELECT id FROM games WHERE user_id = ? ORDER BY end_time ASC, id ASC LIMIT 1').get('u1').id; // an old game
  assert.equal(pruneRealGames(sql, 'u1', { keepIds: [keepOne] }).pruned, 15);
  assert.equal(count(), 15);
  assert.ok(sql.prepare('SELECT 1 FROM games WHERE user_id = ? AND id = ?').get('u1', keepOne), 'protected game kept');
  assert.ok(pruneRealGames(sql, 'u1').pruned <= 1, 'without protection the cap still applies');
  assert.equal(count(), 15);
});

test('recent sync honours count (default 10) and validates it', async () => {
  const sql = memoryDb();
  const mk = () => createSyncService({ sql, fetch: fakeFetch([]), sleep: async () => {}, getSettings: async () => ({ username: 'me' }), userAgent: () => 'test' });
  const svc = mk();
  await svc.start('u1', { scope: 'recent' });
  await svc.whenIdle('u1');
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ?').get('u1').n, 10, 'default is 10');
  await assert.rejects(() => svc.start('u1', { scope: 'recent', count: 16 }), (e) => e.code === 'invalid_count');
  await assert.rejects(() => svc.start('u1', { scope: 'recent', count: 0 }), (e) => e.code === 'invalid_count');
});

test('range sync only stores games inside the dates and at most 15', async () => {
  const sql = memoryDb();
  const hit = [];
  const fetch = async (url) => {
    hit.push(url);
    const reply = (body) => ({ ok: true, status: 200, headers: new Map(), json: async () => body, text: async () => JSON.stringify(body) });
    if (url.endsWith('/archives')) return reply({ archives: months });
    const m = url.split('/games/')[1];
    const base = Date.parse(`${m.replace('/', '-')}-10T12:00:00Z`) / 1000;
    const games = Array.from({ length: 6 }, (_, i) => ({ ...gameOf(m, i), end_time: base + i * 86400 })); // 10th..15th of the month
    return reply({ games });
  };
  const svc = createSyncService({ sql, fetch, sleep: async () => {}, getSettings: async () => ({ username: 'me' }), userAgent: () => 'test' });
  await svc.start('u1', { scope: 'range', from: '2026-08-12', to: '2026-08-14' });
  await svc.whenIdle('u1');
  const rows = sql.prepare('SELECT end_time FROM games WHERE user_id = ?').all('u1');
  assert.equal(rows.length, 3, '12th, 13th and 14th only');
  assert.equal(hit.filter((u) => !u.endsWith('/archives')).length, 1, 'only the August archive is fetched');
  await assert.rejects(() => svc.start('u1', { scope: 'range', from: '2026-09-02', to: '2026-08-01' }), (e) => e.code === 'invalid_range');
  await assert.rejects(() => svc.start('u1', { scope: 'range', from: 'x', to: 'y' }), (e) => e.code === 'invalid_range');
  await assert.rejects(() => svc.start('u1', { scope: 'range', from: '2020-01-01', to: '2026-01-01' }), (e) => e.code === 'invalid_range');
});

test('deleteRealGames onlyUnanalysed keeps analysed games and resets archives so they can be downloaded again', async () => {
  const { deleteRealGames } = await import('../../lib/store.js');
  const sql = memoryDb();
  const svc = createSyncService({ sql, fetch: fakeFetch([]), sleep: async () => {}, getSettings: async () => ({ username: 'me' }), userAgent: () => 'test' });
  await svc.start('u1', { scope: 'recent', count: 10 });
  await svc.whenIdle('u1');
  const ids = sql.prepare('SELECT id FROM games WHERE user_id = ? ORDER BY id').all('u1').map((r) => r.id);
  sql.prepare('UPDATE games SET analyzed = 1 WHERE user_id = ? AND id IN (?, ?)').run('u1', ids[0], ids[1]);
  const r = deleteRealGames(sql, 'u1', { onlyUnanalysed: true });
  assert.equal(r.deleted, 8);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM games WHERE user_id = ?').get('u1').n, 2);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM archives WHERE user_id = ?').get('u1').n, 0);
});
