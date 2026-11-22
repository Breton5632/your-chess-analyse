// Small shared UI pieces: buttons, cards, tabs, notices, badges, icons. Inline styles + CSS variables.
import React from 'react';
import { TOKENS, inkFor } from './classes.js';
import { t } from './i18n.js';

export const h = React.createElement;
export const AppCtx = React.createContext(null);
export const useApp = () => React.useContext(AppCtx);

export const S = {
  card: { background: 'var(--cc-panel)', border: '1px solid var(--cc-border)', borderRadius: 18, padding: 18, boxShadow: 'var(--cc-shadow)' },
  muted: { color: 'var(--cc-muted)' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  input: { background: 'var(--cc-panel2)', border: '1px solid var(--cc-border)', borderRadius: 10, padding: '8px 12px', minWidth: 0, color: 'var(--cc-text)' },
};

export function Btn({ primary, small, children, style, ...rest }) {
  return h('button', {
    type: 'button',
    className: primary ? 'cc-btn cc-primary' : 'cc-btn cc-hover',
    style: {
      border: primary ? 'none' : '1px solid var(--cc-border)', borderRadius: 999, cursor: 'pointer', fontWeight: 600,
      padding: small ? '4px 10px' : '8px 16px', fontSize: small ? 12.5 : 14, whiteSpace: 'nowrap',
      background: primary ? 'var(--cc-accent)' : 'var(--cc-panel2)', color: primary ? 'var(--cc-accent-ink)' : 'var(--cc-text)',
      ...style,
    },
    ...rest,
  }, children);
}

export function Card({ title, actions, children, style }) {
  return h('section', { style: { ...S.card, minWidth: 0, ...style } },
    title || actions ? h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 } },
      title ? h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, title) : h('span'), actions || null) : null,
    children);
}

// Tablist with roving tabindex and arrow keys.
export function Tabs({ options, value, onChange, label, style }) {
  const keys = options.map((o) => o[0]);
  const onKey = (e) => {
    const i = keys.indexOf(value);
    let n = null;
    if (e.key === 'ArrowRight') n = keys[(i + 1) % keys.length];
    else if (e.key === 'ArrowLeft') n = keys[(i - 1 + keys.length) % keys.length];
    if (n != null) { e.preventDefault(); e.stopPropagation(); onChange(n); }
  };
  return h('div', { role: 'tablist', 'aria-label': label, onKeyDown: onKey, style: { display: 'flex', gap: 2, borderBottom: '1px solid var(--cc-border)', overflowX: 'auto', ...style } },
    options.map(([k, text]) => h('button', {
      key: k, role: 'tab', type: 'button', 'aria-selected': k === value, tabIndex: k === value ? 0 : -1, id: `cc-tab-${k}`,
      onClick: () => onChange(k), className: 'cc-hover',
      style: {
        border: 'none', background: 'transparent', cursor: 'pointer', padding: '10px 14px', fontWeight: k === value ? 700 : 500, whiteSpace: 'nowrap',
        color: k === value ? 'var(--cc-text)' : 'var(--cc-muted)', borderBottom: `3px solid ${k === value ? 'var(--cc-accent)' : 'transparent'}`, marginBottom: -1,
      },
    }, text)));
}

export function Notice({ kind = 'info', title, children, action, style }) {
  const bg = kind === 'error' ? 'var(--cc-err-bg)' : kind === 'warn' ? 'var(--cc-warn-bg)' : 'var(--cc-panel2)';
  const bd = kind === 'error' ? 'var(--cc-loss)' : kind === 'warn' ? 'var(--cc-warn)' : 'var(--cc-border)';
  return h('div', { role: kind === 'error' ? 'alert' : 'status', style: { background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', ...style } },
    h('div', { style: { flex: '1 1 220px', minWidth: 0 } }, title ? h('div', { style: { fontWeight: 700, marginBottom: 2 } }, title) : null, h('div', { style: { fontSize: 13.5, lineHeight: 1.5 } }, children)),
    action || null);
}

export function Loading({ label }) {
  return h('div', { role: 'status', 'aria-live': 'polite', className: 'cc-spin', style: { padding: 28, textAlign: 'center', color: 'var(--cc-muted)' } }, label || t('common.loading'));
}

// A screen that has nothing to show must say why and offer a next step.
export function Empty({ title, children, action, icon }) {
  return h('div', { style: { ...S.card, textAlign: 'center', padding: '36px 20px', display: 'grid', gap: 10, justifyItems: 'center' } },
    icon || null,
    h('div', { style: { fontSize: 17, fontWeight: 700 } }, title),
    children ? h('div', { style: { color: 'var(--cc-muted)', maxWidth: 520, lineHeight: 1.5, fontSize: 14 } }, children) : null,
    action || null);
}

export function ErrorBox({ error, onRetry, text }) {
  return h(Notice, { kind: 'error', title: t('common.error'), action: onRetry ? h(Btn, { small: true, onClick: onRetry }, t('common.retry')) : null }, text || (error && error.message) || t('errors.generic'));
}

export function ProgressBar({ done, total, label }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return h('div', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': label, style: { background: 'var(--cc-panel2)', border: '1px solid var(--cc-border)', borderRadius: 999, height: 10, overflow: 'hidden' } },
    h('div', { style: { width: `${total > 0 ? pct : 35}%`, height: '100%', background: 'var(--cc-accent)', transition: 'width .3s ease' }, className: total > 0 ? undefined : 'cc-spin' }));
}

export const Field = ({ label, children, hint }) => h('label', { style: { display: 'grid', gap: 4, fontSize: 12.5, color: 'var(--cc-muted)', minWidth: 0 } }, label, children, hint ? h('span', { style: { fontSize: 12 } }, hint) : null);

export function Select({ value, onChange, options, label, style }) {
  return h('select', { value, 'aria-label': label, onChange: (e) => onChange(e.target.value), style: { ...S.input, ...style } },
    options.map(([k, text]) => h('option', { key: k, value: k }, text)));
}

// ---- icons (our own drawings) ----
const sv = (size, ...kids) => h('svg', { viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false }, ...kids);
export const Icon = {
  first: (s = 18) => sv(s, h('path', { d: 'M6 5v14' }), h('path', { d: 'M19 6l-8 6 8 6z', fill: 'currentColor' })),
  prev: (s = 18) => sv(s, h('path', { d: 'M17 5l-9 7 9 7z', fill: 'currentColor' })),
  next: (s = 18) => sv(s, h('path', { d: 'M7 5l9 7-9 7z', fill: 'currentColor' })),
  last: (s = 18) => sv(s, h('path', { d: 'M18 5v14' }), h('path', { d: 'M5 6l8 6-8 6z', fill: 'currentColor' })),
  flip: (s = 18) => sv(s, h('path', { d: 'M7 4v14' }), h('path', { d: 'M3.5 14L7 18l3.5-4' }), h('path', { d: 'M17 20V6' }), h('path', { d: 'M13.5 10L17 6l3.5 4' })),
  play: (s = 18) => sv(s, h('path', { d: 'M8 5l11 7-11 7z', fill: 'currentColor' })),
  pause: (s = 18) => sv(s, h('path', { d: 'M8 5v14M16 5v14', strokeWidth: 3 })),
  arrow: (s = 18) => sv(s, h('path', { d: 'M5 19L19 5' }), h('path', { d: 'M9 5h10v10' })),
  sync: (s = 16) => sv(s, h('path', { d: 'M20 11a8 8 0 0 0-14-4M4 4v4h4' }), h('path', { d: 'M4 13a8 8 0 0 0 14 4M20 20v-4h-4' })),
  chat: (s = 16) => sv(s, h('path', { d: 'M4 5h16v11H9l-5 4z' })),
  bolt: (s = 16) => sv(s, h('path', { d: 'M13 3L5 14h6l-1 7 8-11h-6z', fill: 'currentColor' })),
  bullet: (s = 16) => sv(s, h('path', { d: 'M5 19l3-9 5-6 4 4-6 5z', fill: 'currentColor' })),
  clock: (s = 16) => sv(s, h('circle', { cx: 12, cy: 13, r: 8 }), h('path', { d: 'M12 9v4l3 2M9 3h6' })),
  sun: (s = 16) => sv(s, h('circle', { cx: 12, cy: 12, r: 4 }), h('path', { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2' })),
  check: (s = 16) => sv(s, h('path', { d: 'M5 12l5 5 9-10', strokeWidth: 3 })),
  cross: (s = 16) => sv(s, h('path', { d: 'M6 6l12 12M18 6L6 18', strokeWidth: 3 })),
};
export const timeClassIcon = (tc, s) => (tc === 'bullet' ? Icon.bullet(s) : tc === 'blitz' ? Icon.bolt(s) : tc === 'daily' ? Icon.sun(s) : Icon.clock(s));

// ---- classification badge: round, token colour, our own glyph ----
export function Glyph({ g, ink }) {
  const common = { fill: 'none', stroke: ink, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (g) {
    case 'star': return h('path', { d: 'M12 4.2l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.8 5.4-.7z', fill: ink, stroke: ink, strokeWidth: 1, strokeLinejoin: 'round' });
    case 'check': return h('path', { d: 'M6 12.5l4 4 8-9', ...common });
    case 'cross': return h('path', { d: 'M7 7l10 10M17 7L7 17', ...common });
    case 'knight': return h('path', { d: 'M8 19h9v-2c0-3 1-5-1-8-1-1.5-3-3-5-3l1 2-4 4 1.4 1.4 2.6-1.4c-1 2-3 3-3 5z', fill: ink, stroke: 'none' });
    default: return h('text', { x: 12, y: 16.5, textAnchor: 'middle', fontSize: g.length > 1 ? 12 : 15, fontWeight: 800, fill: ink, fontFamily: 'Arial, Helvetica, sans-serif' }, g);
  }
}
export function ClassBadge({ cls, size = 18, title }) {
  const tok = TOKENS[cls];
  if (!tok) return null;
  const ink = inkFor(tok.color);
  const name = title || t(`class.${cls}`);
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size, role: 'img', 'aria-label': name, style: { flex: 'none', display: 'block' } },
    h('title', null, name), h('circle', { cx: 12, cy: 12, r: 11, fill: tok.color }), h(Glyph, { g: tok.glyph, ink }));
}

// ---- accuracy ring ----
export function accuracyColor(a) {
  return a >= 90 ? '#81b64c' : a >= 80 ? '#96bc4b' : a >= 65 ? '#f7c631' : a >= 50 ? '#ffa459' : '#fa412d';
}
export function Ring({ value, size = 84, label }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  return h('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': `${label}: ${value == null ? '—' : v.toFixed(1)}`, style: { flex: 'none' } },
    h('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: 'var(--cc-border)', strokeWidth: 7 }),
    value == null ? null : h('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: accuracyColor(v), strokeWidth: 7, strokeLinecap: 'round', strokeDasharray: `${(c * v) / 100} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }),
    h('text', { x: '50%', y: '50%', textAnchor: 'middle', dominantBaseline: 'central', fill: 'var(--cc-text)', fontSize: size * 0.27, fontWeight: 800 }, value == null ? '—' : v.toFixed(1)));
}

// Coach accuracy is this plugin's own measure, not chess.com CAPS: said wherever it is shown.
export const AccuracyNote = ({ style }) => h('div', { style: { fontSize: 11.5, color: 'var(--cc-muted)', lineHeight: 1.4, ...style } }, t('accuracy.note'));

export function Seg({ options, value, onChange, label }) {
  return h('div', { role: 'group', 'aria-label': label, style: { display: 'inline-flex', padding: 3, gap: 2, background: 'var(--cc-panel2)', borderRadius: 999, border: '1px solid var(--cc-border)', flexWrap: 'wrap' } },
    options.map(([k, text]) => h('button', {
      key: k, type: 'button', 'aria-pressed': value === k, 'data-seg': k, onClick: () => onChange(k), className: 'cc-btn',
      style: { border: 'none', cursor: 'pointer', padding: '7px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: value === k ? 700 : 500, background: value === k ? 'var(--cc-panel)' : 'transparent', color: value === k ? 'var(--cc-text)' : 'var(--cc-muted)', boxShadow: value === k ? '0 1px 3px rgba(0,0,0,0.18)' : 'none' },
    }, text)));
}

