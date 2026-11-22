// Coach and relay agents (docs/CONTRACT.md §8): created by the plugin, idempotent, prompt refreshed on
// hash change, model picked from ctx.backends.list() (never hard-coded), no API key anywhere.
import { createHash } from 'node:crypto';
import { HttpError } from '../settings.js';

export const COACH_NAME = 'chess-plugin.coach';
export const RELAY_NAME = 'chess-plugin.relay';

export const COACH_PROMPT = `You are a kind and patient chess coach inside a Timon plugin (Chess Insight).
You receive compact JSON about ONE finished game (or a set of recent games) of the person you coach. Every
number, evaluation, best move and classification in it was computed by the Stockfish engine. You explain it.

Hard rules:
1. Only cite chess moves that appear in the data you were given (played moves, best moves, engine lines).
   Write them in SAN exactly as given. Never invent, extend or "improve" a line.
2. Never evaluate a position yourself and never say which side is better unless the data says so. Do not
   run or simulate an engine. If the data does not answer a question, say so.
3. Explain the WHY in plain human language: tactic missed, plan, pawn structure, king safety, endgame
   technique, time pressure. Prefer ideas over move lists.
4. At most 3 lessons, and exactly 1 practical exercise the person can do (for example "look for checks,
   captures and threats before each move in your next 3 games").
5. Be encouraging and concrete. Start with what went well when the data shows it.
6. Reply in the language of the person: use the "language" field of the data when it is "en" or "fr";
   when it is "auto", reply in the language of the question, otherwise English.
7. Never ask for a chess.com password, token, cookie or any credential, and never ask for personal data.
8. You analyse FINISHED games only. If asked to help during a game in progress, politely refuse.
9. Reply exactly once, with agent_reply on the message you received, in light markdown. Use no other tool.
The accuracy figures labelled "coach accuracy" are this plugin's own measure, not the chess.com score.`;

export const RELAY_PROMPT = `You are the internal relay of the Chess Insight plugin. You never act on your own.
Messages written in your name carry requests for ${COACH_NAME}; its answers land in your inbox and are read
by the plugin. If a message ever reaches you, do nothing and do not answer.`;

export const PERMISSION_MSG = 'The coach needs the plugin permissions "agents", "messages" and "backends". Approve them in Timon (Settings › Plugins › Chess Insight), then try again.';
export const TIMEOUT_MSG = `The coach did not answer within 120 seconds. Try again in a moment; if it keeps happening, check in Timon that the agent "${COACH_NAME}" can start (model connected, quota available).`;

export const promptHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

// ---- model choice (same logic as the reference plugin) ---------------------------------------
const TIER_RANK = ['flagship', 'frontier', 'max', 'premium', 'pro', 'high', 'large', 'advanced', 'standard', 'balanced', 'medium', 'default', 'fast', 'small', 'mini', 'low', 'lite'];
const tierScore = (t) => {
  if (!t) return null;
  const s = String(t).toLowerCase();
  const i = TIER_RANK.findIndex((w) => s.includes(w));
  return i < 0 ? null : TIER_RANK.length - i;
};

/** Most capable model of the default signed-in backend; {} when the catalogue is empty. */
export function pickModel(catalog) {
  const usable = (catalog?.backends || []).filter((b) => b && b.id && b.signedIn !== false && Array.isArray(b.models) && b.models.some((m) => m?.slug && !m.hidden));
  if (!usable.length) return {};
  const backend = usable.find((b) => b.id === catalog.defaultBackend) || usable[0];
  const models = backend.models.filter((m) => m?.slug && !m.hidden);
  let best = null;
  for (const m of models) {
    const s = tierScore(m.tier);
    if (s == null) continue;
    if (!best || s > best.s || (s === best.s && (m.contextWindow || 0) > (best.m.contextWindow || 0))) best = { m, s };
  }
  const model = best?.m.slug || (models.some((m) => m.slug === backend.defaultModel) ? backend.defaultModel : models[0].slug);
  return { backend: backend.id, model };
}

async function chooseModel(ctx) {
  if (typeof ctx.backends?.list !== 'function') return {};
  try { return pickModel(await ctx.backends.list()); } catch { return {}; }
}

export const agentConflict = () => new HttpError(409, 'agent_conflict',
  `An agent named "${COACH_NAME}" or "${RELAY_NAME}" already exists and does not belong to the plugin. Rename or delete it in Timon, then try again.`);

/** Maps an SDK error (forbidden, conflict, …) to an HttpError with a clear message. */
export function sdkError(e) {
  if (e instanceof HttpError) return e;
  const msg = String(e?.message || e || '');
  if (e?.code === 'forbidden' || /permission|not granted|forbidden/i.test(msg)) return new HttpError(403, 'permission', PERMISSION_MSG);
  if (e?.code === 'conflict') return agentConflict();
  return new HttpError(503, 'agent_unavailable', `The coach agent is unavailable right now${msg ? ` (${msg.slice(0, 200)})` : ''}. Try again in a moment.`);
}

/**
 * Creates the relay and coach agents when missing (idempotent) and refreshes a changed prompt.
 * Plugin-global state lives in agent_state with user_id '*'.
 */
export async function ensureAgents(ctx, sql, now = () => new Date().toISOString()) {
  const a = ctx.agents;
  const m = ctx.messages;
  if (typeof a?.list !== 'function' || typeof a?.create !== 'function' || typeof m?.send !== 'function' || typeof m?.recv !== 'function') {
    throw new HttpError(403, 'permission', PERMISSION_MSG);
  }
  let agents;
  try { agents = await a.list(); } catch (e) { throw sdkError(e); }
  const find = (list, n) => (list || []).find((x) => String(x?.name || '').toLowerCase() === n.toLowerCase());
  const created = [];
  let model;
  for (const [name, prompt] of [[RELAY_NAME, RELAY_PROMPT], [COACH_NAME, COACH_PROMPT]]) {
    const hash = promptHash(prompt);
    const existing = find(agents, name);
    if (existing && !existing.mine) throw agentConflict();
    const row = sql.prepare("SELECT prompt_hash FROM agent_state WHERE user_id = '*' AND agent = ?").get(name);
    if (existing) {
      if (row?.prompt_hash !== hash && typeof a.update === 'function') {
        try { await a.update(existing.name, { systemPrompt: prompt }); } catch (e) { throw sdkError(e); }
      } else if (row?.prompt_hash === hash) continue;
    } else {
      if (name === COACH_NAME && model === undefined) model = await chooseModel(ctx);
      try {
        await a.create({ name, role: 'research', systemPrompt: prompt, ...(name === COACH_NAME ? model : {}) });
        created.push(name);
      } catch (e) {
        if (e?.code === 'conflict') {
          let again = [];
          try { again = await a.list(); } catch { /* fall through */ }
          if (!find(again, name)?.mine) throw agentConflict();
        } else throw sdkError(e);
      }
    }
    sql.prepare("INSERT INTO agent_state (user_id, agent, prompt_hash, updated_at) VALUES ('*', ?, ?, ?) ON CONFLICT (user_id, agent) DO UPDATE SET prompt_hash = excluded.prompt_hash, updated_at = excluded.updated_at")
      .run(name, hash, now());
  }
  return { created };
}
