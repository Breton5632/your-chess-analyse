// Shared fixtures for the integration tests (owner: chess-coach.qa).
// The 1858 "Opera Game": Paul Morphy vs Duke of Brunswick & Count Isouard (public domain, written by hand).
// The scripted engine below is independent of Stockfish: every evaluation is a number chosen here.
import { Chess } from '../../vendor/chess.js';

export const OPERA_PGN = `[Event "Opera box"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[Round "?"]
[White "Paul Morphy"]
[Black "Duke of Brunswick and Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

export const OPERA_PLIES = 33;
export const OPERA_WHITE_MOVES = 17;
export const OPERA_BLACK_MOVES = 16;
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const fenKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

/** White-POV centipawn evaluation of positions after ply 0..31 (index 0 = start). Ply 32 = mate in 1, ply 33 = mated. */
const WHITE_CP = [20, 30, 25, 30, 40, 35, 40, 45, 40, 45, 40, 50, 40, 60, 55, 55, 50, 60, 150, 150, 130, 160, 200, 220, 300, 320, 330, 350, 700, 750, 760, 780];
// plies (1-based) for which the scripted engine prefers another move than the one played
const NOT_BEST = new Set([18, 29]);

/** Positions of the game built with chess.js (independent of the plugin code). */
export function operaPositions() {
  const chess = new Chess();
  chess.loadPgn(OPERA_PGN);
  const history = chess.history({ verbose: true });
  const g = new Chess();
  const out = [{ ply: 0, fen: g.fen(), played: null }];
  history.forEach((m, i) => { g.move(m.san); out.push({ ply: i + 1, fen: g.fen(), played: m.from + m.to + (m.promotion || ''), san: m.san }); });
  return out;
}

/** Scripted white-POV evaluation of every position, keyed by fen_key. */
export function scriptedEvals() {
  const map = new Map();
  for (const p of operaPositions()) {
    let ev;
    if (p.ply < WHITE_CP.length) ev = { cp: WHITE_CP[p.ply] };
    else if (p.ply === 32) ev = { mate: 1 };
    else ev = { mate: 0 };
    map.set(fenKey(p.fen), ev);
  }
  return map;
}

/** Engine double implementing the CONTRACT 2.2 Engine interface; scores are from the SIDE TO MOVE (raw UCI). */
export function createScriptedEngine({ delayMs = 0 } = {}) {
  const evals = scriptedEvals();
  const pos = operaPositions();
  const playedByFen = new Map();
  pos.forEach((p, i) => { if (i + 1 < pos.length) playedByFen.set(fenKey(p.fen), { uci: pos[i + 1].played, ply: p.ply + 1 }); });
  const state = { started: false, stopped: false, starts: 0, calls: [], active: 0, maxActive: 0 };
  const stm = (fen) => fen.split(' ')[1];
  const toStm = (fen, ev) => {
    if ('mate' in ev) return { mate: stm(fen) === 'w' ? ev.mate : -ev.mate };
    return { scoreCp: stm(fen) === 'w' ? ev.cp : -ev.cp };
  };
  return {
    state,
    async start() { state.started = true; state.stopped = false; state.starts += 1; return { name: 'ScriptedFish', version: '0', nnue: false, variant: 'scripted' }; },
    async stop() { state.stopped = true; state.started = false; },
    isReady() { return state.started; },
    async cancel() {},
    async analyse(fen, { depth = 10, multipv = 2 } = {}) {
      state.calls.push({ key: fenKey(fen), depth, multipv });
      state.active += 1; state.maxActive = Math.max(state.maxActive, state.active);
      try {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        const key = fenKey(fen);
        const ev = evals.get(key);
        const chess = new Chess(fen);
        const legal = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
        if (!ev) throw new Error(`no scripted eval for ${key}`);
        if (legal.length === 0) return { lines: [{ multipv: 1, depth, mate: 0, pv: [] }] };
        const played = playedByFen.get(key);
        const preferOther = played && NOT_BEST.has(played.ply);
        const best = preferOther ? (legal.find((u) => u !== played.uci) || legal[0]) : (played?.uci && legal.includes(played.uci) ? played.uci : legal[0]);
        const second = legal.find((u) => u !== best);
        const lines = [{ multipv: 1, depth, ...toStm(fen, ev), pv: [best] }];
        if (multipv >= 2 && second) {
          const worse = 'mate' in ev ? { scoreCp: -200 } : { scoreCp: (stm(fen) === 'w' ? ev.cp : -ev.cp) - 60 };
          lines.push({ multipv: 2, depth, ...worse, pv: [second] });
        }
        return { lines };
      } finally { state.active -= 1; }
    },
  };
}

export function insertGame(sql, { userId = 'u1', id = '1000001', pgn = OPERA_PGN, color = 'white', rules = 'chess', demo = 0 } = {}) {
  sql.prepare(`INSERT INTO games (user_id, id, url, pgn, time_class, time_control, rated, rules, end_time, white_name, white_rating, white_result,
    black_name, black_rating, black_result, color, my_rating, opp_name, opp_rating, result, termination, plies, demo, created_at)
    VALUES (?, ?, ?, ?, 'rapid', '600', 1, ?, ?, 'synthetic_w', 1500, 'win', 'synthetic_b', 1480, 'checkmated', ?, 1500, 'synthetic_b', 1480, 'win', 'checkmated', 33, ?, ?)`)
    .run(userId, id, `https://www.chess.com/game/live/${id}`, pgn, rules, 1700000000, color, demo, new Date().toISOString());
  return id;
}

/** Every SAN of `sans` must be playable in sequence from `fen` (validated by chess.js). */
export function assertLegalLine(assert, fen, sans, label = '') {
  const c = new Chess(fen);
  for (const san of sans) {
    let mv = null;
    try { mv = c.move(san); } catch { mv = null; }
    assert.ok(mv, `${label} illegal SAN "${san}" from ${fen}`);
  }
}

export async function waitFor(fn, ms = 20000, label = 'condition') {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}
