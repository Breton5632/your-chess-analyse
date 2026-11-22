// Coach service (docs/CONTRACT.md §8): reports and questions go to the plugin agent
// `chess-plugin.coach` as requests written in the name of `chess-plugin.relay`; replies are read from the
// relay inbox (ctx.messages.recv) while the UI polls. The queue progresses during those polls.
import { randomBytes } from 'node:crypto';
import { HttpError } from '../settings.js';
import { getGameRow, toSummary, readAnalysis, demoScope, nowIso, getKvJson, setKvJson, delKv, parseJson } from '../store.js';
import { COACH_NAME, RELAY_NAME, TIMEOUT_MSG, ensureAgents as ensure, sdkError, PERMISSION_MSG } from './agents.js';
import { buildGamePayload, renderMessage } from './payload.js';
import { checkSan } from './sancheck.js';

export const REPLY_TIMEOUT_MS = 120_000;
export const LATE_REPLY_MS = 60 * 60_000;
export const WINDOW_MS = 10 * 60_000;
export const WINDOW_MAX = 20;
export const MAX_QUESTION = 2000;
export const MAX_BATCH = 50;
const MAX_REPLY = 20_000;
const HISTORY_TURNS = 6;

const textOf = (payload) => {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const v = payload.text ?? payload.markdown ?? payload.answer ?? payload.content ?? payload.message;
    return typeof v === 'string' ? v : JSON.stringify(payload);
  }
  return '';
};

export function createCoachService({ ctx, sql, analysis, getSettings, now = Date.now, publish, log = {} }) {
  const iso = () => nowIso(now());
  const pub = (userId, payload) => {
    try {
      if (publish) publish(userId, 'coach.updated', payload);
      else ctx.realtime?.publish?.('coach.updated', payload, { ownerUserId: userId });
    } catch (e) { log.warn?.('coach publish failed', e); }
  };
  const locks = new Map();
  const withLock = (userId, fn) => {
    const prev = locks.get(userId) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    locks.set(userId, next);
    next.finally(() => { if (locks.get(userId) === next) locks.delete(userId); }).catch(() => {});
    return next;
  };

  const ensureAgents = () => ensure(ctx, sql, iso);

  // ---- data access -------------------------------------------------------------------------
  const analysisState = (userId, gameId) => sql.prepare('SELECT state FROM analyses WHERE user_id = ? AND game_id = ?').get(userId, gameId)?.state || null;
  const isAnalysed = (userId, gameId) => ['ready', 'partial'].includes(analysisState(userId, gameId));

  async function gameData(userId, gameId) {
    const row = getGameRow(sql, userId, gameId);
    if (!row) return null;
    let a = readAnalysis(sql, userId, gameId);
    if ((!a || !a.moves) && typeof analysis?.getAnalysis === 'function') {
      try { a = await analysis.getAnalysis(userId, gameId); } catch { a = null; }
    }
    return { summary: toSummary(row), analysis: a && a.moves ? a : null };
  }

  function recentAnalysed(userId, ids) {
    const uid = String(userId);
    let rows;
    if (ids) {
      rows = ids.map((id) => getGameRow(sql, uid, id)).filter(Boolean);
    } else {
      const scope = demoScope(sql, uid);
      rows = sql.prepare(`SELECT g.id FROM games g JOIN analyses a ON a.user_id = g.user_id AND a.game_id = g.id
        WHERE g.user_id = ? AND a.state IN ('ready', 'partial')${scope ? ' AND ' + scope : ''} ORDER BY g.end_time DESC LIMIT 20`).all(uid)
        .map((r) => getGameRow(sql, uid, r.id));
    }
    return rows.filter((r) => ['ready', 'partial'].includes(r.a_state)).map(toSummary);
  }

  // ---- rate limit --------------------------------------------------------------------------
  function sendsInWindow(userId) {
    const cut = nowIso(now() - WINDOW_MS);
    const a = sql.prepare('SELECT sent_at AS t FROM reports WHERE user_id = ? AND sent_at > ?').all(userId, cut).map((r) => r.t);
    const b = sql.prepare("SELECT created_at AS t FROM chat_messages WHERE user_id = ? AND role = 'user' AND created_at > ?").all(userId, cut).map((r) => r.t);
    return [...a, ...b].sort();
  }
  const rateWait = (userId) => {
    const sends = sendsInWindow(userId);
    if (sends.length < WINDOW_MAX) return 0;
    return Math.max(1, Math.ceil((Date.parse(sends[sends.length - WINDOW_MAX]) + WINDOW_MS - now()) / 1000));
  };

  // ---- sending -----------------------------------------------------------------------------
  async function send(text) {
    try {
      return await ctx.messages.send({ to: COACH_NAME, kind: 'request', payload: text, as: RELAY_NAME });
    } catch (e) { throw sdkError(e); }
  }

  async function sendReportRow(row) {
    const userId = row.user_id;
    const settings = await getSettings(userId);
    const d = await gameData(userId, row.game_id);
    if (!d) throw new HttpError(404, 'game_not_found', 'Game not found.');
    const built = buildGamePayload({ ...d, language: settings.language });
    await ensureAgents();
    const sent = await send(renderMessage({ kind: 'game', json: built.json }));
    sql.prepare("UPDATE reports SET state = 'sent', msg_id = ?, sent_at = ?, updated_at = ?, language = ? WHERE id = ?")
      .run(sent?.id != null ? String(sent.id) : null, iso(), iso(), settings.language, row.id);
  }

  // ---- queue progress (called on every poll) -----------------------------------------------
  async function allowedSet(userId, kind, gameId) {
    if (!gameId) return new Set();
    const d = await gameData(userId, gameId);
    return d ? buildGamePayload({ ...d }).allowed : new Set();
  }

  async function resolveReplies() {
    const lateCut = nowIso(now() - LATE_REPLY_MS);
    const reports = sql.prepare("SELECT * FROM reports WHERE msg_id IS NOT NULL AND (state = 'sent' OR (state = 'timeout' AND sent_at > ?))").all(lateCut);
    const chats = sql.prepare("SELECT * FROM chat_messages WHERE role = 'assistant' AND msg_id IS NOT NULL AND (state = 'pending' OR (state = 'timeout' AND created_at > ?))").all(lateCut);
    if (!reports.length && !chats.length) return;
    let inbox = [];
    try { inbox = (await ctx.messages.recv(RELAY_NAME, { status: 'pending', limit: 200 })) || []; } catch { return; }
    for (const msg of inbox) {
      if (String(msg?.from || '').toLowerCase() !== COACH_NAME) continue;
      const key = msg.inReplyTo != null ? String(msg.inReplyTo) : null;
      let report = key ? reports.find((r) => String(r.msg_id) === key) : null;
      let chat = !report && key ? chats.find((c) => String(c.msg_id) === key) : null;
      if (!report && !chat && key == null && reports.length + chats.length === 1) { report = reports[0]; chat = chats[0]; }
      if (!report && !chat) continue;
      const text = textOf(msg.payload).trim().slice(0, MAX_REPLY);
      if (report) {
        reports.splice(reports.indexOf(report), 1);
        if (!text) {
          sql.prepare("UPDATE reports SET state = 'error', error = ?, updated_at = ? WHERE id = ?").run('The coach sent an empty answer.', iso(), report.id);
        } else {
          const flagged = checkSan(text, await allowedSet(report.user_id, report.kind, report.game_id));
          sql.prepare("UPDATE reports SET state = 'ready', markdown = ?, flagged_json = ?, error = NULL, updated_at = ? WHERE id = ?").run(text, JSON.stringify(flagged), iso(), report.id);
        }
        pub(report.user_id, { kind: 'report', ...(report.game_id ? { gameId: report.game_id } : {}) });
      } else if (chat) {
        chats.splice(chats.indexOf(chat), 1);
        if (!text) {
          sql.prepare("UPDATE chat_messages SET state = 'error', content = ? WHERE id = ?").run('The coach sent an empty answer.', chat.id);
        } else {
          const flagged = checkSan(text, await allowedSet(chat.user_id, 'game', chat.game_id));
          sql.prepare("UPDATE chat_messages SET state = 'done', content = ?, flagged_json = ? WHERE id = ?").run(text, JSON.stringify(flagged), chat.id);
        }
        pub(chat.user_id, { kind: 'ask', requestId: chat.request_id, ...(chat.game_id ? { gameId: chat.game_id } : {}) });
      }
      try { if (typeof ctx.messages.pick === 'function') await ctx.messages.pick(msg.id); } catch { /* already picked */ }
    }
  }

  function applyTimeouts(userId) {
    const cut = nowIso(now() - REPLY_TIMEOUT_MS);
    const r = sql.prepare("UPDATE reports SET state = 'timeout', error = ?, updated_at = ? WHERE user_id = ? AND state = 'sent' AND sent_at < ?").run(TIMEOUT_MSG, iso(), userId, cut);
    const c = sql.prepare("UPDATE chat_messages SET state = 'timeout', content = ? WHERE user_id = ? AND role = 'assistant' AND state = 'pending' AND created_at < ?").run(TIMEOUT_MSG, userId, cut);
    if (Number(r.changes) + Number(c.changes) > 0) pub(userId, { kind: 'report' });
  }

  async function advanceQueue(userId) {
    const inFlight = sql.prepare("SELECT 1 FROM reports WHERE user_id = ? AND state = 'sent' LIMIT 1").get(userId);
    if (inFlight) return;
    const row = sql.prepare("SELECT * FROM reports WHERE user_id = ? AND state = 'queued' ORDER BY id LIMIT 1").get(userId);
    if (!row || rateWait(userId) > 0) return;
    try {
      await sendReportRow(row);
    } catch (e) {
      const msg = e instanceof HttpError ? e.message : 'The coach could not be reached.';
      sql.prepare("UPDATE reports SET state = 'error', error = ?, updated_at = ? WHERE id = ?").run(msg, iso(), row.id);
      pub(userId, { kind: 'report', ...(row.game_id ? { gameId: row.game_id } : {}) });
      if (!(e instanceof HttpError)) log.warn?.('coach send failed', e);
    }
  }

  /** Resolves replies, applies timeouts, sends the next queued report. Serialised per user. */
  function pump(userId) {
    userId = String(userId);
    return withLock(userId, async () => {
      await resolveReplies();
      applyTimeouts(userId);
      await advanceQueue(userId);
    });
  }

  // ---- reports -----------------------------------------------------------------------------
  const latestReport = (userId, kind, gameId) => sql.prepare("SELECT * FROM reports WHERE user_id = ? AND kind = 'game' AND game_id = ? ORDER BY id DESC LIMIT 1").get(userId, gameId) || null;

  function insertReport(userId, kind, gameId) {
    const t = iso();
    const r = sql.prepare("INSERT INTO reports (user_id, game_id, kind, state, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?)").run(userId, gameId, kind, t, t);
    return Number(r.lastInsertRowid);
  }

  const queuedCount = (userId) => Number(sql.prepare("SELECT COUNT(*) AS n FROM reports WHERE user_id = ? AND state IN ('queued', 'sent')").get(userId).n);

  function reportOut(row) {
    if (!row) return { state: 'none', markdown: '', flagged: [], createdAt: null };
    return {
      state: row.state,
      markdown: row.state === 'ready' ? row.markdown || '' : '',
      flagged: row.state === 'ready' ? parseJson(row.flagged_json, []) : [],
      createdAt: row.created_at,
      ...(row.state === 'timeout' || row.state === 'error' ? { error: row.error || (row.state === 'timeout' ? TIMEOUT_MSG : 'The report failed.') } : {}),
    };
  }

  function queueOne(userId, gameId, force) {
    const existing = latestReport(userId, 'game', gameId);
    if (existing && !force && existing.state === 'ready') return { state: 'ready', reportId: existing.id };
    if (existing && (existing.state === 'queued' || existing.state === 'sent')) return { state: 'queued', reportId: existing.id };
    return { state: 'queued', reportId: insertReport(userId, 'game', gameId) };
  }

  async function report(userId, { gameId, gameIds, force = false } = {}) {
    userId = String(userId);
    const single = gameIds === undefined;
    let ids;
    if (single) {
      if (typeof gameId !== 'string' && typeof gameId !== 'number') throw new HttpError(400, 'invalid_param', 'gameId is required.', { key: 'gameId' });
      ids = [String(gameId)];
    } else {
      if (!Array.isArray(gameIds) || !gameIds.length || gameIds.length > MAX_BATCH) throw new HttpError(400, 'invalid_param', `gameIds must list 1 to ${MAX_BATCH} games.`, { key: 'gameIds', min: 1, max: MAX_BATCH });
      ids = [...new Set(gameIds.map(String))];
    }
    for (const id of ids) {
      if (!getGameRow(sql, userId, id)) throw new HttpError(404, 'game_not_found', 'Game not found.', { gameId: id });
      if (!isAnalysed(userId, id)) throw new HttpError(409, 'not_analyzed', 'Analyse this game before asking the coach for a report.', { gameId: id });
    }
    if (queuedCount(userId) + ids.length > MAX_BATCH) throw new HttpError(429, 'rate_limited', 'Too many reports are waiting. Let the current ones finish first.');
    const outs = ids.map((id) => queueOne(userId, id, force === true));
    await pump(userId);
    if (single) return outs[0];
    return { state: outs.every((o) => o.state === 'ready') ? 'ready' : 'queued', reportIds: outs.map((o) => o.reportId) };
  }

  async function getReport(userId, gameId) {
    userId = String(userId);
    await pump(userId);
    return reportOut(latestReport(userId, 'game', String(gameId)));
  }

  // ---- questions ---------------------------------------------------------------------------
  async function ask(userId, { gameId, question } = {}) {
    userId = String(userId);
    const q = typeof question === 'string' ? question.trim() : '';
    if (!q || q.length > MAX_QUESTION) throw new HttpError(400, 'invalid_param', `The question must be 1 to ${MAX_QUESTION} characters.`, { key: 'question', min: 1, max: MAX_QUESTION });
    let gid = null;
    if (gameId !== undefined && gameId !== null && gameId !== '') {
      gid = String(gameId);
      if (!getGameRow(sql, userId, gid)) throw new HttpError(404, 'game_not_found', 'Game not found.', { gameId: gid });
    }
    await pump(userId);
    const wait = rateWait(userId);
    if (wait > 0) throw new HttpError(429, 'rate_limited', `Limit reached (${WINDOW_MAX} coach requests per 10 minutes). Try again in about ${Math.ceil(wait / 60)} minute(s).`, { retryAfterSec: wait });
    const settings = await getSettings(userId);
    let built = { json: JSON.stringify({ type: 'question', language: settings.language }) };
    if (gid) {
      const d = await gameData(userId, gid);
      if (d) built = buildGamePayload({ ...d, language: settings.language });
    }
    const history = sql.prepare("SELECT role, content FROM chat_messages WHERE user_id = ? AND state = 'done' AND COALESCE(game_id, '') = ? ORDER BY id DESC LIMIT ?")
      .all(userId, gid || '', HISTORY_TURNS * 2).reverse();
    await ensureAgents();
    const sent = await send(renderMessage({ kind: 'ask', json: built.json, question: q, history }));
    const requestId = randomBytes(9).toString('base64url');
    const t = iso();
    const ins = sql.prepare('INSERT INTO chat_messages (user_id, request_id, game_id, role, content, state, msg_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    ins.run(userId, requestId, gid, 'user', q, 'done', null, t);
    ins.run(userId, requestId, gid, 'assistant', null, 'pending', sent?.id != null ? String(sent.id) : null, t);
    return { requestId };
  }

  async function getAsk(userId, requestId) {
    userId = String(userId);
    await pump(userId);
    const row = sql.prepare("SELECT * FROM chat_messages WHERE user_id = ? AND request_id = ? AND role = 'assistant'").get(userId, String(requestId));
    if (!row) throw new HttpError(404, 'request_not_found', 'Unknown request.');
    if (row.state === 'done') return { state: 'done', answer: row.content || '', flagged: parseJson(row.flagged_json, []) };
    if (row.state === 'timeout') return { state: 'timeout', message: TIMEOUT_MSG };
    if (row.state === 'error') return { state: 'error', message: row.content || 'The coach could not answer.' };
    return { state: 'pending', message: 'The coach is thinking…' };
  }

  // ---- status ------------------------------------------------------------------------------
  async function status(userId) {
    userId = String(userId);
    const base = { agent: COACH_NAME };
    if (typeof ctx.agents?.list !== 'function' || typeof ctx.messages?.send !== 'function') return { state: 'unavailable', ...base, error: PERMISSION_MSG };
    let list;
    try { list = await ctx.agents.list(); } catch (e) { return { state: 'unavailable', ...base, error: sdkError(e).message }; }
    const coach = (list || []).find((a) => String(a?.name || '').toLowerCase() === COACH_NAME);
    if (coach && !coach.mine) return { state: 'unavailable', ...base, error: 'An agent with this name already exists and does not belong to the plugin.' };
    if (!coach) return { state: 'unknown', ...base };
    const busy = sql.prepare("SELECT 1 FROM reports WHERE user_id = ? AND state IN ('queued', 'sent') LIMIT 1").get(userId);
    return { state: busy ? 'busy' : 'ready', ...base };
  }

  return { report, getReport, ask, getAsk, status, ensureAgents, pump };
}
