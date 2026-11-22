// Tiny Markdown renderer (headings, lists, bold/italic/code, paragraphs) built from React elements,
// never innerHTML. SAN tokens the coach reply listed as unverified are highlighted.
import React from 'react';
const h = React.createElement;

const SAN = /\b(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)(?![\w-])/g;

function withFlags(text, flagged, label, keyBase) {
  if (!flagged || flagged.size === 0) return [text];
  const out = [];
  let last = 0;
  let m;
  SAN.lastIndex = 0;
  while ((m = SAN.exec(text))) {
    const bare = m[0].replace(/[+#]$/, '');
    if (!flagged.has(m[0]) && !flagged.has(bare)) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(h('mark', {
      key: `${keyBase}-${m.index}`, title: label, 'data-unverified': 'true',
      style: { background: 'rgba(247,198,49,0.28)', color: 'inherit', borderBottom: '2px solid #f7c631', borderRadius: 3, padding: '0 2px' },
    }, m[0]));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function inline(text, flagged, label, key) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(...withFlags(text.slice(last, m.index), flagged, label, `${key}t${i}`));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(h('strong', { key: `${key}b${i}` }, ...withFlags(tok.slice(2, -2), flagged, label, `${key}b${i}`)));
    else if (tok.startsWith('`')) parts.push(h('code', { key: `${key}c${i}`, style: { fontFamily: 'ui-monospace, monospace', fontSize: '0.92em' } }, ...withFlags(tok.slice(1, -1), flagged, label, `${key}c${i}`)));
    else parts.push(h('em', { key: `${key}e${i}` }, ...withFlags(tok.slice(1, -1), flagged, label, `${key}e${i}`)));
    last = m.index + tok.length;
    i += 1;
  }
  if (last < text.length) parts.push(...withFlags(text.slice(last), flagged, label, `${key}z`));
  return parts.map((p, j) => (typeof p === 'string' ? h(React.Fragment, { key: `${key}s${j}` }, p) : p));
}

export function renderMarkdown(markdown, flaggedList = [], unverifiedLabel = 'Unverified move') {
  const flagged = new Set(flaggedList || []);
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(h('p', { key: `p${out.length}`, style: { margin: '0 0 10px', lineHeight: 1.55 } }, ...inline(para.join(' '), flagged, unverifiedLabel, `p${out.length}`)));
    para = [];
  };
  const flushList = () => {
    if (list) {
      out.push(h(list.ordered ? 'ol' : 'ul', { key: `l${out.length}`, style: { margin: '0 0 10px', paddingLeft: 22, lineHeight: 1.55 } },
        list.items.map((it, i) => h('li', { key: i }, ...inline(it, flagged, unverifiedLabel, `l${out.length}i${i}`)))));
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const hm = /^(#{1,4})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (hm) {
      flushPara(); flushList();
      const size = [20, 17, 15, 14][hm[1].length - 1];
      out.push(h('div', { key: `h${out.length}`, role: 'heading', 'aria-level': hm[1].length + 1, style: { fontWeight: 700, fontSize: size, margin: '14px 0 6px' } }, ...inline(hm[2], flagged, unverifiedLabel, `h${out.length}`)));
    } else if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((ul || ol)[1]);
    } else if (line.trim() === '') {
      flushPara(); flushList();
    } else {
      flushList(); para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return out;
}
