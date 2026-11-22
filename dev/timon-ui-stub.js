// Minimal stand-in for the parts of @timon/ui the plugin uses (dev harness and tests only; not shipped).
import React from 'react';

const h = React.createElement;
const loc = () => {
  if (globalThis.__CC_LOCALE) return globalThis.__CC_LOCALE;
  try { return new URLSearchParams(globalThis.location.search).get('lang') || globalThis.navigator.language || 'en'; } catch { return 'en'; }
};
export const getLocale = () => loc();

// --- tiny ICU subset: {name}, {n, plural, one {..} other {..}} with # ---
function parseBlock(s, i) { // s[i] === '{' ; returns [inner, nextIndex]
  let depth = 0; let j = i;
  for (; j < s.length; j++) { if (s[j] === '{') depth++; else if (s[j] === '}') { depth--; if (depth === 0) break; } }
  return [s.slice(i + 1, j), j + 1];
}
function format(msg, params, locale) {
  let out = '';
  for (let i = 0; i < msg.length;) {
    if (msg[i] !== '{') { out += msg[i++]; continue; }
    const [inner, next] = parseBlock(msg, i);
    const m = /^\s*(\w+)\s*(?:,\s*(plural)\s*,([\s\S]*))?$/.exec(inner);
    if (m && m[2]) {
      const n = Number(params[m[1]]);
      const cases = {};
      const body = m[3];
      for (let k = 0; k < body.length;) {
        const w = /^\s*(=?\w+)\s*/.exec(body.slice(k));
        if (!w) break;
        k += w[0].length;
        const [txt, nk] = parseBlock(body, k);
        cases[w[1]] = txt; k = nk;
      }
      const cat = new Intl.PluralRules(locale).select(n);
      const pick = cases[`=${n}`] ?? cases[cat] ?? cases.other ?? '';
      out += format(pick.replace(/#/g, new Intl.NumberFormat(locale).format(n)), params, locale);
    } else if (m) out += params[m[1]] ?? `{${m[1]}}`;
    else out += inner;
    i = next;
  }
  return out;
}
const dig = (o, key) => key.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o);
export function createTranslator(messages) {
  return (key, params = {}) => {
    const tag = loc();
    const order = [tag, tag.split('-')[0], 'en'];
    for (const l of order) {
      const v = messages[l] && dig(messages[l], key);
      if (typeof v === 'string') return format(v, params, l);
    }
    return key;
  };
}
export const formatDate = (d) => new Date(d).toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric' });
export const formatDateTime = (d) => new Date(d).toLocaleString(loc());
export const formatRelativeTime = (d) => {
  const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto' });
  const a = Math.abs(s);
  return a < 60 ? rtf.format(s, 'second') : a < 3600 ? rtf.format(Math.round(s / 60), 'minute') : a < 86400 ? rtf.format(Math.round(s / 3600), 'hour') : rtf.format(Math.round(s / 86400), 'day');
};
export const parseApiError = (body) => (body && typeof body === 'object' && typeof body.code === 'string' ? { code: body.code, params: body.params, message: body.message } : null);
export const openInIsland = (content, opts) => {
  (globalThis.__ccIslandCalls = globalThis.__ccIslandCalls || []).push({ content, opts });
  return globalThis.__ccIslandResult !== false;
};
export const NavLink = ({ href, label, icon }) => h('a', { href, className: 'nav-link' }, icon ? h(icon, { className: 'nav-icon' }) : null, label);
