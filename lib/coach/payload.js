// What is sent to the coach: compact JSON (<= 24 000 chars), scrubbed. No username, no setting, no path.
import { scrub } from './sancheck.js';
import { ERROR_CLASSES, PHASES } from '../store.js';

export const MAX_JSON = 24_000;
const MAX_CRITICAL = 8;

const r3 = (n) => (typeof n === 'number' ? Math.round(n * 1000) / 1000 : n ?? null);
const r1 = (n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : n ?? null);
const dateOf = (endTime) => (Number.isFinite(endTime) ? new Date(endTime * 1000).toISOString().slice(0, 10) : null);

function gameMeta(g) {
  return {
    date: dateOf(g.endTime), timeClass: g.timeClass, timeControl: g.timeControl, rated: g.rated,
    yourColor: g.color, yourRating: g.myRating, opponentRating: g.opponent?.rating ?? null,
    result: g.result, termination: g.termination, opening: g.opening, ecoCode: g.ecoCode,
  };
}

function criticalOf(analysis, summary, max, lineLen) {
  const byPly = new Map((analysis.moves || []).map((m) => [m.ply, m]));
  let plies = (analysis.criticalMoments || []).filter((p) => byPly.has(p));
  if (!plies.length) {
    plies = (analysis.moves || []).filter((m) => ERROR_CLASSES.includes(m.classification)).sort((a, b) => (b.loss ?? 0) - (a.loss ?? 0)).map((m) => m.ply);
  }
  plies = plies.map((p) => byPly.get(p)).sort((a, b) => (b.loss ?? 0) - (a.loss ?? 0)).slice(0, max).map((m) => m.ply).sort((a, b) => a - b);
  return plies.map((p) => {
    const m = byPly.get(p);
    return {
      ply: m.ply, moveNumber: Math.ceil(m.ply / 2), by: m.color === summary.color ? 'you' : 'opponent',
      fenBefore: m.fenBefore, played: m.san, best: m.bestSan ?? null, loss: r3(m.loss),
      classification: m.classification, phase: m.phase ?? null, line: (m.line || []).slice(0, lineLen),
    };
  });
}

function countsOf(analysis, summary) {
  const me = summary.color === 'black' ? 'black' : 'white';
  const opp = me === 'white' ? 'black' : 'white';
  return { you: analysis.counts?.[me] ?? {}, opponent: analysis.counts?.[opp] ?? {} };
}

function errorsByPhase(analysis, summary) {
  const out = Object.fromEntries(PHASES.map((p) => [p, 0]));
  for (const m of analysis.moves || []) if (m.color === summary.color && ERROR_CLASSES.includes(m.classification) && out[m.phase] !== undefined) out[m.phase] += 1;
  return out;
}

/**
 * Game payload. `summary` is a GameSummary, `analysis` a GameAnalysis (or null when not analysed).
 * @returns {{ obj: object, json: string, allowed: Set<string> }} allowed = SAN moves actually present in `json`
 */
export function buildGamePayload({ summary, analysis, language = 'auto' }) {
  const stages = [
    { crit: MAX_CRITICAL, lineLen: 6, moves: true },
    { crit: MAX_CRITICAL, lineLen: 6, moves: false },
    { crit: 5, lineLen: 4, moves: false },
    { crit: 3, lineLen: 2, moves: false },
  ];
  let last;
  for (const st of stages) {
    const allowed = new Set();
    const obj = { type: 'game_review', language, game: gameMeta(summary), plies: null };
    if (analysis && analysis.moves) {
      obj.plies = analysis.moves.length;
      obj.coachAccuracy = { you: r1(summary.color === 'black' ? analysis.accuracy?.black : analysis.accuracy?.white), opponent: r1(summary.color === 'black' ? analysis.accuracy?.white : analysis.accuracy?.black) };
      obj.moveCounts = countsOf(analysis, summary);
      obj.yourErrorsByPhase = errorsByPhase(analysis, summary);
      obj.criticalMoments = criticalOf(analysis, summary, st.crit, st.lineLen);
      for (const c of obj.criticalMoments) {
        allowed.add(c.played);
        if (c.best) allowed.add(c.best);
        for (const s of c.line) allowed.add(s);
      }
      if (st.moves) {
        const sans = analysis.moves.map((m) => m.san);
        obj.moves = sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${s}` : s)).join(' ');
        for (const s of sans) allowed.add(s);
      }
    }
    if (summary.chesscomAccuracy) obj.chesscomAccuracy = { you: summary.chesscomAccuracy.mine, opponent: summary.chesscomAccuracy.opp };
    const clean = scrub(obj);
    const json = JSON.stringify(clean);
    last = { obj: clean, json, allowed };
    if (json.length <= MAX_JSON) return last;
  }
  return { ...last, json: last.json.slice(0, MAX_JSON) };
}

const INSTRUCTIONS = {
  game: 'Write the coaching report for this game: what went well, at most 3 lessons, exactly 1 exercise. Only cite moves present in the data.',
  ask: 'Answer the question below using only this data. Only cite moves present in the data. If the data does not cover it, say so.',
};

/** The full text of the request message. `kind`: 'game' | 'ask'. */
export function renderMessage({ kind, json, question, history = [] }) {
  const L = [`# Chess Insight request (${kind === 'ask' ? 'question' : 'game report'})`, '', INSTRUCTIONS[kind], '', '## Data (JSON, every evaluation computed by the chess engine)', '```json', json, '```', ''];
  if (history.length) {
    L.push('## Previous exchanges (oldest first)', '');
    for (const h of history) L.push(`**${h.role === 'user' ? 'Player' : 'Coach'}**: ${String(h.content ?? '').slice(0, 1200)}`, '');
  }
  if (question) L.push('## Question', '', question, '');
  L.push('---', 'Reply once with agent_reply on this message, in light markdown.');
  return L.join('\n');
}
