// Home-made SVG board (no third-party board library). Pieces: cburnett SVGs (Colin M. L. Burnett),
// inlined into the bundle as data URIs. One SVG, viewBox 800x800, scales with its container.
import React from 'react';
import { piecesFromFen, squareAt, FILES, winPct, formatEval, whiteLeads } from './chessutil.js';
import { TOKENS, inkFor } from './classes.js';
import { Glyph, h } from './ui.js';
import { BOARD } from './theme.js';
import { t } from './i18n.js';
import wK from '../../assets/pieces/wK.svg';
import wQ from '../../assets/pieces/wQ.svg';
import wR from '../../assets/pieces/wR.svg';
import wB from '../../assets/pieces/wB.svg';
import wN from '../../assets/pieces/wN.svg';
import wP from '../../assets/pieces/wP.svg';
import bK from '../../assets/pieces/bK.svg';
import bQ from '../../assets/pieces/bQ.svg';
import bR from '../../assets/pieces/bR.svg';
import bB from '../../assets/pieces/bB.svg';
import bN from '../../assets/pieces/bN.svg';
import bP from '../../assets/pieces/bP.svg';

const RAW = { wK, wQ, wR, wB, wN, wP, bK, bQ, bR, bB, bN, bP };
// Pieces are inlined as <g> (no data: URI, so no CSP img-src dependency). The loader is `text`: RAW values are SVG source.
export const PIECE_SVG = Object.fromEntries(Object.entries(RAW).map(([k, svg]) => [k, (/<svg[^>]*>([\s\S]*)<\/svg>/.exec(svg) || [])[1] || '']));

const C = 100;
const center = (sq, flipped) => {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]) - 1;
  const col = flipped ? 7 - f : f;
  const row = flipped ? r : 7 - r;
  return { x: col * C + C / 2, y: row * C + C / 2, col, row };
};

function Arrow({ from, to, flipped }) {
  const a = center(from, flipped), b = center(to, flipped);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, head = 34, w = 15;
  const sx = a.x + ux * 18, sy = a.y + uy * 18;
  const ex = b.x - ux * head * 0.55, ey = b.y - uy * head * 0.55;
  const bx = b.x - ux * head, by = b.y - uy * head;
  return h('g', { 'aria-hidden': true, opacity: 0.85, pointerEvents: 'none' },
    h('line', { x1: sx, y1: sy, x2: bx + ux * 4, y2: by + uy * 4, stroke: '#81b64c', strokeWidth: w, strokeLinecap: 'round' }),
    h('polygon', { points: `${b.x - ux * 6},${b.y - uy * 6} ${bx - uy * 24},${by + ux * 24} ${bx + uy * 24},${by - ux * 24}`, fill: '#81b64c' }),
    ex === sx ? null : null);
}

export function Board({ fen, flipped = false, lastMove, arrow, badge, selected, targets = [], onSquare, interactive = false, dim = false, label }) {
  const pieces = piecesFromFen(fen);
  const cells = [];
  const overlays = [];
  const imgs = [];
  for (let i = 0; i < 64; i++) {
    const sq = squareAt(i);
    const { col, row } = center(sq, flipped);
    const lightSq = (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;
    const x = col * C, y = row * C;
    cells.push(h('rect', { key: sq, x, y, width: C, height: C, fill: lightSq ? BOARD.light : BOARD.dark, onClick: onSquare ? () => onSquare(sq) : undefined, style: interactive ? { cursor: 'pointer' } : undefined, 'data-square': sq }));
    if (lastMove && (sq === lastMove.from || sq === lastMove.to)) overlays.push(h('rect', { key: `l${sq}`, x, y, width: C, height: C, fill: BOARD.last, pointerEvents: 'none' }));
    if (selected === sq) overlays.push(h('rect', { key: `s${sq}`, x, y, width: C, height: C, fill: 'rgba(20,85,30,0.5)', pointerEvents: 'none' }));
    if (col === 0) overlays.push(h('text', { key: `r${sq}`, x: x + 5, y: y + 22, fontSize: 21, fontWeight: 700, fill: lightSq ? BOARD.dark : BOARD.light, pointerEvents: 'none', fontFamily: 'Arial, sans-serif' }, sq[1]));
    if (row === 7) overlays.push(h('text', { key: `f${sq}`, x: x + C - 6, y: y + C - 7, fontSize: 21, fontWeight: 700, textAnchor: 'end', fill: lightSq ? BOARD.dark : BOARD.light, pointerEvents: 'none', fontFamily: 'Arial, sans-serif' }, sq[0]));
    const p = pieces[i];
    if (p) {
      const mv = lastMove && lastMove.to === sq && lastMove.from ? center(lastMove.from, flipped) : null;
      const slide = mv ? { className: 'cc-piece-move', style: { '--dx': `${mv.x - (x + C / 2)}px`, '--dy': `${mv.y - (y + C / 2)}px` } } : {};
      imgs.push(h('g', { key: `p${sq}-${mv ? lastMove.from + lastMove.to : ''}`, transform: `translate(${x} ${y})`, pointerEvents: 'none', 'data-piece': p },
        h('g', { ...slide },
          h('g', { transform: `scale(${C / 45})`, dangerouslySetInnerHTML: { __html: PIECE_SVG[p] } }))));
    }
    if (targets.includes(sq)) {
      overlays.push(p
        ? h('circle', { key: `t${sq}`, cx: x + C / 2, cy: y + C / 2, r: 46, fill: 'none', stroke: 'rgba(20,85,30,0.5)', strokeWidth: 9, pointerEvents: 'none' })
        : h('circle', { key: `t${sq}`, cx: x + C / 2, cy: y + C / 2, r: 15, fill: 'rgba(20,85,30,0.5)', pointerEvents: 'none' }));
    }
  }
  let badgeEl = null;
  if (badge && TOKENS[badge.cls]) {
    const { col, row } = center(badge.square, flipped);
    const tok = TOKENS[badge.cls];
    badgeEl = h('svg', { x: col * C + C - 44, y: row * C - 4, width: 48, height: 48, viewBox: '0 0 24 24', pointerEvents: 'none', 'data-badge': badge.cls, className: 'cc-badge' },
      h('circle', { cx: 12, cy: 12, r: 11, fill: tok.color, stroke: 'rgba(0,0,0,0.35)', strokeWidth: 0.8 }), h(Glyph, { g: tok.glyph, ink: inkFor(tok.color) }));
  }
  return h('svg', {
    viewBox: '0 0 800 800', role: 'img', 'aria-label': label || t('board.label'),
    style: { display: 'block', width: '100%', height: 'auto', aspectRatio: '1 / 1', borderRadius: 12, opacity: dim ? 0.92 : 1, userSelect: 'none' },
  }, cells, overlays, imgs, arrow ? h(Arrow, { from: arrow.from, to: arrow.to, flipped }) : null, badgeEl);
}

// Vertical eval bar: 24 px wide, White at the bottom (top when flipped), value at the winning side's end.
export function EvalBar({ ev, height, flipped = false, dim = false }) {
  const pct = winPct(ev);
  const wl = whiteLeads(ev);
  const text = formatEval(ev);
  const whiteAtBottom = !flipped;
  const labelAtBottom = wl === whiteAtBottom;
  return h('div', {
    role: 'img', 'aria-label': t('board.evalBar', { value: text || '0.0' }),
    style: { position: 'relative', width: 26, height, flex: 'none', background: '#403d39', borderRadius: 8, overflow: 'hidden', opacity: dim ? 0.55 : 1 },
  },
    h('div', { className: 'cc-evalbar-fill', style: { position: 'absolute', left: 0, right: 0, [whiteAtBottom ? 'bottom' : 'top']: 0, height: `${pct}%`, background: '#ffffff' } }),
    h('div', { style: { position: 'absolute', left: 0, right: 0, [labelAtBottom ? 'bottom' : 'top']: 3, textAlign: 'center', fontSize: 10, fontWeight: 800, color: wl ? '#262421' : '#f2f0ec', letterSpacing: -0.3 } }, text));
}

export function PlayerCard({ name, rating, color, active, extra }) {
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', minHeight: 36 } },
    h('span', { 'aria-hidden': true, style: { width: 14, height: 14, borderRadius: 3, flex: 'none', background: color === 'white' ? '#fff' : '#262421', border: '1px solid var(--cc-muted)' } }),
    h('strong', { style: { fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name || '?'),
    rating != null ? h('span', { style: { color: 'var(--cc-muted)', fontSize: 13 } }, `(${rating})`) : null,
    h('span', { style: { color: 'var(--cc-muted)', fontSize: 12, marginLeft: 'auto' } }, t(color === 'white' ? 'common.white' : 'common.black')),
    extra || null);
}
