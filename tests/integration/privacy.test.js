// Privacy: nothing personal may ship in the package (spec 1.4). Scans every file `npm pack --dry-run --json`
// would ship (falls back to the package.json "files" list), plus the built browser bundle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const TEXT_EXT = /\.(js|mjs|cjs|json|md|sql|svg|txt|css|html|tsv|map|ts|wasm\.txt)$/i;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === 'node_modules') continue;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function shippedFiles() {
  try {
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const out = execFileSync(cmd, ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8', timeout: 60000, shell: process.platform === 'win32' });
    const json = JSON.parse(out.slice(out.indexOf('[')));
    const files = json[0].files.map((f) => join(ROOT, f.path));
    if (files.length) return { files, source: 'npm pack' };
  } catch { /* fall through */ }
  const files = ['package.json'];
  const set = [];
  for (const entry of pkg.files || []) {
    const p = join(ROOT, entry);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) set.push(...walk(p)); else set.push(p);
  }
  return { files: [...files.map((f) => join(ROOT, f)), ...set], source: 'files list' };
}

// Personal words to keep out of the package are supplied by the maintainer, never written in the repository:
// CHESS_DENY_WORDS="handle,firstname" npm test
const DENY_WORDS = (process.env.CHESS_DENY_WORDS || '').split(',').map((w) => w.trim()).filter(Boolean)
  .map((w) => [`deny word "${w.length > 2 ? w[0] + '…' : '…'}"`, new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')]);

const FORBIDDEN = [
  ...DENY_WORDS,
  ['e-mail address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ['C:\\Users path', /[A-Za-z]:\\+Users\\+/i],
  ['/Users or /home path', /(?:^|[\s"'`(=:])\/(?:Users|home)\/[A-Za-z0-9._-]+\//],
  ['.timon workspace path', /\.timon[\\/]+(?:workspace|agents)/i],
];
// Third-party license texts legitimately contain contact addresses: allow-list by file, never by pattern.
const EMAIL_ALLOWED_FILES = [/^vendor\/stockfish\/(Copying\.txt|package\.json)$/, /^vendor\/chess\.js$/];

test('package ships files and the manifest keeps the expected shape', () => {
  const { files, source } = shippedFiles();
  assert.ok(files.length > 5, `${source}: ${files.length} files`);
  assert.ok(!files.some((f) => /[\\/](tests|docs|dev|scripts)[\\/]/.test(relative(ROOT, f))), 'tests/docs/dev/scripts are not shipped');
  assert.ok(!files.some((f) => /\.(db|env|tgz)$/.test(f)), 'no db/env/tgz');
});

test('no personal data, e-mail or machine path in shipped files', () => {
  const { files, source } = shippedFiles();
  const hits = [];
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (!TEXT_EXT.test(f) && !/(^|\/)(Copying|LICENSE|VERSION)/i.test(rel)) continue;
    const text = readFileSync(f, 'utf8');
    for (const [label, re] of FORBIDDEN) {
      if (label === 'e-mail address' && EMAIL_ALLOWED_FILES.some((a) => a.test(rel))) continue;
      const m = text.match(re);
      if (m) hits.push(`${rel}: ${label} → ${JSON.stringify(m[0].slice(0, 60))}`);
    }
  }
  assert.deepEqual(hits, [], `personal data found (scanned via ${source}):\n${hits.join('\n')}`);
});

test('manifest: neutral defaults, single outbound host, no host:exec, no secrets', () => {
  const t = pkg.timon;
  assert.equal(t.id, 'chess-coach');
  assert.deepEqual(t.http.hosts.map((h) => h.host), ['api.chess.com']);
  assert.ok(!t.permissions.includes('host:exec'), 'host:exec not requested (D1)');
  const username = t.settings.find((s) => s.key === 'username');
  assert.equal(username.default, '');
  assert.equal(t.settings.find((s) => s.key === 'contact').default, '');
  assert.equal(t.settings.find((s) => s.key === 'autoSync'), undefined, 'no periodic sync setting');
  assert.equal(t.settings.find((s) => s.key === 'hashMb').default, 64);
  assert.equal(pkg.private, true);
  assert.ok(!JSON.stringify(pkg).match(/api[_-]?key|secret|token/i), 'no secret-like key in package.json');
});

test('no CDN / third-party URL at runtime in shipped code', () => {
  const { files } = shippedFiles();
  const bad = [];
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    if (!/\.(js|mjs|css|html|svg)$/.test(f) || rel.startsWith('vendor/')) continue;
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
      const host = m[1].toLowerCase();
      // api.chess.com is the only allowed fetch target; www.w3.org = SVG namespace; chess.com only as a link text
      if (['api.chess.com', 'www.w3.org', 'www.chess.com', 'chess.com', 'localhost', 'example.com'].includes(host)) continue;
      bad.push(`${rel}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, [], `unexpected URLs (potential CDN/telemetry):\n${bad.join('\n')}`);
});

test('no source map reference nor absolute path in the browser bundle', () => {
  const p = join(ROOT, 'lib/client.js');
  if (!existsSync(p)) return assert.fail('lib/client.js missing: run `npm run build` and commit the bundle (CONTRACT D4)');
  const text = readFileSync(p, 'utf8');
  assert.ok(!/sourceMappingURL/.test(text), 'no source map');
  assert.ok(!/[A-Za-z]:\\+(?:Users|workspace)/.test(text));
});
