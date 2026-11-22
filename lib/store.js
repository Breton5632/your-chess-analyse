// SQL access layer of the Chess Insight plugin (docs/CONTRACT.md §3, §5).
// Every query is scoped by `user_id`; callers always pass the id read from ctx.user() in the handler.
import { HttpError } from './settings.js';

export const CLASSIFICATIONS = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
export const ERROR_CLASSES = ['inaccuracy', 'mistake', 'miss', 'blunder'];
export const TRAINER_CLASSES = ['mistake', 'blunder', 'miss'];
export const PHASES = ['opening', 'middlegame', 'endgame'];
export const TIME_CLASSES = ['bullet', 'blitz', 'rapid', 'daily'];
export const SORTS = ['date_desc', 'date_asc', 'accuracy_desc', 'accuracy_asc', 'rating_desc'];
export const PAGE_SIZES = [25, 50, 100];
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const nowIso = (ms = Date.now()) => new Date(ms).toISOString();

/** node:sqlite refuses undefined and booleans: normalise before binding. */
export const bind = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
const binds = (arr) => arr.map(bind);

export const badParam = (key, message, params = {}) => new HttpError(400, 'invalid_param', message, { key, ...params });

export function parseJson(text, fallback = null) {
  if (text == null || text === '') return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

// ---- kv --------------------------------------------------------------------------------------
export function getKv(sql, userId, key) {
  const r = sql.prepare('SELECT value FROM kv WHERE user_id = ? AND key = ?').get(String(userId), key);
  return r ? r.value : null;
}
export function setKv(sql, userId, key, value) {
  sql.prepare('INSERT INTO kv (user_id, key, value) VALUES (?, ?, ?) ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value').run(String(userId), key, value == null ? null : String(value));
}
export function delKv(sql, userId, key) {
  sql.prepare('DELETE FROM kv WHERE user_id = ? AND key = ?').run(String(userId), key);
}
export const getKvJson = (sql, userId, key, fallback = null) => parseJson(getKv(sql, userId, key), fallback);
export const setKvJson = (sql, userId, key, value) => setKv(sql, userId, key, JSON.stringify(value));

// ---- onboarding ------------------------------------------------------------------------------
const ONBOARDING_STEPS = ['username', 'engine', 'sync'];
export const ONBOARDING_KEYS = [...ONBOARDING_STEPS, 'complete', 'chatOpened'];

export function getOnboarding(sql, userId) {
  const raw = getKvJson(sql, userId, 'onboarding', {}) || {};
  const completed = raw.complete === true;
  const step = completed ? 'complete' : ONBOARDING_STEPS.find((s) => raw[s] !== true) || 'complete';
  return { step, completed, chatOpened: raw.chatOpened === true };
}
export function setOnboarding(sql, userId, key, done) {
  const raw = getKvJson(sql, userId, 'onboarding', {}) || {};
  raw[key] = done === true;
  setKvJson(sql, userId, 'onboarding', raw);
  return getOnboarding(sql, userId);
}

// ---- games -----------------------------------------------------------------------------------
const GAME_COLS = ['id', 'url', 'pgn', 'time_class', 'time_control', 'rated', 'rules', 'end_time',
  'white_name', 'white_rating', 'white_result', 'black_name', 'black_rating', 'black_result',
  'color', 'my_rating', 'opp_name', 'opp_rating', 'result', 'termination',
  'eco_code', 'opening', 'eco_url', 'acc_white', 'acc_black', 'plies', 'analyzed', 'demo', 'archive_url', 'created_at'];

/** Idempotent insert (ON CONFLICT DO NOTHING). Returns true when a row was added. */
export function insertGame(sql, userId, g) {
  const cols = ['user_id', ...GAME_COLS];
  const stmt = sql.prepare(`INSERT INTO games (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT (user_id, id) DO NOTHING`);
  const res = stmt.run(...binds([String(userId), ...GAME_COLS.map((c) => g[c])]));
  return Number(res.changes) > 0;
}

export function countGames(sql, userId, { demo } = {}) {
  const extra = demo === undefined ? '' : ' AND demo = ' + (demo ? 1 : 0);
  return Number(sql.prepare(`SELECT COUNT(*) AS n FROM games WHERE user_id = ?${extra}`).get(String(userId)).n);
}

/** When the user has real games, demo games stay out of stats/trainer/trend by default. */
export function demoScope(sql, userId) {
  return countGames(sql, userId, { demo: false }) > 0 ? 'g.demo = 0' : '';
}

const SUMMARY_SELECT = `SELECT g.*, a.state AS a_state, a.acc_white AS a_acc_white, a.acc_black AS a_acc_black, q.state AS q_state
  FROM games g
  LEFT JOIN analyses a ON a.user_id = g.user_id AND a.game_id = g.id
  LEFT JOIN analysis_queue q ON q.user_id = g.user_id AND q.game_id = g.id`;

const MY_ACC = "CASE g.color WHEN 'white' THEN a.acc_white WHEN 'black' THEN a.acc_black END";
const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

export function analysisStateOf(row) {
  if (row.a_state) return row.a_state;
  if (row.q_state === 'queued' || row.q_state === 'running') return row.q_state;
  return 'none';
}

export function toSummary(r) {
  const state = analysisStateOf(r);
  const hasAcc = (state === 'ready' || state === 'partial') && r.a_acc_white != null && r.a_acc_black != null;
  const mine = r.color === 'black' ? r.a_acc_black : r.a_acc_white;
  const opp = r.color === 'black' ? r.a_acc_white : r.a_acc_black;
  const hasCom = r.acc_white != null && r.acc_black != null;
  return {
    id: r.id, url: r.url, endTime: r.end_time, timeClass: r.time_class, timeControl: r.time_control,
    rated: !!r.rated, color: r.color, opponent: { name: r.opp_name, rating: r.opp_rating }, myRating: r.my_rating,
    result: r.result, termination: r.termination, opening: r.opening, ecoCode: r.eco_code,
    analyzed: !!r.analyzed, analysisState: state,
    accuracy: hasAcc ? { mine: round2(mine), opp: round2(opp) } : null,
    chesscomAccuracy: hasCom ? { mine: round2(r.color === 'black' ? r.acc_black : r.acc_white), opp: round2(r.color === 'black' ? r.acc_white : r.acc_black) } : null,
    demo: !!r.demo,
  };
}

export function getGameRow(sql, userId, id) {
  return sql.prepare(`${SUMMARY_SELECT} WHERE g.user_id = ? AND g.id = ?`).get(String(userId), String(id)) || null;
}

const optInt = (key, v) => {
  if (v === undefined || v === null) return undefined;
  if (!Number.isInteger(v) || v < 0) throw badParam(key, `"${key}" must be a non-negative integer.`);
  return v;
};
const optBool = (key, v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'boolean') throw badParam(key, `"${key}" must be true or false.`);
  return v;
};
const optEnum = (key, v, values) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (!values.includes(v)) throw badParam(key, `"${key}" must be one of: ${values.join(', ')}.`, { values });
  return v;
};
const optStr = (key, v, max = 100) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || v.length > max) throw badParam(key, `"${key}" must be text of at most ${max} characters.`);
  return v.trim() || undefined;
};

/** Builds [{ key, clause, params }] for the games filters shared by list and stats. */
function filterParts(body, { withDemoScope, sql, userId }) {
  const parts = [{ key: 'rules', clause: "g.rules = 'chess'", params: [] }]; // variants are stored but never listed
  const tc = optEnum('timeClass', body.timeClass, TIME_CLASSES);
  if (tc) parts.push({ key: 'timeClass', clause: 'g.time_class = ?', params: [tc] });
  const from = optInt('from', body.from);
  if (from !== undefined) parts.push({ key: 'from', clause: 'g.end_time >= ?', params: [from] });
  const to = optInt('to', body.to);
  if (to !== undefined) parts.push({ key: 'to', clause: 'g.end_time <= ?', params: [to] });
  const demo = optBool('demo', body.demo);
  if (demo !== undefined) parts.push({ key: 'demo', clause: 'g.demo = ?', params: [demo ? 1 : 0] });
  else if (withDemoScope) {
    const scope = demoScope(sql, userId);
    if (scope) parts.push({ key: 'demo', clause: scope, params: [] });
  }
  return parts;
}

const where = (parts) => (parts.length ? ' AND ' + parts.map((p) => p.clause).join(' AND ') : '');
const whereParams = (parts) => parts.flatMap((p) => p.params);

export function listGames(sql, userId, body = {}) {
  const uid = String(userId);
  const parts = filterParts(body, { withDemoScope: true, sql, userId: uid });
  const color = optEnum('color', body.color, ['white', 'black']);
  const result = optEnum('result', body.result, ['win', 'loss', 'draw']);
  const analyzed = optBool('analyzed', body.analyzed);
  const opening = optStr('opening', body.opening, 200);
  const search = optStr('search', body.search, 50);
  const sort = optEnum('sort', body.sort, SORTS) || 'date_desc';
  const pageSize = body.pageSize === undefined || body.pageSize === null ? 25 : body.pageSize;
  if (!PAGE_SIZES.includes(pageSize)) throw badParam('pageSize', 'pageSize must be 25, 50 or 100.', { values: PAGE_SIZES });
  const page = body.page === undefined || body.page === null ? 1 : body.page;
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw badParam('page', 'page must be a positive integer.', { min: 1 });

  if (color) parts.push({ key: 'color', clause: 'g.color = ?', params: [color] });
  if (result) parts.push({ key: 'result', clause: 'g.result = ?', params: [result] });
  if (analyzed !== undefined) parts.push({ key: 'analyzed', clause: 'g.analyzed = ?', params: [analyzed ? 1 : 0] });
  if (search) parts.push({ key: 'search', clause: "g.opp_name LIKE ? ESCAPE '\\'", params: [`%${search.replace(/[\\%_]/g, (c) => '\\' + c)}%`] });
  const openingParts = [...parts];
  if (opening) parts.push({ key: 'opening', clause: '(g.opening = ? OR g.eco_code = ?)', params: [opening, opening] });

  const order = {
    date_desc: 'g.end_time DESC, g.id DESC',
    date_asc: 'g.end_time ASC, g.id ASC',
    accuracy_desc: `(${MY_ACC} IS NULL), ${MY_ACC} DESC, g.end_time DESC`,
    accuracy_asc: `(${MY_ACC} IS NULL), ${MY_ACC} ASC, g.end_time DESC`,
    rating_desc: 'g.my_rating DESC, g.end_time DESC',
  }[sort];

  const base = `FROM games g LEFT JOIN analyses a ON a.user_id = g.user_id AND a.game_id = g.id WHERE g.user_id = ?`;
  const total = Number(sql.prepare(`SELECT COUNT(*) AS n ${base}${where(parts)}`).get(uid, ...whereParams(parts)).n);
  const rows = sql.prepare(`${SUMMARY_SELECT} WHERE g.user_id = ?${where(parts)} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(uid, ...whereParams(parts), pageSize, (page - 1) * pageSize);
  const openings = sql.prepare(`SELECT g.eco_code AS ecoCode, g.opening AS opening, COUNT(*) AS count ${base}${where(openingParts)} AND g.opening IS NOT NULL GROUP BY g.eco_code, g.opening ORDER BY count DESC, g.opening ASC LIMIT 100`)
    .all(uid, ...whereParams(openingParts)).map((o) => ({ ecoCode: o.ecoCode, opening: o.opening, count: Number(o.count) }));
  return { total, page, pageSize, items: rows.map(toSummary), openings };
}

// ---- analysis (read side, GameAnalysis shape of §5) -------------------------------------------
export function readAnalysis(sql, userId, gameId) {
  const uid = String(userId);
  const a = sql.prepare('SELECT * FROM analyses WHERE user_id = ? AND game_id = ?').get(uid, String(gameId));
  if (!a) return null;
  if (a.state === 'invalid' || a.state === 'failed') return { state: a.state, error: a.error || null };
  const moves = sql.prepare('SELECT * FROM move_analyses WHERE user_id = ? AND game_id = ? ORDER BY ply').all(uid, String(gameId));
  const evalOf = (cp, mate) => (mate != null ? { mate } : { cp: cp ?? 0 });
  return {
    gameId: String(gameId),
    state: a.state,
    engine: { name: a.engine_name, version: '', depthFast: a.depth_fast, depthDeep: a.depth_deep },
    accuracy: { white: a.acc_white, black: a.acc_black },
    counts: parseJson(a.counts_json, { white: {}, black: {} }),
    initial: parseJson(a.initial_json, null),
    moves: moves.map((m) => ({
      ply: m.ply, san: m.san, uci: m.uci, color: m.color, fenBefore: m.fen_before, fenAfter: m.fen_after,
      evalAfter: evalOf(m.eval_cp, m.eval_mate), bestUci: m.best_uci, bestSan: m.best_san,
      ...(m.second_san ? { secondSan: m.second_san } : {}),
      loss: m.loss, classification: m.classification, accuracy: m.accuracy, phase: m.phase, failed: !!m.failed,
      line: parseJson(m.line_json, []), topLines: parseJson(m.top_json, []),
    })),
    criticalMoments: parseJson(a.critical_json, []),
  };
}

/** Hard cap on stored real games per user (demo games do not count). */
export const MAX_REAL_GAMES = 15;

function deleteGamesByIds(sql, uid, ids) {
  for (let i = 0; i < ids.length; i += 500) {
    const part = ids.slice(i, i + 500);
    const marks = part.map(() => '?').join(',');
    sql.prepare(`DELETE FROM trainer_attempts WHERE user_id = ? AND item_id IN (SELECT id FROM trainer_items WHERE user_id = ? AND game_id IN (${marks}))`).run(uid, uid, ...part);
    for (const t of ['trainer_items', 'move_analyses', 'analyses', 'analysis_queue', 'reports', 'chat_messages']) {
      sql.prepare(`DELETE FROM ${t} WHERE user_id = ? AND game_id IN (${marks})`).run(uid, ...part);
    }
    sql.prepare(`DELETE FROM games WHERE user_id = ? AND demo = 0 AND id IN (${marks})`).run(uid, ...part);
  }
}

/**
 * Deletes the user's REAL games (demo = 0) and everything attached to them. Demo rows are untouched.
 * onlyUnanalysed = "clean the database": only games that were never analysed go.
 * Archive bookkeeping is reset so a later sync can download the deleted games again.
 */
export function deleteRealGames(sql, userId, { onlyUnanalysed = false } = {}) {
  const uid = String(userId);
  const ids = sql.prepare(`SELECT id FROM games WHERE user_id = ? AND demo = 0${onlyUnanalysed ? ' AND analyzed = 0' : ''}`).all(uid).map((r) => r.id);
  sql.transaction(() => {
    deleteGamesByIds(sql, uid, ids);
    sql.prepare('DELETE FROM archives WHERE user_id = ?').run(uid);
    if (!onlyUnanalysed) sql.prepare("DELETE FROM kv WHERE user_id = ? AND key IN ('sync:last', 'sync:last_attempt', 'sync:keep')").run(uid);
  });
  if (onlyUnanalysed) {
    const left = new Set(sql.prepare('SELECT id FROM games WHERE user_id = ? AND demo = 0').all(uid).map((r) => String(r.id)));
    setKeep(sql, uid, getKeep(sql, uid).filter((id) => left.has(id)));
  }
  return { deleted: ids.length };
}

/** Keeps only the `max` newest real games (plus `keepIds`); older ones go with their analyses. Returns { pruned }. */
export function pruneRealGames(sql, userId, { max = MAX_REAL_GAMES, keepIds = [] } = {}) {
  const uid = String(userId);
  const keep = new Set(keepIds.map(String));
  const rows = sql.prepare('SELECT id FROM games WHERE user_id = ? AND demo = 0 ORDER BY end_time DESC, id DESC').all(uid);
  const kept = rows.filter((r) => keep.has(String(r.id))).length;
  const room = Math.max(0, max - kept);
  let seen = 0;
  const drop = [];
  for (const r of rows) {
    if (keep.has(String(r.id))) continue;
    seen += 1;
    if (seen > room) drop.push(r.id);
  }
  if (drop.length) sql.transaction(() => deleteGamesByIds(sql, uid, drop));
  return { pruned: drop.length };
}

/** Ids the last sync / import chose to keep (protected from pruning). */
export function getKeep(sql, userId) {
  try { const v = JSON.parse(getKv(sql, userId, 'sync:keep') || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
export function setKeep(sql, userId, ids) { setKv(sql, userId, 'sync:keep', JSON.stringify([...new Set(ids.map(String))].slice(0, MAX_REAL_GAMES))); }

/** The games a sync request targets, newest first (at most MAX_REAL_GAMES): 'recent' = newest `count`, 'range' = newest in [fromSec, toSec]. */
export function selectionIds(sql, userId, { scope, count, fromSec, toSec }) {
  const uid = String(userId);
  if (scope === 'range') {
    return sql.prepare('SELECT id FROM games WHERE user_id = ? AND demo = 0 AND end_time >= ? AND end_time <= ? ORDER BY end_time DESC, id DESC LIMIT ?')
      .all(uid, fromSec, toSec, MAX_REAL_GAMES).map((r) => r.id);
  }
  const n = scope === 'recent' ? Math.min(Number(count) || MAX_REAL_GAMES, MAX_REAL_GAMES) : MAX_REAL_GAMES;
  return sql.prepare('SELECT id FROM games WHERE user_id = ? AND demo = 0 ORDER BY end_time DESC, id DESC LIMIT ?').all(uid, n).map((r) => r.id);
}
