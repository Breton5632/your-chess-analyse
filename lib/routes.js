// HTTP routes of Chess Insight (CONTRACT §5), all under /api/plugins/chess-coach/.
// The UI proxy relays GET, POST and PUT only, without a query string: filters travel in the body.
import { HttpError, sendError, getSettings as readSettings, putSettings, BOUNDS, effectiveThreads } from './settings.js';
import {
  getOnboarding, setOnboarding, ONBOARDING_KEYS, getGameRow, toSummary, listGames,
  countGames, deleteRealGames, pruneRealGames, insertGame, getKeep, setKeep, selectionIds,
} from './store.js';
import { parseGame, sanOf } from './analysis/pgn.js';
import { cores as cpuCores } from './engine/index.js';
import { ecoEntry } from './analysis/eco.js';
import { rowFromPgn } from './sync/pgn-import.js';
import { parseCount, parseRange } from './sync/index.js';

const KNOWN_METHODS = new Map();

function jsonBody(req) {
  const b = req.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b : {};
}

/**
 * @param {{ ctx, router, services: { settings, analysis, sync, coach, store, demo, version, engine } }} deps
 */
/** Deepest book position reached on each side's own move: { white, black } = { eco, name, ply, san } | null. */
export function openingsBySide(moves) {
  const out = { white: null, black: null };
  for (const m of moves) {
    const e = ecoEntry(m.fenAfter);
    if (e) out[m.color] = { eco: e.eco, name: e.name, ply: m.ply, san: m.san };
  }
  return out;
}

export function registerRoutes({ ctx, router, services }) {
  const { analysis, sync, coach, demo, version } = services;
  const sql = ctx.sql;

  const uid = () => {
    const u = ctx.user();
    if (!u || !u.id) throw new HttpError(401, 'unauthenticated', 'Sign-in required.');
    return String(u.id);
  };

  /** One handler per (method, path): auth, JSON content type on writes, uniform error body. */
  function route(method, path, handler) {
    const key = path;
    if (!KNOWN_METHODS.has(key)) KNOWN_METHODS.set(key, new Set());
    KNOWN_METHODS.get(key).add(method);
    const wrapped = async (req, res) => {
      try {
        const userId = uid();
        if (method !== 'GET' && !String(req.headers?.['content-type'] || '').toLowerCase().includes('application/json')) {
          throw new HttpError(415, 'unsupported_media_type', 'A JSON request body is required.');
        }
        const out = await handler({ req, res, userId, body: jsonBody(req) });
        if (out !== undefined && !res.finished) res.json(out);
      } catch (e) {
        if (e instanceof HttpError) return sendError(res, e);
        ctx.log?.error?.('route failed', e);
        return sendError(res, new HttpError(500, 'internal_error', 'Unexpected error. Try again; if it persists, check the plugin logs.'));
      }
    };
    router[method.toLowerCase()](path, wrapped);
  }

  const settingsOf = (userId) => readSettings(ctx, userId);

  // ---- status / settings --------------------------------------------------------------------------
  route('GET', '/status', async ({ userId }) => {
    demo.purge(userId); // the demo feature is gone: drop leftovers of older installs
    pruneRealGames(sql, userId, { keepIds: getKeep(sql, userId) }); // cap of 15 real games, also applied to games stored before the cap existed
    const s = await settingsOf(userId);
    return {
      configured: !!s.username,
      username: s.username,
      version,
      engine: analysis.engineStatus(),
      sync: sync.status(userId),
      analysis: analysis.counts(userId),
      coach: await coach.status(userId),
      onboarding: getOnboarding(sql, userId),
    };
  });

  route('GET', '/prefs', async ({ userId }) => ({ settings: await settingsOf(userId), bounds: BOUNDS }));
  route('PUT', '/prefs', async ({ userId, body }) => ({ settings: await putSettings(ctx, userId, body) }));

  route('PUT', '/onboarding', async ({ userId, body }) => {
    if (!ONBOARDING_KEYS.includes(body.step)) throw new HttpError(400, 'invalid_step', `step must be one of: ${ONBOARDING_KEYS.join(', ')}.`);
    if (typeof body.done !== 'boolean') throw new HttpError(400, 'invalid_param', '"done" must be true or false.', { key: 'done' });
    return setOnboarding(sql, userId, body.step, body.done);
  });

  // ---- chess.com sync -----------------------------------------------------------------------------
  route('POST', '/sync/check', async ({ userId, body }) => sync.checkUsername(body.username, userId));

  route('POST', '/sync/start', async ({ userId, body }) => {
    const started = await sync.start(userId, { scope: body.scope, month: body.month, count: body.count, from: body.from, to: body.to });
    const sel = { scope: body.scope || 'recent', count: body.scope === 'recent' || !body.scope ? parseCount(body.count) : undefined, ...(body.scope === 'range' ? parseRange(body.from, body.to) : {}) };
    // One-shot follow-up (no timer): once the download ends, keep the selected games (max 15) and queue them for analysis.
    sync.whenIdle(userId).then(async () => {
      const ids = selectionIds(sql, userId, sel);
      if (sel.scope === 'recent' || sel.scope === 'range') setKeep(sql, userId, ids);
      pruneRealGames(sql, userId, { keepIds: getKeep(sql, userId) });
      if (!(await settingsOf(userId)).autoAnalyse) return;
      if (ids.length) analysis.enqueue(userId, ids, 0);
    }).catch(() => {});
    return started;
  });

  // ---- engine -------------------------------------------------------------------------------------
  route('POST', '/engine/check', async ({ userId }) => {
    const running = analysis.engineStatus();
    const s = await settingsOf(userId);
    const coreCount = cpuCores();
    const threads = effectiveThreads(s.threads, coreCount);
    if (running.state === 'ready' || running.state === 'busy') {
      return { ok: true, name: running.name, version: running.version, nnue: true, cores: coreCount, threads, variant: running.variant };
    }
    const factory = ctx.__engineFactory || services.engine.createEngine;
    const engine = factory({ threads: s.threads, hashMb: s.hashMb });
    try {
      const info = await engine.start();
      return { ok: true, name: info.name, version: info.version, nnue: !!info.nnue, cores: coreCount, threads: info.threads ?? threads, variant: engine.variant ?? info.variant ?? '' };
    } catch (err) {
      return { ok: false, name: '', version: '', nnue: false, cores: coreCount, threads, variant: engine.variant ?? '', error: String(err?.message ?? err), code: err?.code };
    } finally {
      try { await engine.stop(); } catch { /* the check must never fail because of the cleanup */ }
    }
  });

  // ---- games --------------------------------------------------------------------------------------
  route('POST', '/games/list', async ({ userId, body }) => listGames(sql, userId, body));

  route('GET', '/games/:id', async ({ req, userId }) => {
    const row = getGameRow(sql, userId, req.params.id);
    if (!row) throw new HttpError(404, 'game_not_found', 'Game not found.');
    const parsed = parseGame(row.pgn, { rules: row.rules });
    return {
      ...toSummary(row),
      white: { name: row.white_name, rating: row.white_rating, result: row.white_result },
      black: { name: row.black_name, rating: row.black_rating, result: row.black_result },
      headers: parsed.headers || {},
      pgn: row.pgn,
      initialFen: parsed.initialFen,
      moves: (parsed.moves || []).map((m) => ({ ply: m.ply, san: m.san, uci: m.uci, color: m.color, fenAfter: m.fenAfter })),
      openings: openingsBySide(parsed.moves || []),
    };
  });

  // ---- analysis -----------------------------------------------------------------------------------
  route('POST', '/analysis/enqueue', async ({ userId, body }) => {
    const ids = body.gameIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 200) throw new HttpError(400, 'invalid_param', '"gameIds" must list between 1 and 200 games.', { key: 'gameIds' });
    const priority = Number.isInteger(body.priority) ? body.priority : 0;
    return analysis.enqueue(userId, ids.map(String), priority);
  });

  route('GET', '/analysis/:gameId', async ({ req, userId }) => {
    const id = req.params.gameId;
    if (!getGameRow(sql, userId, id)) throw new HttpError(404, 'game_not_found', 'Game not found.');
    return analysis.getAnalysis(userId, id);
  });

  route('POST', '/analysis/cancel', async ({ userId, body }) => analysis.cancel(userId, body.gameId == null ? undefined : String(body.gameId)));


  // ---- coach --------------------------------------------------------------------------------------
  route('POST', '/coach/report', async ({ userId, body }) => coach.report(userId, { gameId: body.gameId == null ? undefined : String(body.gameId), gameIds: body.gameIds, force: body.force === true }));
  route('GET', '/coach/report/:gameId', async ({ req, userId }) => coach.getReport(userId, req.params.gameId));
  route('POST', '/coach/ask', async ({ userId, body }) => coach.ask(userId, { gameId: body.gameId == null ? undefined : String(body.gameId), question: body.question }));
  route('GET', '/coach/ask/:requestId', async ({ req, userId }) => coach.getAsk(userId, req.params.requestId));

  // ---- import / clear -----------------------------------------------------------------------------
  route('POST', '/games/import', async ({ userId, body }) => {
    const s = await settingsOf(userId);
    const { row, id } = rowFromPgn(body.pgn, s.username, new Date().toISOString());
    const added = insertGame(sql, userId, row);
    setKeep(sql, userId, [id, ...getKeep(sql, userId).slice(0, 14)]);
    pruneRealGames(sql, userId, { keepIds: getKeep(sql, userId) });
    analysis.enqueue(userId, [id], 1);
    return { id, added };
  });
  // Back to a first launch: every row of this user (games, analyses, reports, chat, settings, onboarding).
  route('POST', '/reset', async ({ userId }) => {
    analysis.cancel(userId);
    const r = deleteRealGames(sql, userId);
    demo.purge(userId);
    const uid = String(userId);
    sql.transaction(() => {
      for (const tb of ['reports', 'chat_messages', 'analysis_queue', 'archives', 'kv']) sql.prepare(`DELETE FROM ${tb} WHERE user_id = ?`).run(uid);
    });
    return { reset: true, deleted: r.deleted };
  });
  route('POST', '/games/clear', async ({ userId, body }) => deleteRealGames(sql, userId, { onlyUnanalysed: body.only === 'unanalysed' }));

  // Known path, unrelayed method → 405 with a JSON body (never a bare 404).
  for (const [path, methods] of KNOWN_METHODS) {
    router.all(path, async (req, res) => {
      if (methods.has(String(req.method).toUpperCase())) return;
      try { uid(); } catch (e) { return sendError(res, e); }
      res.set?.('Allow', [...methods].join(', '));
      return sendError(res, new HttpError(405, 'method_not_allowed', `Method ${req.method} is not allowed here.`));
    });
  }
  KNOWN_METHODS.clear();
  void countGames;
}
