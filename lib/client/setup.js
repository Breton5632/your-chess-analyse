// "Mon profil": account, analysis speed, coach language, data. Also the first-run screen
// (needsSetup in app.js shows it until an account is linked and a first sync has been done).
import React from 'react';
import { h, S, Btn, Card, Notice, Field, ProgressBar, Seg, useApp } from './ui.js';
import { errorText } from './api.js';
import { t, fmtAgo } from './i18n.js';

const { useState, useEffect } = React;
const NAME = /^[A-Za-z0-9_-]{3,25}$/;
const POLICY_SNIPPET = '{\n  "pluginPolicy": {\n    "http": { "byPlugin": { "chess-coach": ["api.chess.com"] } }\n  }\n}';
const PRESETS = [['fast', 10, 16], ['balanced', 14, 20], ['precise', 16, 24]];

function Toggle({ checked, onChange, label, hint }) {
  return h('label', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, cursor: 'pointer' } },
    h('span', { style: { display: 'grid', gap: 2 } }, h('span', { style: { fontSize: 14.5, fontWeight: 600 } }, label), hint ? h('span', { style: { fontSize: 12.5, color: 'var(--cc-muted)' } }, hint) : null),
    h('span', { role: 'switch', 'aria-checked': !!checked, tabIndex: 0, onClick: (e) => { e.preventDefault(); onChange(!checked); }, onKeyDown: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!checked); } },
      style: { width: 46, height: 28, borderRadius: 999, flex: 'none', position: 'relative', background: checked ? 'var(--cc-accent)' : 'var(--cc-panel2)', border: '1px solid var(--cc-border)', transition: 'background-color .2s ease' } },
      h('span', { style: { position: 'absolute', top: 2, left: checked ? 20 : 2, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.35)', transition: 'left .2s cubic-bezier(.2,.8,.3,1)' } })));
}

const Section = ({ title, hint, children }) => h(Card, { style: { display: 'grid', gap: 14 } },
  h('div', null, h('h2', { style: { margin: 0, fontSize: 17 } }, title), hint ? h('p', { style: { margin: '4px 0 0', color: 'var(--cc-muted)', fontSize: 13.5, lineHeight: 1.5 } }, hint) : null),
  children);

function NumberPref({ label, value, onSave, hint }) {
  const [v, setV] = useState(String(value));
  useEffect(() => { setV(String(value)); }, [value]);
  return h(Field, { label, hint },
    h('input', { type: 'number', value: v, onChange: (e) => setV(e.target.value), onBlur: () => { const n = Number(v); if (Number.isInteger(n) && n !== value) onSave(n); else setV(String(value)); }, style: { ...S.input, width: 140 } }));
}

export function SetupScreen({ goTo }) {
  const { api, status, settings, savePrefs, setSetting, live, reloadStatus, openCoach, markOnboarding } = useApp();
  const [name, setName] = useState((status && status.username) || '');
  const [editing, setEditing] = useState(false);
  const [check, setCheck] = useState(null);
  const [engine, setEngine] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [noGames, setNoGames] = useState(false);
  const [cleaned, setCleaned] = useState(null);

  const configured = !!(status && status.configured);
  const sync = (status && status.sync) || {};
  const syncing = sync.state === 'running';
  const games = sync.games || 0;
  const validFormat = NAME.test(name.trim());
  const s = settings || {};

  const wrap = (fn) => async () => { setBusy(true); setErr(null); try { await fn(); } catch (e) { setErr(e); } finally { setBusy(false); } };

  useEffect(() => { reloadStatus(); }, [live.syncTick]);
  useEffect(() => {
    let live1 = true;
    api.post('engine/check', {}).then((r) => { if (live1) { setEngine(r); if (r && r.ok) markOnboarding('engine', true); } }, () => { if (live1) setEngine({ ok: false }); });
    return () => { live1 = false; };
  }, []);

  const verify = wrap(async () => {
    const r = await api.post('sync/check', { username: name.trim() });
    setCheck(r);
    if (r.ok) {
      await savePrefs({ username: name.trim() });
      await markOnboarding('username', true);
      setEditing(false);
      await reloadStatus();
    }
  });
  const finish = async (leave) => {
    await markOnboarding('sync', true);
    await markOnboarding('complete', true);
    if (!(status && status.onboarding && status.onboarding.chatOpened)) await openCoach({ remember: true });
    await reloadStatus();
    if (leave) goTo('games');
  };
  // One click: download the latest game, queue its analysis, then go to "Mes parties".
  const analyseLatest = wrap(async () => {
    setNoGames(false);
    await api.post('sync/start', { scope: 'recent', count: 1 });
    let st = null;
    for (let i = 0; i < 120; i += 1) {
      await new Promise((r) => setTimeout(r, 750));
      st = await api.get('status');
      if (!st.sync || st.sync.state !== 'running') break;
    }
    await reloadStatus();
    if (st && st.sync && st.sync.state !== 'running' && st.sync.state !== 'idle') return; // the error notice explains it
    const list = await api.post('games/list', { sort: 'date_desc', page: 1, pageSize: 1 });
    const g = list.items && list.items[0];
    if (!g) { setNoGames(true); return; }
    await api.post('analysis/enqueue', { gameIds: [g.id], priority: 1 });
    await finish(true);
  });
  const clearGames = wrap(async () => {
    if (typeof window !== 'undefined' && !window.confirm(t('setup.clearGamesConfirm'))) return;
    const r = await api.post('games/clear', {}); setCleaned(r.deleted); await reloadStatus();
  });
  const resetAll = wrap(async () => {
    if (typeof window !== 'undefined' && !window.confirm(t('profile.resetConfirm'))) return;
    await api.post('reset', {}); await reloadStatus(); goTo('setup');
  });
  const cleanUnanalysed = wrap(async () => {
    if (typeof window !== 'undefined' && !window.confirm(t('profile.cleanConfirmUnanalysed'))) return;
    const r = await api.post('games/clear', { only: 'unanalysed' }); setCleaned(r.deleted); await reloadStatus();
  });

  const presetKey = (PRESETS.find(([, f, d]) => s.depthFast === f && s.depthDeep === d) || ['custom'])[0];
  const setPreset = (k) => { const p = PRESETS.find(([key]) => key === k); if (p) savePrefs({ depthFast: p[1], depthDeep: p[2] }).catch(setErr); };
  const presetText = { fast: t('profile.presetFastText'), balanced: t('profile.presetBalancedText'), precise: t('profile.presetPreciseText'), custom: '' }[presetKey];
  const initial = ((status && status.username) || name || '?')[0].toUpperCase();

  const accountBody = configured && !editing
    ? h('div', { style: { display: 'grid', gap: 12 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
        h('span', { 'data-linked': true, style: { fontSize: 15, fontWeight: 600, color: 'var(--cc-win)' } }, `✓ ${t('profile.linked')}`),
        h(Btn, { small: true, onClick: () => { setEditing(true); setCheck(null); } }, t('profile.change'))),
      syncing ? h('div', { style: { display: 'grid', gap: 6 } },
        h(ProgressBar, { done: live.syncProgress.archivesDone || 0, total: live.syncProgress.archivesTotal || 0, label: t('sync.running') }),
        h('div', { style: { fontSize: 13, color: 'var(--cc-muted)' }, role: 'status' }, t('sync.running'))) : null,
      sync.state === 'rate_limited' || sync.state === 'error' || sync.state === 'not_found'
        ? h(Notice, { kind: 'error', title: t(sync.state === 'rate_limited' ? 'sync.rateLimited' : sync.state === 'not_found' ? 'sync.notFound' : 'sync.error') }, sync.error || '') : null,
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h(Btn, { primary: true, disabled: busy || syncing, 'data-analyse-latest': true, style: { padding: '11px 24px', fontSize: 15 }, onClick: analyseLatest }, busy || syncing ? t('profile.downloading') : `▶  ${t('profile.analyseLatest')}`),
        games && !syncing ? h(Btn, { disabled: busy, onClick: () => finish(true) }, t('profile.goHome')) : null),
      noGames ? h(Notice, { kind: 'warn' }, t('setup.noGames')) : null)
    : h('div', { style: { display: 'grid', gap: 10 } },
      h('form', { onSubmit: (e) => { e.preventDefault(); if (validFormat && !busy) verify(); }, style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' } },
        h(Field, { label: t('profile.usernameLabel'), hint: name && !validFormat ? t('setup.usernameFormat') : null },
          h('input', { type: 'text', value: name, onChange: (e) => { setName(e.target.value); setCheck(null); }, autoComplete: 'off', spellCheck: false, 'aria-invalid': !!name && !validFormat, style: { ...S.input, width: 260 }, placeholder: t('setup.usernamePlaceholder') })),
        h(Btn, { primary: true, type: 'submit', disabled: busy || !validFormat }, busy ? t('profile.verifying') : t('profile.verify')),
        configured ? h(Btn, { onClick: () => { setEditing(false); setName((status && status.username) || ''); setCheck(null); } }, t('common.cancel')) : null),
      check && check.ok ? h(Notice, { kind: 'info', title: t('setup.accountOk') }, t('setup.accountOkText', { count: check.archives })) : null,
      check && !check.ok ? h(Notice, { kind: 'error', title: t('setup.accountFail') },
        h('div', null, t(`errors.${check.code}`) !== `errors.${check.code}` ? t(`errors.${check.code}`) : check.error,
          check.code === 'network' ? h('div', { style: { marginTop: 8 } }, t('setup.operatorHttp'), h('pre', { style: { background: 'var(--cc-panel2)', border: '1px solid var(--cc-border)', borderRadius: 10, padding: 10, overflow: 'auto', fontSize: 12 } }, POLICY_SNIPPET)) : null)) : null);

  const engineLine = !engine ? t('profile.engineChecking')
    : engine.ok ? t('profile.engineReady', { name: engine.name || 'Stockfish', version: engine.version || '', cores: engine.cores || '?' })
      : `${t('profile.engineFail')}${engine.error ? ` — ${engine.error}` : ''}`;

  return h('div', { style: { display: 'grid', gap: 16, maxWidth: 820, margin: '0 auto', width: '100%' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 16 } },
      h('span', { 'aria-hidden': true, style: { width: 64, height: 64, borderRadius: 999, flex: 'none', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 700, color: 'var(--cc-accent-ink)', background: 'linear-gradient(135deg, var(--cc-accent), color-mix(in srgb, var(--cc-accent) 55%, #7d5cff))' } }, initial),
      h('div', { style: { minWidth: 0 } },
        h('h1', { style: { margin: 0, fontSize: 26, letterSpacing: '-0.02em' } }, configured ? status.username : t('profile.noName')),
        h('p', { style: { margin: '2px 0 0', color: 'var(--cc-muted)', fontSize: 14 } },
          configured ? [t('profile.gamesCount', { count: games }), `(${t('profile.gamesMax')})`, sync.last ? t('profile.lastSync', { when: fmtAgo(sync.last) || sync.last }) : t('profile.neverSynced')].join(' · ') : t('profile.welcome')))),
    err ? h(Notice, { kind: 'error' }, errorText(t, err)) : null,
    h(Section, { title: t('profile.account'), hint: t('profile.accountHint') }, accountBody),
    h(Section, { title: t('profile.analysis') },
      h('div', { style: { display: 'grid', gap: 8 } },
        h('div', { style: { fontSize: 13.5, fontWeight: 600 } }, t('profile.speed')),
        h(Seg, { label: t('profile.speed'), value: presetKey, onChange: setPreset, options: [['fast', t('profile.presetFast')], ['balanced', t('profile.presetBalanced')], ['precise', t('profile.presetPrecise')], ...(presetKey === 'custom' ? [['custom', t('profile.presetCustom')]] : [])] }),
        presetText ? h('div', { style: { fontSize: 12.5, color: 'var(--cc-muted)' } }, presetText) : null),
      h(Toggle, { checked: s.autoAnalyse !== false, onChange: (v) => setSetting('autoAnalyse', v), label: t('profile.autoAnalyse'), hint: t('profile.autoAnalyseHint') }),
      h('div', { 'data-engine': true, style: { fontSize: 13, color: engine && !engine.ok ? 'var(--cc-loss)' : 'var(--cc-muted)' }, role: 'status' }, `${t('profile.engine')} : ${engineLine}`)),
    h(Section, { title: t('profile.cleanTitle'), hint: t('profile.cleanHint') },
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        h(Btn, { primary: true, disabled: busy || games === 0, 'data-clean': 'unanalysed', onClick: cleanUnanalysed, style: { background: 'var(--cc-loss)', color: '#fff', padding: '12px 22px', fontSize: 15 } }, t('profile.cleanUnanalysed')),
        h(Btn, { disabled: busy || games === 0, 'data-clean': 'all', onClick: clearGames, style: { padding: '12px 22px', fontSize: 15, color: 'var(--cc-loss)' } }, t('profile.cleanAll'))),
      cleaned !== null ? h('div', { role: 'status', style: { fontSize: 13.5, color: 'var(--cc-win)' } }, t('profile.cleanDone', { count: cleaned })) : null),
    h(Section, { title: t('profile.magnus'), hint: t('profile.magnusHint') },
      h('div', null, h(Seg, { label: t('profile.magnus'), value: s.language || 'auto', onChange: (v) => setSetting('language', v), options: [['auto', t('profile.lang_auto')], ['fr', t('profile.lang_fr')], ['en', t('profile.lang_en')]] }))),
    h('details', { style: { borderRadius: 18, border: '1px solid var(--cc-border)', background: 'var(--cc-panel)', padding: '12px 18px' } },
      h('summary', { style: { cursor: 'pointer', fontWeight: 600, fontSize: 14.5 } }, t('profile.advanced')),
      h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, alignItems: 'end' } },
        h(NumberPref, { label: t('profile.threads'), value: s.threads ?? 0, onSave: (n) => savePrefs({ threads: n }).catch(setErr) }),
        h(NumberPref, { label: t('profile.hash'), value: s.hashMb ?? 64, onSave: (n) => savePrefs({ hashMb: n }).catch(setErr) }),
        h(Field, { label: t('profile.contact') },
          h('input', { type: 'text', defaultValue: s.contact || '', onBlur: (e) => { if (e.target.value !== (s.contact || '')) savePrefs({ contact: e.target.value }).catch(setErr); }, style: { ...S.input, width: 280 } })))),
    h(Section, { title: t('profile.resetTitle'), hint: t('profile.resetHint') },
      h(Btn, { disabled: busy, 'data-reset': true, onClick: resetAll, style: { padding: '10px 18px', color: 'var(--cc-loss)' } }, t('profile.resetBtn'))),
    h('div', { style: { fontSize: 12, color: 'var(--cc-muted)', lineHeight: 1.5 } }, t('setup.privacy')));
}
