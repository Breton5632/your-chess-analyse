// Palettes as CSS variables set on the plugin root. Dark is the chess.com-like default.
import React from 'react';
const { useState, useEffect } = React;

export const PALETTES = {
  dark: {
    '--cc-bg': '#000000', '--cc-panel': '#1c1c1e', '--cc-panel2': '#2c2c2e', '--cc-border': 'rgba(255,255,255,0.10)',
    '--cc-text': '#f5f5f7', '--cc-muted': '#98989f', '--cc-accent': '#0a84ff', '--cc-accent-ink': '#ffffff',
    '--cc-accent-text': '#64b5ff', '--cc-win': '#32d74b', '--cc-loss': '#ff6961', '--cc-draw': '#98989f',
    '--cc-hover': 'rgba(255,255,255,0.08)', '--cc-sel': 'rgba(10,132,255,0.28)', '--cc-focus': '#64b5ff',
    '--cc-warn-bg': 'rgba(255,214,10,0.14)', '--cc-warn': '#ffd60a', '--cc-err-bg': 'rgba(255,69,58,0.16)',
    '--cc-graph-bg': '#111113', '--cc-graph-fill': '#f5f5f7', '--cc-shadow': '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.35)',
  },
  light: {
    '--cc-bg': '#f5f5f7', '--cc-panel': '#ffffff', '--cc-panel2': '#f2f2f7', '--cc-border': 'rgba(0,0,0,0.08)',
    '--cc-text': '#1d1d1f', '--cc-muted': '#6e6e73', '--cc-accent': '#0071e3', '--cc-accent-ink': '#ffffff',
    '--cc-accent-text': '#0066cc', '--cc-win': '#1f9d3a', '--cc-loss': '#d70015', '--cc-draw': '#6e6e73',
    '--cc-hover': 'rgba(0,0,0,0.05)', '--cc-sel': 'rgba(0,113,227,0.14)', '--cc-focus': '#0071e3',
    '--cc-warn-bg': 'rgba(255,159,10,0.14)', '--cc-warn': '#9a5b00', '--cc-err-bg': 'rgba(255,59,48,0.10)',
    '--cc-graph-bg': '#3a3a3c', '--cc-graph-fill': '#f5f5f7', '--cc-shadow': '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
  },
};

// Board colours are the same in both palettes (classic green).
export const BOARD = { light: '#f0e6d2', dark: '#a98467', last: 'rgba(255,214,10,0.42)' };

export function detectDark() {
  if (typeof document === 'undefined') return true;
  const read = (el) => {
    const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
    return m && (m.length < 4 || Number(m[3]) > 0) ? m.map(Number) : null;
  };
  const c = read(document.body) || read(document.documentElement);
  if (c) return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 128;
  return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
}
export function useDark() {
  const [dark, setDark] = useState(detectDark);
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(detectDark()));
    mo.observe(document.documentElement, { attributes: true });
    mo.observe(document.body, { attributes: true });
    return () => mo.disconnect();
  }, []);
  return dark;
}

// Global rules the inline styles cannot express (focus ring, hover, tables).
export const CSS = [
  '.cc{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI Variable","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-0.011em;color:var(--cc-text);background:var(--cc-bg);box-sizing:border-box}',
  '.cc *,.cc *::before,.cc *::after{box-sizing:border-box}',
  '.cc button,.cc input,.cc select,.cc textarea{font:inherit;color:inherit}',
  '.cc button:focus-visible,.cc input:focus-visible,.cc select:focus-visible,.cc textarea:focus-visible,.cc [tabindex]:focus-visible,.cc a:focus-visible{outline:2px solid var(--cc-focus);outline-offset:2px}',
  '.cc button:disabled{opacity:.5;cursor:not-allowed}',
  '.cc .cc-hover:hover:not(:disabled){background:var(--cc-hover)}',
  '.cc tbody tr.cc-row:hover{background:var(--cc-hover)}',
  '.cc table{border-collapse:collapse;width:100%}',
  '.cc th{font-weight:600;color:var(--cc-muted);font-size:12px;text-align:left;padding:8px 10px;white-space:nowrap}',
  '.cc td{padding:8px 10px;border-top:1px solid var(--cc-border);vertical-align:middle}',
  '.cc .cc-evalbar-fill{transition:height .3s ease}',
  '@keyframes ccSlide{from{transform:translate(var(--dx),var(--dy))}to{transform:translate(0,0)}}',
  '@keyframes ccPop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}',
  '.cc .cc-piece-move{animation:ccSlide .26s cubic-bezier(.22,.8,.3,1)}',
  '.cc .cc-badge{transform-box:fill-box;transform-origin:center;animation:ccPop .22s ease-out}',
  '.cc button,.cc [role=tab],.cc tbody tr.cc-row{transition:background-color .18s ease,color .18s ease,border-color .18s ease,box-shadow .2s ease,transform .16s cubic-bezier(.2,.8,.3,1),filter .18s ease,opacity .18s ease}',
  '.cc .cc-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.14)}',
  '.cc .cc-btn.cc-primary:hover:not(:disabled){filter:brightness(1.08);box-shadow:0 6px 18px color-mix(in srgb,var(--cc-accent) 40%,transparent)}',
  '.cc .cc-btn:active:not(:disabled){transform:translateY(0) scale(.97);box-shadow:none;filter:brightness(.96)}',
  '.cc .cc-icon:hover:not(:disabled){transform:scale(1.1);box-shadow:0 3px 10px rgba(0,0,0,.14)}',
  '.cc button:active:not(:disabled){transform:scale(.96)}',
  '@keyframes ccFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
  '.cc .cc-screen{animation:ccFadeUp .32s cubic-bezier(.22,.8,.3,1) both}',
  '.cc .cc-screen>section,.cc .cc-screen>div>section{animation:ccFadeUp .4s cubic-bezier(.22,.8,.3,1) both}',
  '.cc .cc-screen>section:nth-child(2),.cc .cc-screen>div>section:nth-child(2){animation-delay:.05s}',
  '.cc .cc-screen>section:nth-child(3),.cc .cc-screen>div>section:nth-child(3){animation-delay:.1s}',
  '.cc .cc-screen>section:nth-child(4),.cc .cc-screen>div>section:nth-child(4){animation-delay:.15s}',
  '@keyframes ccPulse{0%,100%{opacity:.5}50%{opacity:1}}',
  '.cc .cc-spin{animation:ccPulse 1.2s ease infinite}',
  '@media (prefers-reduced-motion:reduce){.cc *{animation:none!important;transition:none!important}}',
].join('');
