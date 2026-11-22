// What to download: the latest game, the 10 latest games, or the games played on a day chosen on a calendar.
import React from 'react';
import { h, S, Btn, Field, Seg } from './ui.js';
import { t } from './i18n.js';

const { useState } = React;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function SyncPicker({ onRun, busy, running, label, disabled }) {
  const today = iso(new Date());
  const [mode, setMode] = useState('ten');
  const [day, setDay] = useState(today);
  const bad = mode === 'date' && !day;
  const run = () => onRun(mode === 'last' ? { scope: 'recent', count: 1 } : mode === 'ten' ? { scope: 'recent', count: 10 } : { scope: 'range', from: day, to: day });
  return h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }, 'data-sync-picker': true },
    h(Seg, { label: t('sync.mode'), value: mode, onChange: setMode, options: [['last', t('sync.optLast')], ['ten', t('sync.optTen')], ['date', t('sync.optDate')]] }),
    mode === 'date' ? h(Field, { label: t('sync.day') }, h('input', { type: 'date', value: day, max: today, onChange: (e) => setDay(e.target.value), style: { ...S.input } })) : null,
    h(Btn, { primary: true, disabled: busy || running || disabled || bad, onClick: run }, label));
}
