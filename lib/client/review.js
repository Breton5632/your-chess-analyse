// Game review screen (spec 9.2): eval bar + board + player cards + controls on the left,
// header / classification table / eval graph / move list / tabs on the right.
import React from 'react';
import { h, S, Btn, Card, Tabs, Notice, Loading, Empty, ErrorBox, ProgressBar, ClassBadge, Ring, AccuracyNote, Icon, useApp } from './ui.js';
import { Board, EvalBar, PlayerCard } from './board.js';
import { EvalGraph } from './charts.js';
import { ORDER, TOKENS, ERRORS } from './classes.js';
import { START_FEN, uciSquares, formatEval, legalTargets, ownPiece, tryMove, playLine, playSan, sideToMove } from './chessutil.js';
import { reduceNav, isTypingTarget } from './keys.js';
import { errorText } from './api.js';
import { t, fmtDate, fmtNum } from './i18n.js';
import { CoachPanel } from './coach.js';

import { PIECE_SVG } from './board.js';

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Measures an element's width (ResizeObserver) with a deterministic default for tests / SSR.
export function useWidth(ref, fallback = 1200) {
  const [w, setW] = useState(fallback);
  const roRef = useRef({ el: null, ro: null });
  // No dependency array on purpose: the element may only exist after a later render (loading screen first).
  useEffect(() => {
    const el = ref.current;
    const cur = roRef.current;
    if (el === cur.el) return;
    if (cur.ro) cur.ro.disconnect();
    cur.el = el; cur.ro = null;
    if (!el) return;
    const read = () => setW(el.getBoundingClientRect().width || fallback);
    read();
    if (typeof ResizeObserver !== 'undefined') { cur.ro = new ResizeObserver(read); cur.ro.observe(el); }
  });
  useEffect(() => () => { if (roRef.current.ro) roRef.current.ro.disconnect(); }, []);
  return w;
}
export function useViewportHeight(fallback = 900) {
  const [v, setV] = useState(typeof window === 'undefined' ? fallback : window.innerHeight || fallback);
  useEffect(() => {
    const f = () => setV(window.innerHeight || fallback);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, [fallback]);
  return v;
}

const resultKey = (r) => (r === 'win' || r === 'loss' || r === 'draw' ? r : 'draw');
export const resultColor = (r) => (r === 'win' ? 'var(--cc-win)' : r === 'loss' ? 'var(--cc-loss)' : 'var(--cc-draw)');

function lineLabel(fen, sans) {
  const parts = String(fen || START_FEN).split(' ');
  let n = Number(parts[5]) || 1;
  let white = parts[1] !== 'b';
  return sans.map((s, i) => {
    const label = white ? `${n}.${s}` : i === 0 ? `${n}…${s}` : s;
    if (!white) n += 1;
    white = !white;
    return label;
  });
}

// ---- right panel pieces ----
function OpeningsCard({ detail, onSelect }) {
  const o = detail.openings || {};
  const rows = [['white', o.white], ['black', o.black]];
  if (!o.white && !o.black) return null;
  const moveNo = (e) => `${Math.ceil(e.ply / 2)}${e.ply % 2 ? '.' : '...'} ${e.san}`;
  return h(Card, { title: t('review.openings'), style: { padding: 14 } },
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
      rows.map(([c, e]) => h('button', { key: c, type: 'button', className: 'cc-hover', disabled: !e, onClick: e ? () => onSelect(e.ply) : undefined, 'data-opening': c,
        style: { display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', padding: '8px 10px', borderRadius: 14, border: '1px solid var(--cc-border)', background: 'var(--cc-panel2)', cursor: e ? 'pointer' : 'default', minWidth: 0 } },
        h('span', { 'aria-hidden': true, style: { width: 18, height: 18, borderRadius: 999, flex: 'none', background: c === 'white' ? '#fff' : '#1d1d1f', border: '1.5px solid var(--cc-muted)' } }),
        h('span', { style: { display: 'grid', gap: 2, minWidth: 0 } },
          h('span', { style: { fontSize: 12, color: 'var(--cc-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' } }, `${t(c === 'white' ? 'common.white' : 'common.black')}${detail[c] && detail[c].name ? ' · ' + detail[c].name : ''}`),
          h('span', { style: { fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' } }, e ? e.name : t('review.noOpening')),
          e ? h('span', { style: { fontSize: 12.5, color: 'var(--cc-muted)' } }, `${e.eco} · ${moveNo(e)}`) : null)))));
}

function ReviewHeader({ detail, analysis }) {
  const acc = analysis && analysis.accuracy;
  const elo = (analysis && analysis.elo) || {};
  const term = detail.termination ? t(`term.${detail.termination}`) : '';
  const termText = term && !term.startsWith('term.') ? term : detail.termination || '';
  const meta = [detail.timeClass ? t(`tc.${detail.timeClass}`) : null, fmtDate(detail.endTime), detail.rated ? t('games.rated') : null].filter(Boolean).join(' · ');
  const rk = resultKey(detail.result);
  const meColor = detail.color === 'black' ? 'black' : 'white';
  const oppColor = meColor === 'white' ? 'black' : 'white';
  const winnerColor = rk === 'win' ? meColor : rk === 'loss' ? oppColor : null;
  const winnerName = winnerColor && detail[winnerColor] && detail[winnerColor].name;
  const score = winnerColor === 'white' ? '1 – 0' : winnerColor === 'black' ? '0 – 1' : '½ – ½';
  const banner = h('div', { 'data-result-banner': rk, role: 'status', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 14, border: `1.5px solid ${resultColor(detail.result)}`, background: 'var(--cc-panel2)' } },
    h('span', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 } },
      h('span', { 'aria-hidden': true, style: { fontSize: 22 } }, rk === 'draw' ? '🤝' : '🏆'),
      h('span', { style: { display: 'grid', minWidth: 0 } },
        h('span', { style: { fontSize: 18, fontWeight: 800, color: resultColor(detail.result), lineHeight: 1.15 } }, t(`result.${rk}`)),
        h('span', { style: { fontSize: 13, color: 'var(--cc-muted)', overflow: 'hidden', textOverflow: 'ellipsis' } },
          [winnerName ? t('review.winner', { name: winnerName }) : t('review.drawText'), termText].filter(Boolean).join(' · ')))),
    h('span', { style: { fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' } }, score));
  return h('div', { style: { display: 'grid', gap: 8 } },
    h('strong', { style: { fontSize: 15 } }, t('review.title')),
    banner,
    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
      [['white', detail.white, acc && acc.white], ['black', detail.black, acc && acc.black]].map(([c, p, a]) =>
        h('div', { key: c, style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, padding: '6px 8px', borderRadius: 14, background: 'var(--cc-panel2)', border: winnerColor === c ? '1.5px solid var(--cc-win)' : '1.5px solid transparent' } },
          h(Ring, { value: a == null ? null : a, size: 54, label: t('accuracy.label') + ' – ' + (p && p.name) }),
          h('div', { style: { display: 'grid', minWidth: 0 } },
            h('span', { style: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, (p && p.name) || t(`common.${c}`)),
            h('span', { title: t('review.eloNote'), 'data-elo': c, style: { fontSize: 12.5, color: 'var(--cc-muted)', fontVariantNumeric: 'tabular-nums' } }, elo[c] != null ? t('review.eloEstimate', { value: elo[c] }) : t('review.eloNone')))))),
    h('div', { title: t('accuracy.note'), style: { fontSize: 12, color: 'var(--cc-muted)' } }, meta));
}

function ClassTable({ analysis }) {
  const counts = analysis.counts || { white: {}, black: {} };
  return h('table', { 'aria-label': t('review.classTable'), style: { fontSize: 13 } },
    h('thead', null, h('tr', null, h('th', null, t('review.classification')), h('th', { style: { textAlign: 'right' } }, t('common.white')), h('th', { style: { textAlign: 'right' } }, t('common.black')))),
    h('tbody', null, ORDER.map((c) => h('tr', { key: c, className: 'cc-row', 'data-class': c },
      h('td', { style: { padding: '4px 10px' } }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, h(ClassBadge, { cls: c, size: 16 }), t(`class.${c}`))),
      h('td', { style: { textAlign: 'right', padding: '4px 10px', fontVariantNumeric: 'tabular-nums', color: (counts.white[c] || 0) ? undefined : 'var(--cc-muted)' } }, counts.white[c] || 0),
      h('td', { style: { textAlign: 'right', padding: '4px 10px', fontVariantNumeric: 'tabular-nums', color: (counts.black[c] || 0) ? undefined : 'var(--cc-muted)' } }, counts.black[c] || 0)))));
}

const FIG = { K: 1, Q: 1, R: 1, B: 1, N: 1 };
function Figurine({ san, color, size = 17 }) {
  const letter = san && FIG[san[0]] ? san[0] : null;
  const key = letter ? (color === 'black' ? 'b' : 'w') + letter : null;
  if (!key || !PIECE_SVG[key]) return h('span', null, san);
  return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 1 } },
    h('svg', { viewBox: '0 0 45 45', width: size + 3, height: size + 3, 'aria-hidden': true, style: { flex: 'none' } }, h('g', { dangerouslySetInnerHTML: { __html: PIECE_SVG[key] } })),
    h('span', null, san.slice(1)));
}

// Full move list with piece figurines (click = jump the board to that move).
function FullMoves({ moves, ply, onSelect }) {
  const box = useRef(null);
  const curRef = useRef(null);
  useEffect(() => {
    const b = box.current, c = curRef.current;
    if (!b || !c) return;
    const top = c.offsetTop - b.offsetTop;
    if (top < b.scrollTop) b.scrollTop = Math.max(0, top - 4);
    else if (top + c.offsetHeight > b.scrollTop + b.clientHeight) b.scrollTop = top + c.offsetHeight - b.clientHeight + 4;
  }, [ply]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);
  const cell = (m) => {
    if (!m) return h('div');
    const on = m.ply === ply;
    return h('button', { type: 'button', ref: on ? curRef : undefined, 'data-ply': m.ply, 'aria-current': on ? 'step' : undefined, className: 'cc-hover', onClick: () => onSelect(m.ply),
      style: { display: 'flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer', textAlign: 'left', padding: '7px 10px', borderRadius: 10, fontSize: 15.5, fontWeight: 700, minWidth: 0, background: on ? 'var(--cc-sel)' : 'transparent', outline: on ? '1.5px solid var(--cc-accent)' : 'none', color: 'inherit' } },
      h(Figurine, { san: m.san, color: m.color }),
      m.classification && ERRORS.has(m.classification) ? h(ClassBadge, { cls: m.classification, size: 14 }) : null);
  };
  return h('div', { ref: box, role: 'group', 'aria-label': t('review.moveList'), style: { height: '100%', minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: '44px 1fr 1fr', gap: '2px 4px', alignContent: 'start' } },
    rows.map(([w, b], i) => h(React.Fragment, { key: i },
      h('div', { style: { color: 'var(--cc-muted)', padding: '7px 6px 7px 0', textAlign: 'right', fontWeight: 700, fontSize: 14.5, fontVariantNumeric: 'tabular-nums' } }, i + 1 + '.'),
      cell(w), cell(b))));
}

// A card that folds / unfolds like a tab.
function Fold({ title, open, onToggle, children, style }) {
  return h('section', { style: { ...S.card, padding: 0, overflow: 'hidden', minWidth: 0, ...style } },
    h('button', { type: 'button', 'aria-expanded': open, onClick: onToggle, className: 'cc-hover', style: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', fontSize: 15, fontWeight: 700, textAlign: 'left' } },
      h('span', null, title),
      h('span', { 'aria-hidden': true, style: { display: 'inline-block', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--cc-muted)' } }, '▾')),
    open ? h('div', { style: { padding: '0 6px 12px' } }, children) : null);
}

function LineRow({ line, fen, onPlay, index }) {
  const labels = lineLabel(fen, line.san || []);
  return h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderTop: index ? '1px solid var(--cc-border)' : 'none' } },
    h('span', { style: { minWidth: 46, textAlign: 'center', fontWeight: 800, fontSize: 12.5, padding: '3px 6px', borderRadius: 4, background: line.eval && ((line.eval.mate != null ? line.eval.mate > 0 : (line.eval.cp || 0) >= 0)) ? '#ffffff' : '#403d39', color: line.eval && ((line.eval.mate != null ? line.eval.mate > 0 : (line.eval.cp || 0) >= 0)) ? '#262421' : '#f2f0ec', border: '1px solid var(--cc-border)' } }, formatEval(line.eval)),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 2 } }, labels.map((lab, i) => h('button', {
      key: i, type: 'button', onClick: () => onPlay(i), className: 'cc-hover', 'data-san': line.san[i], title: t('review.tryHint'),
      style: { border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 5px', borderRadius: 4, fontSize: 13.5, fontWeight: 600 },
    }, lab))));
}

function AnalysisTab({ analysis, move, ply, fen, fenBefore, onTry, partialMove }) {
  if (!analysis) return h(Empty, { title: t('review.noAnalysisTitle') }, t('review.noAnalysisTab'));
  const lines = ply === 0 ? (analysis.initial && analysis.initial.lines) || [] : move && move.topLines ? move.topLines : [];
  return h('div', { style: { display: 'grid', gap: 10 } },
    move ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h(ClassBadge, { cls: move.classification, size: 22 }),
      h('strong', null, `${move.san}`), h('span', { style: S.muted }, t(`class.${move.classification}`)),
      move.loss != null && move.loss > 0.005 ? h('span', { style: S.muted }, t('review.loss', { value: fmtNum(move.loss * 100, 1) })) : null) : h('div', { style: S.muted }, t('review.startPosition')),
    move && move.bestSan && move.bestUci !== move.uci ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13.5 } },
      h('span', { style: S.muted }, t('review.bestWas')),
      h('button', { type: 'button', className: 'cc-hover', 'data-san': move.bestSan, onClick: () => onTry(fenBefore, move.line && move.line.length ? move.line : [move.bestSan], 0), style: { border: '1px solid var(--cc-border)', background: 'var(--cc-panel2)', cursor: 'pointer', borderRadius: 4, padding: '2px 8px', fontWeight: 700 } }, move.bestSan)) : null,
    partialMove ? h(Notice, { kind: 'warn' }, t('review.moveFailed')) : null,
    h('div', null,
      h('div', { style: { fontSize: 12, color: 'var(--cc-muted)', marginBottom: 2 } }, t('review.engineLines')),
      lines.length ? lines.slice(0, 2).map((ln, i) => h(LineRow, { key: i, index: i, line: ln, fen, onPlay: (k) => onTry(fen, ln.san, k) })) : h('div', { style: { ...S.muted, fontSize: 13 } }, t('review.noLines'))));
}

// ---- main screen ----
export function ReviewScreen({ gameId, initialPly, initialTab, onBack, goTo }) {
  const app = useApp();
  const { api, status, live, settings, setSetting } = app;
  const [detail, setDetail] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [aError, setAError] = useState(null);
  const [ply, setPly] = useState(initialPly || 0);
  const [flipped, setFlipped] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState(initialTab || 'analysis');
  const [classOpen, setClassOpen] = useState(false);
  const [tryS, setTryS] = useState(null);
  const [sel, setSel] = useState(null);
  const [poll, setPoll] = useState(0);
  const [busy, setBusy] = useState(false);
  const wrap = useRef(null);
  const W = useWidth(wrap);
  const stageRef = useRef(null);
  const [stageTop, setStageTop] = useState(150);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const top = Math.round(el.getBoundingClientRect().top);
    if (Math.abs(top - stageTop) > 2) setStageTop(top);
  });
  const vh = useViewportHeight();

  // Game detail (once per game).
  const loadDetail = useCallback(async () => {
    setError(null);
    try {
      const d = await api.get(`games/${gameId}`);
      setDetail(d);
      setFlipped(d.color === 'black');
    } catch (e) { setError(e); }
  }, [api, gameId]);
  useEffect(() => { setDetail(null); setAnalysis(null); setPly(initialPly || 0); setTryS(null); setSel(null); setPlaying(false); loadDetail(); }, [gameId]);

  // Analysis: on mount, on realtime signal for this game, and by polling while it runs.
  const gameTick = (live.analysisTick[gameId] || 0) + live.analysisAny;
  useEffect(() => {
    let alive = true;
    api.get(`analysis/${gameId}`).then((a) => { if (alive) { setAnalysis(a); setAError(null); } }, (e) => { if (alive) setAError(e); });
    return () => { alive = false; };
  }, [api, gameId, gameTick, poll]);
  const running = analysis && (analysis.state === 'pending' || analysis.state === 'running');
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setPoll((n) => n + 1), 3000);
    return () => clearInterval(id);
  }, [running]);

  const ready = analysis && (analysis.state === 'ready' || analysis.state === 'partial');
  const moves = useMemo(() => (ready ? analysis.moves : (detail && detail.moves) || []), [ready, analysis, detail]);
  const max = moves.length;
  const move = ply > 0 ? moves[ply - 1] : null;
  const baseFen = ply === 0 ? (detail && detail.initialFen) || START_FEN : move && move.fenAfter;
  const fenBefore = ply === 0 ? null : ply === 1 ? (detail && detail.initialFen) || START_FEN : moves[ply - 2].fenAfter;

  // Variation board (not persisted).
  const startTry = useCallback((fen0, sans, upto) => {
    const pl = playLine(fen0, sans.slice(0, upto + 1));
    if (!pl.sans.length) return;
    setPlaying(false); setSel(null);
    setTryS({ fen0, sans: pl.sans, fens: pl.fens, moves: pl.moves, idx: pl.sans.length });
  }, []);
  const exitTry = useCallback(() => { setTryS(null); setSel(null); }, []);
  const fen = tryS ? tryS.fens[tryS.idx] : baseFen;
  useEffect(() => { setSel(null); }, [fen]);

  const onSquare = (sq) => {
    if (!fen) return;
    if (sel && sel !== sq) {
      const m = tryMove(fen, sel, sq);
      if (m) {
        setPlaying(false);
        setTryS((cur) => {
          const base = cur || { fen0: baseFen, sans: [], fens: [baseFen], moves: [], idx: 0 };
          const sans = base.sans.slice(0, base.idx).concat(m.san);
          const fens = base.fens.slice(0, base.idx + 1).concat(m.fen);
          const mv = base.moves.slice(0, base.idx).concat({ from: sel, to: sq });
          return { ...base, sans, fens, moves: mv, idx: sans.length };
        });
        setSel(null);
        return;
      }
    }
    if (ownPiece(fen, sq)) setSel(sel === sq ? null : sq); else setSel(null);
  };

  // Keyboard: arrows, Home/End, F, Space, Esc.
  const nav = useRef();
  nav.current = { ply, max, flipped, playing, tryS };
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const s = nav.current;
      if (e.key === 'Escape') { if (s.tryS) { exitTry(); e.preventDefault(); } return; }
      if (s.tryS && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End')) {
        const last = s.tryS.sans.length;
        const idx = e.key === 'ArrowLeft' ? s.tryS.idx - 1 : e.key === 'ArrowRight' ? s.tryS.idx + 1 : e.key === 'Home' ? 0 : last;
        setTryS({ ...s.tryS, idx: Math.max(0, Math.min(last, idx)) });
        e.preventDefault();
        return;
      }
      if (e.key === ' ' && e.target && e.target.tagName === 'BUTTON') return;
      const next = reduceNav(s, e.key);
      if (!next) return;
      e.preventDefault();
      setPly(next.ply); setFlipped(next.flipped); setPlaying(next.playing);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitTry]);

  // Autoplay (timer cleaned on pause / unmount).
  useEffect(() => {
    if (!playing || tryS) return undefined;
    const id = setInterval(() => setPly((p) => { if (p >= max) { setPlaying(false); return p; } return p + 1; }), 1000);
    return () => clearInterval(id);
  }, [playing, tryS, max]);

  const enqueue = async () => {
    setBusy(true);
    try { await api.post('analysis/enqueue', { gameIds: [gameId], priority: 1 }); setPoll((n) => n + 1); } catch (e) { setAError(e); } finally { setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true);
    try { await api.post('analysis/cancel', { gameId }); setPoll((n) => n + 1); } catch (e) { setAError(e); } finally { setBusy(false); }
  };

  if (error) return h('div', { style: { display: 'grid', gap: 12 } }, h(ErrorBox, { error, text: errorText(t, error), onRetry: loadDetail }), onBack ? h('div', null, h(Btn, { onClick: onBack }, t('review.back'))) : null);
  if (!detail) return h(Loading, { label: t('review.loading') });

  // ---- layout: on a wide window everything fits the viewport (no page scroll) ----
  const wide = W >= 1100;
  const stageH = wide ? Math.max(480, vh - stageTop - 58) : 0;
  const boardSize = Math.round(Math.max(260, Math.min(wide ? Math.min(stageH - 165, W - 420 - 28 - 40) : W - 40, 1100)));
  const colW = boardSize + 32;
  const panelW = wide ? Math.max(420, W - colW - 28) : 0;
  const dual = wide && panelW >= 860;

  const showEval = ready && !tryS;
  const curEval = ply === 0 ? (analysis && analysis.initial && analysis.initial.eval) : move && move.evalAfter;
  const lastM = tryS ? tryS.moves[tryS.idx - 1] : move ? uciSquares(move.uci) : null;
  const arrow = !tryS && ready && settings.showBestArrow && move && move.bestUci && move.bestUci !== move.uci ? uciSquares(move.bestUci) : null;
  const badge = !tryS && ready && move && move.classification && lastM ? { square: lastM.to, cls: move.classification } : null;
  const targets = sel && fen ? legalTargets(fen, sel) : [];
  const top = flipped ? detail.white : detail.black;
  const bottom = flipped ? detail.black : detail.white;
  const topColor = flipped ? 'white' : 'black';
  const bottomColor = flipped ? 'black' : 'white';
  const tryAt = tryS ? tryS.idx : 0;

  const stepBtn = (label, icon, onClick, disabled, key) => h('button', { key, type: 'button', 'aria-label': label, title: label, onClick, disabled, className: 'cc-hover cc-icon', style: { border: '1px solid var(--cc-border)', background: 'var(--cc-panel2)', borderRadius: 16, width: 62, height: 54, display: 'grid', placeItems: 'center', cursor: 'pointer' } }, icon);
  const prog = (live.progress[gameId]) || (analysis && analysis.progress) || null;
  const engineBad = status && status.engine && (status.engine.state === 'error' || status.engine.state === 'missing');

  const controls = h('div', { role: 'toolbar', 'aria-label': t('review.controls'), style: { display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 10 } },
    stepBtn(t('review.first'), Icon.first(28), () => (tryS ? setTryS({ ...tryS, idx: 0 }) : (setPly(0), setPlaying(false))), tryS ? tryAt === 0 : ply === 0, 'first'),
    stepBtn(t('review.prev'), Icon.prev(28), () => (tryS ? setTryS({ ...tryS, idx: Math.max(0, tryAt - 1) }) : (setPly(Math.max(0, ply - 1)), setPlaying(false))), tryS ? tryAt === 0 : ply === 0, 'prev'),
    stepBtn(playing ? t('review.pause') : t('review.play'), playing ? Icon.pause(28) : Icon.play(28), () => setPlaying((p) => (ply >= max ? false : !p)), !!tryS || max === 0, 'play'),
    stepBtn(t('review.next'), Icon.next(28), () => (tryS ? setTryS({ ...tryS, idx: Math.min(tryS.sans.length, tryAt + 1) }) : setPly(Math.min(max, ply + 1))), tryS ? tryAt >= tryS.sans.length : ply >= max, 'next'),
    stepBtn(t('review.last'), Icon.last(28), () => (tryS ? setTryS({ ...tryS, idx: tryS.sans.length }) : (setPly(max), setPlaying(false))), tryS ? tryAt >= tryS.sans.length : ply >= max, 'last'),
    h('span', { style: { width: 8 } }),
    stepBtn(t('review.flip'), Icon.flip(28), () => setFlipped((f) => !f), false, 'flip'),
    ready ? h('button', { key: 'arrow', type: 'button', 'aria-pressed': !!settings.showBestArrow, title: t('review.arrowToggle'), onClick: () => setSetting('showBestArrow', !settings.showBestArrow), className: 'cc-hover', style: { border: '1px solid var(--cc-border)', background: settings.showBestArrow ? 'var(--cc-sel)' : 'var(--cc-panel2)', borderRadius: 16, height: 54, padding: '0 16px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 } }, Icon.arrow(20), t('review.arrow')) : null);

  const banners = h('div', { style: { display: 'grid', gap: 10 } },
    running ? h(Notice, { kind: 'info', title: t('review.analysing'), action: h(Btn, { small: true, disabled: busy, onClick: cancel }, t('common.cancel')) },
      h('div', { style: { display: 'grid', gap: 6 } },
        h('div', null, prog && prog.total ? t('review.progress', { done: prog.done, total: prog.total, phase: prog.phase || 'A' }) : t('review.queued')),
        h(ProgressBar, { done: prog ? prog.done : 0, total: prog ? prog.total : 0, label: t('review.analysing') }))) : null,
    analysis && analysis.state === 'none' ? h(Notice, { kind: 'info', title: t('review.noAnalysisTitle'), action: h(Btn, { primary: true, disabled: busy || engineBad, onClick: enqueue }, t('games.analyse')) }, engineBad ? t('review.engineBlocked') : t('review.noAnalysis')) : null,
    analysis && (analysis.state === 'invalid' || analysis.state === 'failed') ? h(Notice, { kind: 'error', title: t(`review.state.${analysis.state}`), action: h(Btn, { small: true, disabled: busy, onClick: enqueue }, t('review.retryAnalysis')) }, analysis.error || t('errors.generic')) : null,
    analysis && analysis.state === 'partial' ? h(Notice, { kind: 'warn', title: t('review.partialTitle') }, t('review.partial')) : null,
    engineBad && !(analysis && analysis.state === 'none') ? h(Notice, { kind: 'error', title: t('review.engineError') }, (status.engine && status.engine.error) || t('review.engineBlocked')) : null,
    aError ? h(ErrorBox, { error: aError, text: errorText(t, aError), onRetry: () => setPoll((n) => n + 1) }) : null,
    tryS ? h(Notice, { kind: 'warn', action: h(Btn, { small: true, onClick: exitTry }, t('review.exitTry')) }, t('review.tryBanner')) : null);

  const left = h('div', { style: { width: wide ? colW : '100%', flex: 'none', minWidth: 0, display: 'grid', gap: 8, alignContent: 'start' } },
    h('div', { style: { paddingLeft: 32 } }, h(PlayerCard, { name: top && top.name, rating: top && top.rating, color: topColor })),
    h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' }, id: 'cc-board-row' },
      h(EvalBar, { ev: curEval, height: boardSize, flipped, dim: !!tryS || !ready }),
      h('div', { style: { width: boardSize, flex: 'none' } },
        h(Board, { fen: fen || START_FEN, flipped, lastMove: lastM, arrow, badge, selected: sel, targets, onSquare, interactive: true }))),
    h('div', { style: { paddingLeft: 32 } }, h(PlayerCard, { name: bottom && bottom.name, rating: bottom && bottom.rating, color: bottomColor })),
    h('div', { style: { paddingLeft: 32 } }, controls),
    h('div', { style: { fontSize: 11.5, color: 'var(--cc-muted)', textAlign: 'center' } }, t('review.keys')));

  const noMoves = max === 0;
  const tabs = [['analysis', t('review.tabAnalysis')], ['coach', t('review.tabCoach')]];
  const pick = (p) => { exitTry(); setPly(p); setPlaying(false); };
  const colA = [
    h(Card, { key: 'hd', style: { padding: 14, flex: 'none' } }, h(ReviewHeader, { detail, analysis: ready ? analysis : null })),
    h('div', { key: 'op', style: { flex: 'none' } }, h(OpeningsCard, { detail, onSelect: pick })),
    ready ? h(Card, { key: 'gr', title: t('review.graph'), style: { padding: '10px 14px', flex: 'none' } }, h(EvalGraph, { height: 150, initial: analysis.initial && analysis.initial.eval, moves: analysis.moves, ply, onSelect: pick })) : null,
  ];
  const tabPanel = h('section', { key: 'tabs', style: { ...S.card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: dual ? '1 1 0' : 'none', minHeight: dual ? 0 : undefined } },
    h(Tabs, { options: tabs, value: tab, onChange: setTab, label: t('review.tabs') }),
    h('div', { role: 'tabpanel', 'aria-labelledby': `cc-tab-${tab}`, style: { padding: 14, flex: 1, minHeight: 0, overflowY: dual ? 'auto' : 'visible' } },
      tab === 'analysis' ? h(AnalysisTab, { analysis: ready ? analysis : null, move: ready ? move : null, ply, fen: baseFen, fenBefore, onTry: startTry, partialMove: ready && move && move.failed })
        : h(CoachPanel, { gameId, analysisReady: !!ready, onGoAnalyse: enqueue })));
  const movesBlock = h(Card, { key: 'ml', title: t('review.moveList'), style: { display: 'flex', flexDirection: 'column', flex: dual ? '1 1 0' : 'none', minHeight: dual ? 120 : undefined, overflow: 'hidden', padding: '12px 10px 10px' } },
    noMoves ? h('div', { style: S.muted }, t('review.noMoves')) : h('div', { style: { flex: 1, minHeight: 0, height: dual ? undefined : 300 } }, h(FullMoves, { moves, ply, onSelect: pick })));
  const colB = [
    ready ? h(Fold, { key: 'cl', title: t('review.classification'), open: classOpen, onToggle: () => setClassOpen((o) => !o), style: { flex: 'none' } }, h(ClassTable, { analysis })) : null,
    movesBlock,
    tabPanel,
  ];
  const col = (kids, extra) => h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, minHeight: 0, ...extra } }, kids);
  const right = !wide
    ? col([...colA, ...colB], { width: '100%' })
    : dual
      ? h('div', { style: { width: panelW, flex: 'none', display: 'flex', gap: 12, height: stageH, minHeight: 0 } }, col(colA, { flex: '1 1 0', height: '100%' }), col(colB, { flex: '1 1 0', height: '100%' }))
      : col([...colA, ...colB], { width: panelW, flex: 'none', height: stageH, overflowY: 'auto', paddingRight: 4 });

  return h('div', { ref: wrap, style: { display: 'grid', gap: 12 } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      onBack ? h(Btn, { small: true, onClick: onBack }, '← ' + t('review.back')) : null,
      h('span', { style: { color: 'var(--cc-muted)', fontSize: 13 } }, `${detail.white && detail.white.name} – ${detail.black && detail.black.name}`)),
    banners,
    noMoves && !running ? h(Empty, { title: t('review.noMovesTitle'), action: onBack ? h(Btn, { onClick: onBack }, t('review.back')) : null }, t('review.noMoves')) : null,
    h('div', { ref: stageRef, style: { display: 'flex', gap: 24, flexWrap: wide ? 'nowrap' : 'wrap', alignItems: 'flex-start', justifyContent: wide ? 'flex-start' : 'center', ...(wide ? { height: stageH, overflow: 'hidden' } : {}) } }, left, right));
}
