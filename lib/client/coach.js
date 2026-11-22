// Coach tab: Markdown report (unverified SAN highlighted), Regenerate, and "Ask a question".
import React from 'react';
import { h, S, Btn, Notice, Loading, ErrorBox, Empty, useApp } from './ui.js';
import { renderMarkdown } from './md.js';
import { errorText } from './api.js';
import { t, fmtDateTime } from './i18n.js';

const { useState, useEffect, useCallback, useRef } = React;

const WAITING = new Set(['queued', 'sent']);

function Answer({ text, flagged }) {
  return h('div', { style: { fontSize: 14 } }, renderMarkdown(text, flagged, t('coach.unverified')));
}

export function CoachPanel({ gameId, analysisReady, onGoAnalyse }) {
  const { api, live, openCoach } = useApp();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState([]);
  const asks = useRef(new Map());

  const coachTick = live.coachTick;
  useEffect(() => {
    let alive = true;
    setReport(null); setError(null);
    api.get(`coach/report/${gameId}`).then((r) => { if (alive) setReport(r); }, (e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [api, gameId, tick, coachTick]);

  const waiting = report && WAITING.has(report.state);
  useEffect(() => {
    if (!waiting) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 3000);
    return () => clearInterval(id);
  }, [waiting]);

  const generate = async (force) => {
    setBusy(true); setError(null);
    try { await api.post('coach/report', { gameId, force: !!force }); setTick((n) => n + 1); } catch (e) { setError(e); } finally { setBusy(false); }
  };

  // Pending asks are polled until done / timeout / error (timer cleaned up).
  const pending = thread.some((m) => m.state === 'pending');
  useEffect(() => {
    if (!pending) return undefined;
    const id = setInterval(async () => {
      const open = thread.filter((m) => m.state === 'pending' && m.requestId);
      for (const m of open) {
        try {
          const r = await api.get(`coach/ask/${m.requestId}`);
          if (r.state !== 'pending') setThread((cur) => cur.map((x) => (x.requestId === m.requestId ? { ...x, state: r.state, answer: r.answer, flagged: r.flagged, message: r.message } : x)));
        } catch (e) { setThread((cur) => cur.map((x) => (x.requestId === m.requestId ? { ...x, state: 'error', message: errorText(t, e) } : x))); }
      }
    }, 2000);
    return () => clearInterval(id);
  }, [pending, thread, api]);

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    const local = { id: Date.now(), question: q, state: 'sending' };
    setThread((cur) => [...cur, local]);
    setQuestion('');
    try {
      const r = await api.post('coach/ask', { gameId, question: q });
      setThread((cur) => cur.map((x) => (x.id === local.id ? { ...x, requestId: r.requestId, state: 'pending' } : x)));
    } catch (err) {
      setThread((cur) => cur.map((x) => (x.id === local.id ? { ...x, state: 'error', message: errorText(t, err) } : x)));
    } finally { setBusy(false); }
  };

  if (!analysisReady) return h(Empty, { title: t('coach.needAnalysisTitle'), action: onGoAnalyse ? h(Btn, { primary: true, onClick: onGoAnalyse }, t('games.analyse')) : null }, t('coach.needAnalysis'));
  if (error && !report) return h(ErrorBox, { error, text: errorText(t, error), onRetry: () => setTick((n) => n + 1) });
  if (!report) return h(Loading);

  let body;
  if (report.state === 'ready') {
    body = h('div', null,
      h(Answer, { text: report.markdown, flagged: report.flagged }),
      report.flagged && report.flagged.length ? h(Notice, { kind: 'warn', title: t('coach.flaggedTitle') }, t('coach.flagged', { moves: report.flagged.join(', ') })) : null,
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' } },
        h('span', { style: { fontSize: 12, color: 'var(--cc-muted)' } }, report.createdAt ? t('coach.generatedAt', { date: fmtDateTime(report.createdAt) }) : ''),
        h(Btn, { small: true, disabled: busy, onClick: () => generate(true) }, t('coach.regenerate'))));
  } else if (WAITING.has(report.state)) {
    body = h(Notice, { kind: 'info', title: t('coach.waitingTitle') }, t('coach.waiting'));
  } else if (report.state === 'timeout' || report.state === 'error') {
    body = h(Notice, { kind: 'error', title: t(report.state === 'timeout' ? 'coach.timeoutTitle' : 'coach.errorTitle'), action: h(Btn, { small: true, disabled: busy, onClick: () => generate(true) }, t('common.retry')) }, report.error || t(report.state === 'timeout' ? 'coach.timeout' : 'errors.generic'));
  } else {
    body = h(Empty, { title: t('coach.noneTitle'), action: h(Btn, { primary: true, disabled: busy, onClick: () => generate(false) }, t('coach.generate')) }, t('coach.none'));
  }

  return h('div', { style: { display: 'grid', gap: 14 } },
    error ? h(ErrorBox, { error, text: errorText(t, error) }) : null,
    body,
    h('div', { style: { borderTop: '1px solid var(--cc-border)', paddingTop: 12, display: 'grid', gap: 8 } },
      h('strong', { style: { fontSize: 14 } }, t('coach.askTitle')),
      thread.map((m) => h('div', { key: m.id, style: { display: 'grid', gap: 6 } },
        h('div', { style: { background: 'var(--cc-sel)', borderRadius: 8, padding: '6px 10px', fontSize: 13.5, justifySelf: 'end', maxWidth: '90%' } }, m.question),
        m.state === 'done' ? h('div', { style: { background: 'var(--cc-panel2)', borderRadius: 8, padding: '8px 12px' } }, h(Answer, { text: m.answer, flagged: m.flagged }))
          : m.state === 'error' || m.state === 'timeout' ? h(Notice, { kind: 'error' }, m.message || t(m.state === 'timeout' ? 'coach.timeout' : 'errors.generic'))
            : h('div', { className: 'cc-spin', style: { ...S.muted, fontSize: 13 } }, t('coach.thinking')))),
      h('form', { onSubmit: ask, style: { display: 'flex', gap: 8 } },
        h('input', { type: 'text', value: question, maxLength: 2000, onChange: (e) => setQuestion(e.target.value), placeholder: t('coach.askPlaceholder'), 'aria-label': t('coach.askTitle'), style: { ...S.input, flex: 1 } }),
        h(Btn, { primary: true, type: 'submit', disabled: busy || !question.trim() }, t('coach.send')))),
    h('div', { style: { fontSize: 11.5, color: 'var(--cc-muted)', lineHeight: 1.45 } }, t('coach.disclaimer'), ' ',
      h('button', { type: 'button', onClick: openCoach, style: { background: 'none', border: 'none', color: 'var(--cc-accent-text)', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontSize: 'inherit' } }, t('coach.openChat'))));
}
