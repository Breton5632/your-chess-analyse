// Realtime publisher (docs/CONTRACT.md §7): invalidation signals to the owner account only,
// throttled to at most `perSecond` events per (user, topic), keeping the latest payload (trailing edge).

const TOPIC_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function createPublisher(ctx, { perSecond = 4, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const minGap = 1000 / perSecond;
  const slots = new Map(); // key → { last, timer, payload }
  let closed = false;

  function send(userId, topic, payload) {
    if (closed || typeof ctx.realtime?.publish !== 'function') return;
    try { ctx.realtime.publish(topic, payload ?? {}, { ownerUserId: String(userId) }); } catch { /* a lost signal only delays a refresh */ }
  }

  function publish(userId, topic, payload) {
    if (!userId || !TOPIC_RE.test(topic)) return;
    const key = `${userId}\u0000${topic}`;
    const slot = slots.get(key) || { last: -Infinity, timer: null, payload: null };
    slots.set(key, slot);
    const t = now();
    // Terminal events (…done / …updated) are never delayed behind progress events.
    const urgent = !topic.endsWith('.progress');
    if (urgent || (t - slot.last >= minGap && !slot.timer)) {
      if (slot.timer) { clearTimer(slot.timer); slot.timer = null; }
      slot.last = t;
      send(userId, topic, payload);
      return;
    }
    slot.payload = payload;
    if (!slot.timer) {
      slot.timer = setTimer(() => {
        slot.timer = null;
        slot.last = now();
        send(userId, topic, slot.payload);
      }, Math.max(0, minGap - (t - slot.last)));
      slot.timer?.unref?.();
    }
  }

  publish.close = () => {
    closed = true;
    for (const s of slots.values()) if (s.timer) clearTimer(s.timer);
    slots.clear();
  };
  return publish;
}
