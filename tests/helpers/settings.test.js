import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { validateSettings, getSettings, putSettings, effectiveThreads, userAgent, HttpError, sendError, DEFAULTS } from '../../lib/settings.js';
import { fakeRouter } from './ctx.js';

function ctxWith(manifest = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE kv (user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT, PRIMARY KEY (user_id, key))');
  const sql = { prepare: (s) => db.prepare(s), transaction(fn) { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
  return { sql, settings: { get: async (k) => manifest[k] } };
}

test('defaults are neutral', async () => {
  const s = await getSettings(ctxWith(), 'u1');
  assert.deepEqual(s, { ...DEFAULTS });
  assert.equal(s.username, '');
  assert.equal(s.contact, '');
});

test('bounds are enforced with explicit 400s', () => {
  for (const [k, v] of [['depthFast', 9], ['depthFast', 21], ['depthDeep', 29], ['threads', 17], ['hashMb', 8], ['hashMb', 1.5], ['language', 'de'], ['username', 'a!'], ['contact', 'x(y)']]) {
    assert.throws(() => validateSettings({ [k]: v }), (e) => e instanceof HttpError && e.status === 400 && e.code === 'invalid_setting' && e.params.key === k, `${k}=${v}`);
  }
  assert.throws(() => validateSettings({ enginePath: 'x' }), (e) => e.code === 'unknown_setting');
  assert.throws(() => validateSettings({ depthFast: 18, depthDeep: 16 }), (e) => e.params.key === 'depthDeep');
  assert.deepEqual(validateSettings({ username: 'Some_User', threads: '4' }), { username: 'some_user', threads: 4 });
});

test('per-user overrides on top of manifest values, isolated by user', async () => {
  const ctx = ctxWith({ depthFast: 12, hashMb: 999999 });
  assert.equal((await getSettings(ctx, 'u1')).depthFast, 12);
  assert.equal((await getSettings(ctx, 'u1')).hashMb, 64, 'invalid manifest value falls back');
  await putSettings(ctx, 'u1', { username: 'PlayerOne', depthFast: 16 });
  const a = await getSettings(ctx, 'u1');
  const b = await getSettings(ctx, 'u2');
  assert.equal(a.username, 'playerone');
  assert.equal(a.depthFast, 16);
  assert.equal(b.username, '');
  assert.equal(b.depthFast, 12);
  await assert.rejects(putSettings(ctx, null, { depthFast: 12 }), (e) => e.status === 401);
});

test('threads auto and user agent', () => {
  assert.equal(effectiveThreads(0, 16), 4);
  assert.equal(effectiveThreads(0, 2), 1);
  assert.equal(effectiveThreads(0, 1), 1);
  assert.equal(effectiveThreads(6, 2), 6);
  assert.equal(userAgent('1.0.0'), 'TimonChessCoach/1.0.0');
  assert.equal(userAgent('1.0.0', 'ops@example.org'), 'TimonChessCoach/1.0.0 (ops@example.org)');
});

test('sendError writes the contract body', async () => {
  const r = fakeRouter();
  r.get('/x', (_q, res) => sendError(res, new HttpError(409, 'busy', 'Busy.', { a: 1 })));
  r.get('/y', (_q, res) => sendError(res, new Error('secret detail')));
  assert.deepEqual(await r.call('GET', '/x'), { status: 409, body: { error: 'Busy.', code: 'busy', message: 'Busy.', params: { a: 1 } }, headers: {} });
  const y = await r.call('GET', '/y');
  assert.equal(y.status, 500);
  assert.equal(y.body.code, 'internal_error');
  assert.equal(y.body.error, 'Internal error.');
});
