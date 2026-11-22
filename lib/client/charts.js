// Hand-written SVG charts: eval graph (clickable), rating line, sparkline.
import React from 'react';
import { winPct, formatEval } from './chessutil.js';
import { TOKENS, ERRORS } from './classes.js';
import { h } from './ui.js';
import { t, fmtDate, fmtNum } from './i18n.js';

// Evaluation points for plies 0..n (White POV win%), carrying the last value over failed positions.
export function evalSeries(initial, moves) {
  const pts = [winPct(initial)];
  let last = pts[0];
  for (const m of moves) {
    if (m.evalAfter && !m.failed) last = winPct(m.evalAfter);
    pts.push(last);
  }
  return pts;
}

function useBoxWidth(ref, fallback = 400) {
  const [w, setW] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width || fallback)));
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

// Smooth path through the points (Catmull-Rom converted to cubic Beziers), clamped so it never overshoots the plot.
export function smoothPath(xs, ys, top, bottom) {
  if (xs.length === 0) return '';
  if (xs.length === 1) return `M${xs[0]},${ys[0]}`;
  const clamp = (v) => Math.max(top, Math.min(bottom, v));
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[Math.max(0, i - 1)], y0 = ys[Math.max(0, i - 1)];
    const x1 = xs[i], y1 = ys[i], x2 = xs[i + 1], y2 = ys[i + 1];
    const x3 = xs[Math.min(xs.length - 1, i + 2)], y3 = ys[Math.min(xs.length - 1, i + 2)];
    const c1x = x1 + (x2 - x0) / 6, c1y = clamp(y1 + (y2 - y0) / 6);
    const c2x = x2 - (x3 - x1) / 6, c2y = clamp(y2 - (y3 - y1) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d;
}

export function EvalGraph({ initial, moves, ply, onSelect, height = 150 }) {
  const box = React.useRef(null);
  const W = useBoxWidth(box);
  const [hover, setHover] = React.useState(null);
  const H = height, padX = 8, padY = 8;
  const pts = evalSeries(initial, moves);
  const n = pts.length - 1;
  const X = (i) => (n === 0 ? padX : padX + (i / n) * (W - 2 * padX));
  const Y = (p) => padY + (1 - p / 100) * (H - 2 * padY);
  const xs = pts.map((_, i) => X(i));
  const ys = pts.map((p) => Y(p));
  const line = smoothPath(xs, ys, padY, H - padY);
  const area = `${line} L${X(n).toFixed(1)},${H} L${X(0).toFixed(1)},${H} Z`;
  const plyAt = (e) => {
    const r = box.current.getBoundingClientRect();
    const frac = r.width ? (e.clientX - r.left - padX) / (r.width - 2 * padX) : 0;
    return Math.max(0, Math.min(n, Math.round(frac * n)));
  };
  const markers = moves.filter((m) => ERRORS.has(m.classification) && m.classification !== 'inaccuracy');
  const hp = hover != null ? hover : null;
  const hm = hp != null && hp > 0 ? moves[hp - 1] : null;
  const tip = hp != null ? `${hp === 0 ? t('review.startPosition') : `${Math.ceil(hp / 2)}${hp % 2 ? '.' : '...'} ${hm ? hm.san : ''}`}  ${hm && hm.evalAfter ? formatEval(hm.evalAfter) : hp === 0 && initial ? formatEval(initial) : ''}` : '';
  const tipW = Math.min(W - 4, 11 + tip.length * 6.6);
  const tipX = hp == null ? 0 : Math.max(2, Math.min(W - tipW - 2, X(hp) - tipW / 2));
  return h('div', { ref: box, style: { width: '100%' } },
    h('svg', {
      viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': t('review.graphLabel'),
      onClick: (e) => { if (onSelect && n > 0) onSelect(plyAt(e)); },
      onMouseMove: (e) => { if (n > 0) setHover(plyAt(e)); }, onMouseLeave: () => setHover(null),
      style: { display: 'block', width: '100%', height: H, cursor: 'pointer', borderRadius: 14, background: 'var(--cc-graph-bg)' },
    },
      h('defs', null,
        h('linearGradient', { id: 'ccEvalFill', x1: 0, x2: 0, y1: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: 'var(--cc-graph-fill)', stopOpacity: 0.95 }),
          h('stop', { offset: '100%', stopColor: 'var(--cc-graph-fill)', stopOpacity: 0.55 }))),
      [25, 75].map((p) => h('line', { key: p, x1: padX, x2: W - padX, y1: Y(p), y2: Y(p), stroke: 'var(--cc-graph-fill)', strokeWidth: 1, opacity: 0.12 })),
      h('path', { d: area, fill: 'url(#ccEvalFill)' }),
      h('line', { x1: padX, x2: W - padX, y1: Y(50), y2: Y(50), stroke: 'var(--cc-accent)', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.8 }),
      h('path', { d: line, fill: 'none', stroke: 'var(--cc-accent)', strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      n <= 200 ? pts.map((p, i) => h('circle', { key: `d${i}`, cx: xs[i], cy: ys[i], r: n > 120 ? 1.6 : 2.4, fill: 'var(--cc-accent)', opacity: i === ply ? 0 : 0.85, pointerEvents: 'none' })) : null,
      markers.map((m) => h('circle', { key: m.ply, cx: xs[m.ply], cy: ys[m.ply], r: 5.5, fill: TOKENS[m.classification].color, stroke: '#1b1a18', strokeWidth: 1, 'data-marker': m.classification, pointerEvents: 'none' })),
      n > 0 ? h('g', { pointerEvents: 'none' },
        h('line', { x1: xs[ply], x2: xs[ply], y1: 0, y2: H, stroke: '#f7c631', strokeWidth: 1.5 }),
        h('circle', { cx: xs[ply], cy: ys[ply] ?? Y(50), r: 5.5, fill: '#f7c631', stroke: '#1b1a18', strokeWidth: 1 })) : null,
      hp != null ? h('g', { pointerEvents: 'none', 'data-tip': true },
        h('line', { x1: xs[hp], x2: xs[hp], y1: 0, y2: H, stroke: 'var(--cc-text)', strokeWidth: 1, opacity: 0.45 }),
        h('rect', { x: tipX, y: 4, width: tipW, height: 20, rx: 10, fill: 'rgba(0,0,0,0.78)' }),
        h('text', { x: tipX + tipW / 2, y: 18, textAnchor: 'middle', fontSize: 12, fontWeight: 600, fill: '#fff' }, tip)) : null));
}
