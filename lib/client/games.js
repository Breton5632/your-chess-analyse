// "My games" screen (spec 9.3): archive-style table, filters, sort, pagination, batch actions, sync.
import React from 'react';
import { h, S, Btn, Card, Notice, Loading, Empty, ErrorBox, Select, Icon, timeClassIcon, useApp } from './ui.js';
import { resultColor } from './review.js';
import { errorText } from './api.js';
import { SyncPicker } from './syncpicker.js';
import { t, fmtDate, fmtNum, fmtAgo } from './i18n.js';

const { useState, useEffect, useCallback, useMemo } = React;

const DAY = 86400;
const PERIODS = { all: null, '7': 7, '30': 30, '90': 90, '365': 365 };

export function SyncControl({ compact }) {
  const { api, status, reloadStatus } = useApp();
  const sync = (status && status.sync) || { state: 'idle' };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const run = async (params) => {
    setBusy(true); setErr(null);
    try { await api.post('sync/start', typeof params === 'string' ? { scope: params } : params); reloadStatus(); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const running = sync.state === 'running';
  const label = running ? t('sync.running') : sync.state === 'rate_limited' ? t('sync.rateLimited') : sync.state === 'not_found' ? t('sync.notFound') : sync.state === 'error' ? t('sync.error') : sync.last ? t('sync.last', { when: fmtAgo(sync.last) || fmtDate(Date.parse(sync.last) / 1000) }) : t('sync.never');
  const bad = sync.state === 'rate_limited' || sync.state === 'not_found' || sync.state === 'error';
  const status1 = h('span', { style: { fontSize: 12.5, color: bad ? 'var(--cc-loss)' : 'var(--cc-muted)' }, role: 'status' }, label, running && sync.games != null ? ` · ${t('sync.games', { count: sync.games })}` : '');
  const errs = [err ? h('span', { key: 'e', role: 'alert', style: { fontSize: 12.5, color: 'var(--cc-loss)' } }, errorText(t, err)) : null,
    sync.error && bad ? h('span', { key: 'se', style: { fontSize: 12.5, color: 'var(--cc-muted)' } }, sync.error) : null];
  if (!compact) {
    return h('div', { style: { display: 'grid', gap: 8 } },
      h(SyncPicker, { onRun: run, busy, running, disabled: !status || !status.configured, label: running ? t('sync.running') : t('sync.start') }),
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } }, status1, errs));
  }
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
    h(Btn, { small: true, disabled: busy || running || !status || !status.configured, onClick: () => run({ scope: 'recent', count: 10 }), title: t('sync.hint') }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, Icon.sync ? Icon.sync() : null, running ? t('sync.running') : t('sync.start'))),
    status1, errs);
}

export function ImportPgn({ goTo }) {
  const { api, reloadStatus } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api.post('games/import', { pgn: text });
      setText(''); setOpen(false); reloadStatus();
      goTo('review', { gameId: r.id });
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  if (!open) return h(Btn, { small: true, onClick: () => setOpen(true), 'data-import': true }, t('import.open'));
  return h(Card, { title: t('import.title'), style: { flexBasis: '100%' } },
    h('div', { style: { display: 'grid', gap: 10 } },
      h('textarea', { value: text, onChange: (e) => setText(e.target.value), rows: 6, spellCheck: false, 'aria-label': t('import.title'), placeholder: t('import.placeholder'), style: { ...S.input, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5, resize: 'vertical', width: '100%' } }),
      err ? h(ErrorBox, { error: err, text: errorText(t, err) }) : null,
      h('div', { style: { display: 'flex', gap: 8 } },
        h(Btn, { primary: true, disabled: busy || !text.trim(), onClick: submit }, t('import.submit')),
        h(Btn, { disabled: busy, onClick: () => { setOpen(false); setErr(null); } }, t('common.cancel')))));
}

export function GamesScreen({ goTo }) {
  const { api, status, live } = useApp();
  const [f, setF] = useState({ timeClass: '', color: '', result: '', opening: '', period: 'all', analyzed: false, search: '' });
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(() => new Set());
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const id = setTimeout(() => { setF((x) => (x.search === q ? x : { ...x, search: q })); setPage(1); }, 300); return () => clearTimeout(id); }, [q]);

  const body = useMemo(() => {
    const b = { sort, page, pageSize };
    if (f.timeClass) b.timeClass = f.timeClass;
    if (f.color) b.color = f.color;
    if (f.result) b.result = f.result;
    if (f.opening) b.opening = f.opening;
    if (f.analyzed) b.analyzed = true;
    if (f.search) b.search = f.search;
    if (PERIODS[f.period]) b.from = Math.floor(Date.now() / 1000) - PERIODS[f.period] * DAY;
    return b;
  }, [f, sort, page, pageSize]);

  const syncTick = live.syncTick, anyTick = live.analysisAny, doneTick = live.analysisDone;
  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    api.post('games/list', body).then((r) => { if (alive) { setData(r); setError(null); setLoading(false); } }, (e) => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
  }, [api, body]);
  useEffect(() => load(), [load, syncTick, doneTick]);

  const filtered = !!(f.timeClass || f.color || f.result || f.opening || f.analyzed || f.search || f.period !== 'all');
  const set = (k) => (v) => { setF((x) => ({ ...x, [k]: v })); setPage(1); };
  const items = (data && data.items) || [];
  const total = (data && data.total) || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const toggle = (id) => setSel((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = items.length > 0 && items.every((g) => sel.has(g.id));
  const togglePage = () => setSel((cur) => { const n = new Set(cur); if (allOnPage) items.forEach((g) => n.delete(g.id)); else items.forEach((g) => n.add(g.id)); return n; });

  const analyse = async (ids) => {
    setBusy(true); setNote(null);
    try {
      const one = ids.length === 1;
      const r = await api.post('analysis/enqueue', { gameIds: ids.slice(0, 200), priority: one ? 1 : 0 });
      if (one) { goTo('review', { gameId: ids[0] }); return; } // one game: straight to its analysis page
      setNote({ kind: 'info', text: t('games.queued', { count: r.queued != null ? r.queued : ids.length }) });
      setSel(new Set()); load();
    } catch (e) { setNote({ kind: 'error', text: errorText(t, e) }); } finally { setBusy(false); }
  };
  const trend = async () => {
    setBusy(true); setNote(null);
    try { await api.post('coach/trend', { gameIds: [...sel] }); setNote({ kind: 'info', text: t('games.trendQueued') }); } catch (e) { setNote({ kind: 'error', text: errorText(t, e) }); } finally { setBusy(false); }
  };

  const head = h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
    h('h1', { style: { margin: 0, fontSize: 20 } }, t('games.title')), h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' } }, h(SyncControl), h(ImportPgn, { goTo })));

  const filters = h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, role: 'search', 'aria-label': t('games.filters') },
    h(Select, { value: f.timeClass, onChange: set('timeClass'), label: t('games.timeClass'), options: [['', t('games.allTimeClasses')], ['bullet', t('tc.bullet')], ['blitz', t('tc.blitz')], ['rapid', t('tc.rapid')], ['daily', t('tc.daily')]] }),
    h(Select, { value: f.color, onChange: set('color'), label: t('games.color'), options: [['', t('games.allColors')], ['white', t('common.white')], ['black', t('common.black')]] }),
    h(Select, { value: f.result, onChange: set('result'), label: t('games.result'), options: [['', t('games.allResults')], ['win', t('result.win')], ['loss', t('result.loss')], ['draw', t('result.draw')]] }),
    h(Select, { value: f.opening, onChange: set('opening'), label: t('games.opening'), style: { maxWidth: 200 }, options: [['', t('games.allOpenings')], ...(((data && data.openings) || []).map((o) => [o.opening, `${o.opening} (${o.count})`]))] }),
    h(Select, { value: f.period, onChange: set('period'), label: t('games.period'), options: [['all', t('games.anyTime')], ['7', t('games.last7')], ['30', t('games.last30')], ['90', t('games.last90')], ['365', t('games.last365')]] }),
    h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 } }, h('input', { type: 'checkbox', checked: f.analyzed, onChange: (e) => set('analyzed')(e.target.checked) }), t('games.analysedOnly')),
    h('input', { type: 'search', value: q, onChange: (e) => setQ(e.target.value), placeholder: t('games.search'), 'aria-label': t('games.search'), style: { ...S.input, width: 170 } }),
    h(Select, { value: sort, onChange: (v) => { setSort(v); setPage(1); }, label: t('games.sort'), options: [['date_desc', t('games.sortNewest')], ['date_asc', t('games.sortOldest')], ['accuracy_desc', t('games.sortAccDesc')], ['accuracy_asc', t('games.sortAccAsc')], ['rating_desc', t('games.sortRating')]] }),
    filtered ? h(Btn, { small: true, onClick: () => { setF({ timeClass: '', color: '', result: '', opening: '', period: 'all', analyzed: false, search: '' }); setQ(''); setPage(1); } }, t('games.clear')) : null);

  const batch = sel.size ? h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
    h('span', { style: { fontSize: 13, ...S.muted } }, t('games.selected', { count: sel.size })),
    h(Btn, { small: true, primary: true, disabled: busy, onClick: () => analyse([...sel]) }, t('games.analyseSelection')),
    h(Btn, { small: true, disabled: busy, onClick: trend }, t('games.trendReport')),
    h(Btn, { small: true, onClick: () => setSel(new Set()) }, t('games.deselect'))) : null;

  let main;
  if (error && !data) main = h(ErrorBox, { error, text: errorText(t, error), onRetry: load });
  else if (!data) main = h(Loading);
  else if (items.length === 0) {
    main = filtered
      ? h(Empty, { title: t('games.noMatchTitle'), action: h(Btn, { onClick: () => { setF({ timeClass: '', color: '', result: '', opening: '', period: 'all', analyzed: false, search: '' }); setQ(''); } }, t('games.clear')) }, t('games.noMatch'))
      : status && !status.configured
        ? h(Empty, { title: t('games.emptyTitle'), action: h(Btn, { primary: true, onClick: () => goTo('setup') }, t('nav.setup')) }, t('games.emptyNotConfigured'))
        : h(Empty, { title: t('games.emptyTitle') }, h('div', { style: { display: 'grid', gap: 10, justifyItems: 'center' } }, t('games.empty'), h(SyncControl)));
  } else {
    main = h('div', { style: { ...S.card, padding: 0, overflowX: 'auto', opacity: loading ? 0.7 : 1 } },
      h('table', { 'aria-label': t('games.title') },
        h('thead', null, h('tr', null,
          h('th', { style: { width: 34 } }, h('input', { type: 'checkbox', checked: allOnPage, onChange: togglePage, 'aria-label': t('games.selectPage') })),
          ['date', 'timeClass', 'color', 'opponent', 'result', 'opening', 'accuracy', 'actions'].map((k) => h('th', { key: k, style: k === 'actions' ? { textAlign: 'right' } : undefined }, t(`games.col.${k}`))))),
        h('tbody', null, items.map((g) => {
          const state = g.analysisState || (g.analyzed ? 'ready' : 'none');
          const hasReview = g.analyzed || state === 'ready' || state === 'partial';
          const running = state === 'queued' || state === 'running';
          return h('tr', { key: g.id, className: 'cc-row', 'data-game': g.id },
            h('td', null, h('input', { type: 'checkbox', checked: sel.has(g.id), onChange: () => toggle(g.id), 'aria-label': t('games.selectOne', { name: g.opponent && g.opponent.name }) })),
            h('td', { style: { whiteSpace: 'nowrap' } }, fmtDate(g.endTime)),
            h('td', { style: { whiteSpace: 'nowrap' }, title: g.timeControl }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } }, timeClassIcon(g.timeClass, 15), g.timeClass ? t(`tc.${g.timeClass}`) : '', h('span', { style: { color: 'var(--cc-muted)', fontSize: 12 } }, g.timeControl || ''))),
            h('td', null, h('span', { 'aria-label': t(g.color === 'white' ? 'common.white' : 'common.black'), title: t(g.color === 'white' ? 'common.white' : 'common.black'), style: { display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: g.color === 'white' ? '#fff' : '#262421', border: '1px solid var(--cc-muted)' } })),
            h('td', null, h('strong', null, g.opponent && g.opponent.name), h('span', { style: { color: 'var(--cc-muted)' } }, ` (${g.opponent && g.opponent.rating != null ? g.opponent.rating : '?'})`)),
            h('td', { style: { whiteSpace: 'nowrap', color: resultColor(g.result), fontWeight: 700 } }, t(`result.${g.result === 'win' || g.result === 'loss' ? g.result : 'draw'}`), g.termination ? h('span', { style: { color: 'var(--cc-muted)', fontWeight: 400, fontSize: 12 } }, ' · ' + (t(`term.${g.termination}`).startsWith('term.') ? g.termination : t(`term.${g.termination}`))) : null),
            h('td', { style: { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: g.opening }, g.opening || '—'),
            h('td', { style: { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } }, g.accuracy ? fmtNum(g.accuracy.mine, 1) : h('span', { style: S.muted }, '—'), g.chesscomAccuracy ? h('span', { style: { color: 'var(--cc-muted)', fontSize: 11.5 }, title: t('accuracy.chesscom', { value: fmtNum(g.chesscomAccuracy.mine, 1) }) }, ` · cc ${fmtNum(g.chesscomAccuracy.mine, 1)}`) : null),
            h('td', { style: { textAlign: 'right', whiteSpace: 'nowrap' } },
              hasReview ? h(Btn, { small: true, primary: true, onClick: () => goTo('review', { gameId: g.id }) }, t('games.review'))
                : running ? h('span', { className: 'cc-spin', style: { fontSize: 12.5, color: 'var(--cc-muted)', marginRight: 8 } }, t(state === 'queued' ? 'games.stateQueued' : 'games.stateRunning'))
                  : h(Btn, { primary: true, disabled: busy, 'data-analyse': g.id, style: { padding: '8px 22px', fontSize: 14.5, boxShadow: '0 4px 14px color-mix(in srgb, var(--cc-accent) 35%, transparent)' }, onClick: () => analyse([g.id]) }, state === 'failed' || state === 'invalid' ? t('common.retry') : `\u25B6  ${t('games.analyse')}`),
              running ? h(Btn, { small: true, onClick: () => goTo('review', { gameId: g.id }) }, t('games.open')) : null));
        }))));
  }

  const pager = data && items.length ? h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
    h('span', { style: { fontSize: 13, ...S.muted } }, t('games.range', { from: (page - 1) * pageSize + 1, to: Math.min(total, page * pageSize), total })),
    h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      h(Select, { value: String(pageSize), onChange: (v) => { setPageSize(Number(v)); setPage(1); }, label: t('games.pageSize'), options: [['25', '25'], ['50', '50'], ['100', '100']] }),
      h(Btn, { small: true, disabled: page <= 1, onClick: () => setPage(page - 1) }, t('games.prev')),
      h('span', { style: { fontSize: 13 } }, t('games.page', { page, pages })),
      h(Btn, { small: true, disabled: page >= pages, onClick: () => setPage(page + 1) }, t('games.next')))) : null;

  return h('div', { style: { display: 'grid', gap: 12 } },
    head, filters, batch,
    note ? h(Notice, { kind: note.kind === 'error' ? 'error' : 'info', action: h(Btn, { small: true, onClick: () => setNote(null) }, t('common.dismiss')) }, note.text) : null,
    error && data ? h(ErrorBox, { error, text: errorText(t, error), onRetry: load }) : null,
    main, pager);
}
