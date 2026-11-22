// Contract-shaped fake data for the harness and the UI tests. Fictional players, invented ratings.
// The one game score used is the 1858 "Opera Game" (public domain), under fictional names.
import { Chess } from '../vendor/chess.js';

const SANS_OPERA = 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' ');
const SANS_RUY = 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 c4 Bg5 h6 Be3 Nc5 Qd2 h5'.split(' ');
const SANS_SHORT = 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5 a6 dxc5 bxc5 O-O Ra7 Be2 Nd7 Nd4 Qf8 Nxe6 fxe6 e4 d4 f4 Qe7 e5 Rb8 Bc4 Kh8 Qc3 Nf8 b3 Nd7 Qd3 Rc8 Qe2 a5 Rf3 Nb8'.split(' ');
const SANS_SCHOLAR = 'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#'.split(' ');

function mulberry(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const winPct = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * Math.max(-2000, Math.min(2000, cp)))) - 1);
const winOf = (ev) => (ev.mate != null ? (ev.mate > 0 ? 100 : 0) : winPct(ev.cp));

function playAll(sans) {
  const g = new Chess();
  const moves = [];
  for (const san of sans) {
    const fenBefore = g.fen();
    let m;
    try { m = g.move(san); } catch { break; }
    moves.push({ ply: moves.length + 1, san: m.san, uci: m.from + m.to + (m.promotion || ''), color: m.color === 'w' ? 'white' : 'black', fenBefore, fenAfter: g.fen() });
  }
  return moves;
}
// Legal continuation (always SAN validated by chess.js), preferring `first` when given.
function legalWalk(fen, n, rng, first) {
  const g = new Chess(fen);
  const out = [];
  for (let i = 0; i < n; i++) {
    const legal = g.moves();
    if (!legal.length) break;
    const san = i === 0 && first && legal.includes(first) ? first : legal[Math.floor(rng() * legal.length)];
    g.move(san); out.push(san);
  }
  return out;
}

const OPERA_CP = [30, 25, 35, 40, 50, 45, 55, 50, 60, 55, 75, 70, 90, 80, 100, 150, 170, 380, 400, 330, 420, 450, 520, 500, 580, 560, 650, 700, 800, 760, { mate: 2 }, { mate: 1 }, { cp: 3000 }];
const OPERA_CLASS = { 31: 'brilliant', 33: 'best', 29: 'great', 20: 'miss', 18: 'blunder' };

function randomCp(n, rng, seed) {
  const out = []; let cur = 20;
  for (let i = 0; i < n; i++) {
    cur += (rng() - 0.5) * 110 + (rng() < 0.08 ? (rng() - 0.5) * 500 : 0);
    out.push(Math.round(cur));
  }
  return out;
}

export function buildGame({ id, sans, evals, overrides = {}, seed = 1, me = 'white', names = ['demo_player', 'quiet_knight'], ratings = [1500, 1480] }) {
  const rng = mulberry(seed);
  const moves = playAll(sans);
  const played = moves.map((x) => x.san);
  const initial = { eval: { cp: 20 }, lines: [] };
  const evs = evals.map((e) => (typeof e === 'number' ? { cp: e } : e));
  let prev = { cp: 20 };
  let bookOver = false;
  const analysed = moves.map((m, idx) => {
    const ev = evs[idx];
    const mover = m.color === 'white' ? 1 : -1;
    const before = winOf(prev), after = winOf(ev);
    const lossPct = Math.max(0, (before - after) * mover) / 100;
    let cls = overrides[m.ply];
    if (!cls) {
      cls = m.ply <= 8 && !bookOver ? 'book' : lossPct <= 0.004 ? 'best' : lossPct <= 0.02 ? 'excellent' : lossPct <= 0.05 ? 'good' : lossPct <= 0.1 ? 'inaccuracy' : lossPct <= 0.2 ? 'mistake' : 'blunder';
      if (m.ply > 8) bookOver = true;
    }
    const bad = ['inaccuracy', 'mistake', 'miss', 'blunder'].includes(cls);
    const g = new Chess(m.fenBefore);
    const alt = g.moves().find((s) => s !== m.san) || m.san;
    const bestSan = bad ? alt : m.san;
    const bg = new Chess(m.fenBefore); const bm = bg.move(bestSan);
    const nextSans = played.slice(idx + 1, idx + 6);
    const line = [bestSan, ...legalWalk(bg.fen(), 4, rng)];
    const top1 = { eval: ev, san: nextSans.length ? nextSans : legalWalk(m.fenAfter, 4, rng) };
    const alt2 = legalWalk(m.fenAfter, 4, rng);
    const top2 = { eval: { cp: (ev.cp != null ? ev.cp : 1500) - 40 }, san: alt2 };
    const acc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, (before - after) * mover)) - 3.1669));
    const out = { ply: m.ply, san: m.san, uci: m.uci, color: m.color, fenBefore: m.fenBefore, fenAfter: m.fenAfter, evalAfter: ev, bestUci: bm.from + bm.to + (bm.promotion || ''), bestSan, loss: Math.round(lossPct * 1000) / 1000, classification: cls, accuracy: Math.round(acc * 10) / 10, phase: m.ply <= 30 ? 'opening' : 'middlegame', failed: false, line, topLines: [top1, top2] };
    if (idx === 0) initial.lines = [{ eval: { cp: 25 }, san: legalWalk(new Chess().fen(), 5, rng, 'e4') }, { eval: { cp: 20 }, san: legalWalk(new Chess().fen(), 5, rng, 'd4') }];
    prev = ev;
    return out;
  });
  const classes = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
  const counts = { white: {}, black: {} };
  for (const c of classes) { counts.white[c] = 0; counts.black[c] = 0; }
  const sum = { white: [0, 0], black: [0, 0] };
  for (const m of analysed) { counts[m.color][m.classification] += 1; sum[m.color][0] += m.accuracy; sum[m.color][1] += 1; }
  const avg = (c) => (sum[c][1] ? Math.round((sum[c][0] / sum[c][1]) * 10) / 10 : null);
  const critical = analysed.filter((m) => ['mistake', 'miss', 'blunder'].includes(m.classification)).map((m) => m.ply).slice(0, 8);
  const analysis = { gameId: id, state: 'ready', engine: { name: 'Stockfish', version: '19', depthFast: 14, depthDeep: 20 }, accuracy: { white: avg('white'), black: avg('black') }, counts, initial, moves: analysed, criticalMoments: critical };
  const result = { white: 'win', black: 'checkmated' };
  const detail = {
    white: { name: names[0], rating: ratings[0], result: 'win' }, black: { name: names[1], rating: ratings[1], result: 'checkmated' },
    headers: { Event: 'Demo game', White: names[0], Black: names[1] }, pgn: '', initialFen: new Chess().fen(),
    moves: moves.map(({ ply, san, uci, color, fenAfter }) => ({ ply, san, uci, color, fenAfter })),
  };
  return { detail, analysis, moves };
}

const MINE = 'demo_player';
const OPPONENTS = ['quiet_knight', 'rookie_88', 'castle_fan', 'gambit_gal', 'endgame_ed', 'blitz_bob', 'pawn_storm', 'zugzwang_z'];
const OPENINGS = [['C41', 'Philidor Defense'], ['C60', 'Ruy Lopez'], ['D30', 'Queen’s Gambit Declined'], ['B01', 'Scandinavian Defense'], ['A45', 'Indian Game']];
const CLASSES = ['bullet', 'blitz', 'rapid', 'daily'];

export function buildFixtures() {
  const now = Math.floor(Date.now() / 1000);
  const base = [
    { id: 'g1', sans: SANS_OPERA, evals: OPERA_CP, overrides: OPERA_CLASS, seed: 11, names: [MINE, 'quiet_knight'], ratings: [1512, 1496] },
    { id: 'g2', sans: SANS_RUY, evals: randomCp(SANS_RUY.length, mulberry(5)), seed: 12, names: ['castle_fan', MINE], ratings: [1530, 1508], me: 'black' },
    { id: 'g3', sans: SANS_SHORT, evals: randomCp(SANS_SHORT.length, mulberry(8)), seed: 13, names: [MINE, 'gambit_gal'], ratings: [1505, 1470] },
    { id: 'g4', sans: SANS_SCHOLAR, evals: [30, 25, -200, -250, -150, -50, { cp: 3000 }], seed: 14, names: ['rookie_88', MINE], ratings: [1210, 1500], me: 'black' },
  ];
  const full = {};
  const games = [];
  for (let i = 0; i < 42; i++) {
    const b = base[i % base.length];
    const id = i < base.length ? b.id : `g${i + 1}`;
    const rng = mulberry(100 + i);
    const color = i % 3 === 1 ? 'black' : 'white';
    const result = rng() < 0.5 ? 'win' : rng() < 0.55 ? 'loss' : 'draw';
    const tc = CLASSES[i % 3];
    const analyzed = i % 4 !== 3;
    const opening = OPENINGS[i % OPENINGS.length];
    const accMine = analyzed ? Math.round((62 + rng() * 34) * 10) / 10 : null;
    const myRating = 1480 + Math.round(rng() * 80) + i;
    games.push({
      id, url: `https://example.invalid/game/${id}`, endTime: now - i * 86400 * 1.7 - 3600, timeClass: tc, timeControl: tc === 'bullet' ? '60' : tc === 'blitz' ? '300+2' : '600', rated: true, color,
      opponent: { name: OPPONENTS[i % OPPONENTS.length], rating: 1450 + Math.round(rng() * 120) }, myRating, result, termination: result === 'win' ? 'checkmated' : result === 'loss' ? 'resigned' : 'agreed',
      opening: opening[1], ecoCode: opening[0], analyzed, analysisState: analyzed ? 'ready' : i % 8 === 7 ? 'queued' : 'none',
      accuracy: analyzed ? { mine: accMine, opp: Math.round((60 + rng() * 30) * 10) / 10 } : null, chesscomAccuracy: i % 5 === 0 && analyzed ? { mine: 84.2, opp: 77.9 } : null, demo: true,
    });
  }
  for (const b of base) {
    const g = buildGame(b);
    const summary = games.find((x) => x.id === b.id);
    full[b.id] = { ...summary, ...g.detail, white: { ...g.detail.white }, black: { ...g.detail.black }, color: b.me || 'white', analysisState: 'ready', analyzed: true, demo: true, analysis: g.analysis };
    summary.color = b.me || 'white'; summary.analyzed = true; summary.analysisState = 'ready';
    summary.opponent = { name: b.me === 'black' ? b.names[0] : b.names[1], rating: b.me === 'black' ? b.ratings[0] : b.ratings[1] };
    summary.accuracy = { mine: b.me === 'black' ? g.analysis.accuracy.black : g.analysis.accuracy.white, opp: b.me === 'black' ? g.analysis.accuracy.white : g.analysis.accuracy.black };
    summary.result = b.me === 'black' ? 'loss' : 'win';
  }
  return { games, full };
}

export const COACH_MARKDOWN = `## Summary
You played a sharp opening and kept the initiative. The decisive moment came at move 16.

## Lessons
1. **Develop with tempo.** After **Bc4** the pressure on f7 was real, and **Qb3** doubled it.
2. **Watch loose pieces.** Black’s **b5** let the knight capture with **Nxb5**.
3. A brilliant idea: **Qb8+** forced mate; compare with the weaker **Qh7** that never works here.

## Exercise
Set up the position before **Nxb5** and find all forcing moves for both sides.`;

export function buildStats(games) {
  const analysed = games.filter((g) => g.analyzed);
  const trend = analysed.slice().reverse().map((g) => ({ endTime: g.endTime, accuracy: g.accuracy.mine }));
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr) => (arr.length ? sum(arr) / arr.length : null);
  const last30 = trend.slice(-30).map((p) => p.accuracy), prev30 = trend.slice(-60, -30).map((p) => p.accuracy);
  const res = { win: 0, loss: 0, draw: 0, byColor: { white: { win: 0, loss: 0, draw: 0 }, black: { win: 0, loss: 0, draw: 0 } } };
  for (const g of games) { res[g.result] += 1; res.byColor[g.color][g.result] += 1; }
  const ratings = { bullet: [], blitz: [], rapid: [], daily: [] };
  for (const g of games.slice().reverse()) ratings[g.timeClass].push({ endTime: g.endTime, rating: g.myRating });
  const op = {};
  for (const g of analysed) { const o = (op[g.opening] = op[g.opening] || { ecoCode: g.ecoCode, opening: g.opening, games: 0, w: 0, acc: [] }); o.games++; o.w += g.result === 'win' ? 1 : g.result === 'draw' ? 0.5 : 0; o.acc.push(g.accuracy.mine); }
  return {
    games: games.length, analyzedGames: analysed.length,
    accuracy: { avg30: avg(last30), prev30: avg(prev30) ?? avg(last30) - 2.4, trend },
    results: res,
    classifications: { brilliant: 2, great: 9, best: 118, excellent: 74, good: 61, book: 83, inaccuracy: 34, mistake: 19, miss: 6, blunder: 11 },
    errorsByPhase: { opening: { inaccuracy: 6, mistake: 3, miss: 0, blunder: 1 }, middlegame: { inaccuracy: 20, mistake: 12, miss: 5, blunder: 7 }, endgame: { inaccuracy: 8, mistake: 4, miss: 1, blunder: 3 } },
    openings: Object.values(op).map((o) => ({ ecoCode: o.ecoCode, opening: o.opening, games: o.games, score: o.w / o.games, accuracy: avg(o.acc) })).sort((a, b) => b.games - a.games),
    ratings,
    recurring: { markdown: '- You often lose the thread after move 20 in blitz.\n- Knight forks on c7 cost you **three** games.\n- Endgames: activate the king earlier.', createdAt: new Date(Date.now() - 86400000).toISOString() },
  };
}
