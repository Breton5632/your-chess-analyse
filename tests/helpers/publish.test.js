import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublisher } from '../../lib/publish.js';

function harness() {
  let t = 0;
  const timers = [];
  const sent = [];
  const ctx = { realtime: { publish: (topic, payload, { ownerUserId }) => sent.push({ topic, payload, ownerUserId }) } };
  const pub = createPublisher(ctx, {
    now: () => t,
    setTimer: (fn, ms) => { const h = { fn, at: t + ms, done: false }; timers.push(h); return h; },
    clearTimer: (h) => { h.done = true; },
  });
  const advance = (ms) => { t += ms; for (const h of timers) if (!h.done && h.at <= t) { h.done = true; h.fn(); } };
  return { pub, sent, advance };
}

test('progress events are throttled to 4/s with the latest payload kept', () => {
  const { pub, sent, advance } = harness();
  for (let i = 0; i < 20; i++) { pub('u1', 'analysis.progress', { done: i }); advance(50); }
  advance(1000);
  assert.ok(sent.length <= 6, `sent ${sent.length}`);
  assert.equal(sent.at(-1).payload.done, 19);
  assert.ok(sent.every((s) => s.ownerUserId === 'u1'));
});

test('terminal events go out at once; users and topics are independent; bad topics dropped', () => {
  const { pub, sent } = harness();
  pub('u1', 'analysis.progress', { done: 1 });
  pub('u1', 'analysis.done', { state: 'ready' });
  pub('u2', 'analysis.progress', { done: 1 });
  pub('u1', 'Bad Topic', {});
  pub(null, 'sync.done', {});
  assert.deepEqual(sent.map((s) => `${s.ownerUserId}:${s.topic}`), ['u1:analysis.progress', 'u1:analysis.done', 'u2:analysis.progress']);
});
