// Page shell: palette, status, realtime subscriptions, navigation between the five screens,
// coach chat opening.
import React from 'react';
import { openInIsland } from '@timon/ui';
import { h, S, AppCtx, Btn, Notice, Loading, ErrorBox } from './ui.js';
import { PALETTES, CSS, useDark } from './theme.js';
import { createApi, errorText } from './api.js';
import { t } from './i18n.js';
import { GamesScreen } from './games.js';
import { ReviewScreen } from './review.js';
import { SetupScreen } from './setup.js';

const { useState, useEffect, useRef, useCallback, useMemo } = React;

export const TOPICS = ['sync.progress', 'sync.done', 'analysis.progress', 'analysis.done', 'coach.updated'];
export const COACH_AGENT = 'chess-plugin.coach';

const INITIAL_LIVE = { syncTick: 0, analysisAny: 0, analysisDone: 0, analysisTick: {}, coachTick: 0, progress: {}, syncProgress: {} };

// Pure reducer for realtime payloads (tested).
export function reduceLive(live, topic, payload = {}) {
  switch (topic) {
    case 'sync.progress': return { ...live, syncProgress: payload };
    case 'sync.done': return { ...live, syncTick: live.syncTick + 1, syncProgress: {} };
    case 'analysis.progress': return payload.gameId ? { ...live, progress: { ...live.progress, [payload.gameId]: payload } } : live;
    case 'analysis.done': {
      const progress = { ...live.progress };
      if (payload.gameId) delete progress[payload.gameId];
      return { ...live, progress, analysisAny: live.analysisAny + 1, analysisDone: live.analysisDone + 1, analysisTick: { ...live.analysisTick, [payload.gameId]: (live.analysisTick[payload.gameId] || 0) + 1 } };
    }
    case 'coach.updated': return { ...live, coachTick: live.coachTick + 1 };
    default: return live;
  }
}

export function needsSetup(status) {
  if (!status) return false;
  const ob = status.onboarding || {};
  if (ob.completed) return false;
  return !(status.configured && status.sync && status.sync.games > 0);
}

const STORE = 'chess-coach.view';
const readView = (initial) => {
  if (initial) return initial;
  try { const v = JSON.parse(window.sessionStorage.getItem(STORE) || 'null'); if (v && v.name) return v; } catch { /* ignore */ }
  return null;
};

function EngineChip({ status }) {
  const e = (status && status.engine) || {};
  const bad = e.state === 'error' || e.state === 'missing';
  const color = bad ? 'var(--cc-loss)' : e.state === 'busy' ? 'var(--cc-warn)' : 'var(--cc-win)';
  return h('span', { title: e.error || '', style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--cc-muted)' } },
    h('span', { 'aria-hidden': true, style: { width: 8, height: 8, borderRadius: 4, background: color } }),
    t(`engine.${e.state || 'idle'}`), e.version ? ` · ${e.version}` : '');
}

export function createPage(ctx) {
  const api = createApi(ctx);
  return function ChessPage() {
    const dark = useDark();
    const [status, setStatus] = useState(null);
    const [statusErr, setStatusErr] = useState(null);
    const [settings, setSettings] = useState({ showBestArrow: true });
    const [live, setLive] = useState(INITIAL_LIVE);
    const [view, setView] = useState(() => readView(ctx.__initialView));
    const [coachHelp, setCoachHelp] = useState(false);
    const chatTried = useRef(false);
    const lastStatus = useRef(0);

    const reloadStatus = useCallback(async () => {
      lastStatus.current = Date.now();
      try { setStatus(await api.get('status')); setStatusErr(null); } catch (e) { setStatusErr(e); }
    }, []);
    useEffect(() => { reloadStatus(); api.get('prefs').then((r) => r && r.settings && setSettings(r.settings), () => {}); }, [reloadStatus]);

    // Realtime: invalidations, debounced. Status refresh throttled while progress events stream in.
    useEffect(() => {
      let timer; let pending = [];
      const flush = () => {
        const batch = pending; pending = [];
        setLive((cur) => batch.reduce((acc, [topic, payload]) => reduceLive(acc, topic, payload), cur));
        if (batch.some(([topic]) => topic !== 'analysis.progress' && topic !== 'sync.progress') || Date.now() - lastStatus.current > 1500) reloadStatus();
      };
      const subs = TOPICS.map((topic) => ctx.realtime.subscribe(topic, (payload) => {
        pending.push([topic, payload]);
        clearTimeout(timer);
        timer = setTimeout(flush, 120);
      }));
      return () => { clearTimeout(timer); subs.forEach((off) => { try { off(); } catch { /* ignore */ } }); };
    }, [reloadStatus]);

    const goTo = useCallback((name, params = {}) => {
      const v = { name, ...params };
      setView(v);
      try { window.sessionStorage.setItem(STORE, JSON.stringify(v)); } catch { /* ignore */ }
    }, []);

    const savePrefs = useCallback(async (patch) => {
      let before;
      setSettings((cur) => { before = cur; return { ...cur, ...patch }; });
      try {
        const r = await api.put('prefs', patch);
        if (r && r.settings) setSettings(r.settings);
        return r;
      } catch (e) { setSettings(before || {}); throw e; }
    }, []);
    const setSetting = useCallback((key, value) => savePrefs({ [key]: value }).catch(() => null), [savePrefs]);
    const markOnboarding = useCallback((step, done) => api.put('onboarding', { step, done }).catch(() => null), []);

    const openCoach = useCallback(async (opts = {}) => {
      if (opts.remember && chatTried.current) return true;
      if (opts.remember) chatTried.current = true;
      let ok = false;
      try { ok = !!openInIsland({ type: '@timon/missions:chat', params: { agent: COACH_AGENT, missionId: null, fresh: true } }, { edge: 'right' }); } catch { ok = false; }
      setCoachHelp(!ok);
      if (ok && opts.remember) await markOnboarding('chatOpened', true);
      return ok;
    }, [markOnboarding]);
    // Once after setup: open the coach chat on the right and remember it.
    useEffect(() => {
      if (status && status.onboarding && status.onboarding.completed && !status.onboarding.chatOpened && !chatTried.current) openCoach({ remember: true });
    }, [status]);

    const app = useMemo(() => ({ api, status, settings, setSetting, savePrefs, live, goTo, reloadStatus, openCoach, markOnboarding, dark }), [status, settings, live, goTo, reloadStatus, openCoach, markOnboarding, dark, setSetting, savePrefs]);

    const style = { ...(dark ? PALETTES.dark : PALETTES.light), height: '100%', maxHeight: '100dvh', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' };
    const shell = (kids) => h('div', { className: 'cc', style }, h('style', null, CSS), kids);

    if (statusErr && !status) {
      return shell(h('main', { style: { padding: 24, display: 'grid', gap: 12, maxWidth: 720, margin: '0 auto' } }, h('h1', { style: { margin: 0 } }, t('nav.title')), h(ErrorBox, { error: statusErr, text: errorText(t, statusErr), onRetry: reloadStatus })));
    }
    if (!status) return shell(h('main', { style: { padding: 24 } }, h(Loading, { label: t('common.loading') })));

    const wizard = needsSetup(status);
    const name = view && view.name ? view.name : wizard ? 'setup' : 'games';
    const current = wizard && name !== 'setup' && !(view && view.name) ? 'setup' : name;
    const hasGames = !!(status.sync && status.sync.games > 0);
    const goAnalyse = async () => {
      if (view && view.gameId) { goTo('review', { gameId: view.gameId }); return; }
      try {
        const l = await api.post('games/list', { sort: 'date_desc', page: 1, pageSize: 1 });
        const g = l && l.items && l.items[0];
        goTo(g ? 'review' : 'games', g ? { gameId: g.id } : {});
      } catch { goTo('games'); }
    };
    const nav = [['setup', t('nav.profile'), () => goTo('setup')], ['games', t('nav.home'), () => goTo('games')]];

    let screen;
    if (current === 'setup') screen = h(SetupScreen, { goTo });
    else if (current === 'review' && view && view.gameId) screen = h(ReviewScreen, { key: view.gameId, gameId: view.gameId, initialPly: view.ply, initialTab: view.tab, onBack: () => goTo('games'), goTo });
    else screen = h(GamesScreen, { goTo });

    const a = status.analysis || {};
    return shell(h(AppCtx.Provider, { value: app },
      h('main', { style: { padding: '14px clamp(12px, 2.5vw, 28px) 48px', maxWidth: 2200, margin: '0 auto', display: 'grid', gap: 14 } },
        h('header', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', paddingBottom: 6 } },
          h('strong', { 'data-brand': true, style: { fontSize: 17, letterSpacing: '-0.02em', paddingRight: 6 } }, t('nav.title')),
          h('nav', { 'aria-label': t('nav.title'), style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            nav.map(([k, label, fn, off]) => h('button', {
              key: k, type: 'button', 'data-nav': k, 'aria-current': current === k ? 'page' : undefined, disabled: !!off, onClick: fn, className: 'cc-btn cc-hover',
              style: { border: 'none', background: current === k ? 'var(--cc-sel)' : 'transparent', cursor: 'pointer', padding: '8px 18px', borderRadius: 999, fontSize: 14.5, fontWeight: current === k ? 700 : 500, color: current === k ? 'var(--cc-accent-text)' : 'var(--cc-muted)' },
            }, label))),
          h('span', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
            a.running || a.queued ? h('span', { role: 'status', className: 'cc-spin', style: { fontSize: 12.5, color: 'var(--cc-muted)' } }, t('app.analysing', { running: a.running || 0, queued: a.queued || 0 })) : null,
            h(EngineChip, { status }),
            null)),
        coachHelp ? h(Notice, { kind: 'warn', title: t('app.coachHelpTitle'), action: h(Btn, { small: true, onClick: () => setCoachHelp(false) }, t('common.dismiss')) }, t('app.coachHelp', { agent: COACH_AGENT })) : null,
        h('div', { key: `${current}:${(view && view.gameId) || ''}`, className: 'cc-screen' }, screen))));
  };
}
