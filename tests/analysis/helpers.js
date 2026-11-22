// Shared helpers for analysis tests: scripted evaluations (independent of Stockfish), synthetic games,
// and the CONTRACT §3 tables created by hand (the migrations belong to the backend agent).
import { DatabaseSync } from 'node:sqlite';
import { Chess } from '../../vendor/chess.js';
import { parseGame, fenKey } from '../../lib/analysis/pgn.js';

export const OPERA_GAME_SANS = [
  'e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5',
  'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#',
];

/** PGN text from a SAN list (optionally from a custom FEN). Synthetic: no real player data. */
export function pgnOf(sans, { fen, headers = {} } = {}) {
  const chess = fen ? new Chess(fen) : new Chess();
  for (const san of sans) chess.move(san);
  for (const [k, v] of Object.entries(headers)) chess.setHeader(k, v);
  return chess.pgn();
}

/**
 * Scripted evaluations, white-POV, per position P0..Pn.
 * spec[i] = { cp?, mate?, best?: uci, second?: { cp?, mate?, uci } }  (cp/mate are WHITE POV)
 * Defaults: cp 0; best = the move actually played; the PV continues with the game's own moves.
 * Returns { getEval(key), byKey, fens }.
 */
export function scriptEvals(parsed, spec = {}, { pvLen = 6 } = {}) {
  const fens = [parsed.initialFen, ...parsed.moves.map((m) => m.fenAfter)];
  const byKey = new Map();
  fens.forEach((fen, i) => {
    if (i === fens.length - 1 && parsed.moves.length && new Chess(fen).moves().length === 0) return;
    const s = spec[i] ?? {};
    const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
    const line = (src, pv, multipv) => {
      const l = { multipv, depth: 20, pv };
      if (src.mate !== undefined) l.mate = sign * src.mate; else l.scoreCp = sign * (src.cp ?? 0);
      return l;
    };
    const game = parsed.moves.slice(i, i + pvLen).map((m) => m.uci);
    const pv1 = s.best ? [s.best] : game;
    const lines = [line(s, pv1, 1)];
    if (s.second) lines.push(line(s.second, [s.second.uci], 2));
    byKey.set(fenKey(fen), { depth: 20, lines });
  });
  return { getEval: (key) => byKey.get(key) ?? null, byKey, fens };
}

/** Fake-engine eval function (stm POV `{cp|mate, pv}` lines) from the scripted table. */
export function evalForFromScript(script) {
  return (fen) => {
    const ev = script.byKey.get(fenKey(fen));
    if (!ev) return defaultLines(fen);
    return ev.lines.map((l) => ({ cp: l.scoreCp, mate: l.mate, pv: l.pv }));
  };
}

function defaultLines(fen) {
  const moves = new Chess(fen).moves({ verbose: true }).slice(0, 2);
  return moves.map((m, i) => ({ cp: -10 * i, pv: [`${m.from}${m.to}${m.promotion ?? ''}`] }));
}

/** Seeded RNG (mulberry32) for reproducible random games. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random legal game (no data from anywhere) with a scripted random evaluation for every position. */
export function randomGame(seed, plies = 40) {
  const r = rng(seed);
  const chess = new Chess();
  for (let i = 0; i < plies && !chess.isGameOver(); i++) {
    const ms = chess.moves();
    chess.move(ms[Math.floor(r() * ms.length)]);
  }
  const parsed = parseGame(chess.pgn());
  const fens = [parsed.initialFen, ...parsed.moves.map((m) => m.fenAfter)];
  const byKey = new Map();
  let walk = 0;
  fens.forEach((fen, i) => {
    const probe = new Chess(fen);
    if (probe.moves().length === 0) return;
    walk = Math.max(-1500, Math.min(1500, walk + (r() - 0.5) * 400));
    const sign = fen.split(' ')[1] === 'w' ? 1 : -1;
    const randomPv = (start, max) => {
      const c = new Chess(start);
      const pv = [];
      for (let k = 0; k < max && !c.isGameOver(); k++) {
        const ms = c.moves({ verbose: true });
        const m = ms[Math.floor(r() * ms.length)];
        pv.push(`${m.from}${m.to}${m.promotion ?? ''}`);
        c.move(m);
      }
      return pv;
    };
    const played = parsed.moves[i]?.uci;
    const pv1 = played && r() < 0.4 ? [played, ...randomPv(parsed.moves[i].fenAfter, 4)] : randomPv(fen, 1 + Math.floor(r() * 6));
    const lines = [{ multipv: 1, depth: 20, scoreCp: sign * Math.round(walk), pv: pv1 }];
    if (probe.moves().length > 1 && r() < 0.8) {
      lines.push({ multipv: 2, depth: 20, scoreCp: sign * Math.round(walk - r() * 300), pv: randomPv(fen, 1 + Math.floor(r() * 4)) });
    }
    if (r() < 0.05) lines[0] = { multipv: 1, depth: 20, mate: (r() < 0.5 ? 1 : -1) * (1 + Math.floor(r() * 5)), pv: pv1 };
    byKey.set(fenKey(fen), { depth: 20, lines });
  });
  return { parsed, getEval: (key) => byKey.get(key) ?? null, byKey };
}

/** CONTRACT §3 tables used by the analysis service. */
export const SCHEMA = `
CREATE TABLE games (user_id TEXT NOT NULL, id TEXT NOT NULL, url TEXT NOT NULL DEFAULT '', pgn TEXT NOT NULL, rules TEXT NOT NULL DEFAULT 'chess',
  end_time INTEGER NOT NULL DEFAULT 0, plies INTEGER, analyzed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT '', PRIMARY KEY (user_id, id));
CREATE TABLE evals (user_id TEXT NOT NULL, fen_key TEXT NOT NULL, depth INTEGER NOT NULL, multipv_json TEXT NOT NULL, engine TEXT,
  created_at TEXT NOT NULL, PRIMARY KEY (user_id, fen_key));
CREATE TABLE analyses (user_id TEXT NOT NULL, game_id TEXT NOT NULL, state TEXT NOT NULL, engine_name TEXT, depth_fast INTEGER, depth_deep INTEGER,
  acc_white REAL, acc_black REAL, counts_json TEXT, critical_json TEXT, initial_json TEXT, error TEXT, started_at TEXT, finished_at TEXT,
  PRIMARY KEY (user_id, game_id));
CREATE TABLE move_analyses (user_id TEXT NOT NULL, game_id TEXT NOT NULL, ply INTEGER NOT NULL, san TEXT NOT NULL, uci TEXT NOT NULL,
  color TEXT NOT NULL, fen_before TEXT NOT NULL, fen_after TEXT NOT NULL, eval_cp INTEGER, eval_mate INTEGER, best_uci TEXT, best_san TEXT,
  second_san TEXT, loss REAL, classification TEXT, accuracy REAL, phase TEXT, line_json TEXT, top_json TEXT, failed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, game_id, ply));
CREATE TABLE analysis_queue (user_id TEXT NOT NULL, game_id TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL,
  phase TEXT, done INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, enqueued_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, game_id));
`;

/** In-memory ctx.sql-like database with the tables above. */
export function memorySql() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  return {
    raw: db,
    prepare: (s) => db.prepare(s),
    exec: (s) => db.exec(s),
    transaction(fn) {
      db.exec('BEGIN');
      try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
}

export function addGame(sql, userId, id, pgn, rules = 'chess') {
  sql.prepare('INSERT INTO games (user_id, id, pgn, rules) VALUES (?, ?, ?, ?)').run(userId, String(id), pgn, rules);
}
