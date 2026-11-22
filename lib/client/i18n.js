// Plugin-owned strings (en + fr, both complete). Bundled: Timon serves client.js alone.
import { createTranslator, getLocale, formatDate, formatDateTime, formatRelativeTime } from '@timon/ui';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const MESSAGES = { en, fr };
export const t = createTranslator(MESSAGES);

const locale = () => {
  try { return getLocale() || 'en'; } catch { return 'en'; }
};
export const fmtNum = (n, digits = 0) => (n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n));
export const fmtPct1 = (n) => (n == null ? '—' : fmtNum(n, 1));

const asDate = (sec) => new Date(Number(sec) * 1000);
export function fmtDate(sec) {
  if (sec == null) return '—';
  const d = asDate(sec);
  try { return formatDate(d) || d.toLocaleDateString(locale()); } catch { return d.toLocaleDateString(locale()); }
}
export function fmtDateTime(value) {
  if (value == null) return '—';
  const d = typeof value === 'number' ? asDate(value) : new Date(value);
  try { return formatDateTime(d) || d.toLocaleString(locale()); } catch { return d.toLocaleString(locale()); }
}
export function fmtAgo(value) {
  if (value == null) return '';
  const d = typeof value === 'number' ? asDate(value) : new Date(value);
  try { return formatRelativeTime(d) || ''; } catch { return ''; }
}
