import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : out.push(p); } return out; };

test('portable on Windows, macOS and Linux: relative imports match the file case exactly', () => {
  const lib = join(ROOT, 'lib');
  const files = walk(lib).map((p) => p.split(sep).join('/'));
  const exact = new Set(files);
  const lower = new Set(files.map((f) => f.toLowerCase()));
  const bad = [];
  for (const f of files) {
    if (!f.endsWith('.js') || f.endsWith('/lib/client.js')) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(/from '(\.[^']+)'|import\('(\.[^']+)'\)/g)) {
      const spec = m[1] || m[2];
      const p = normalize(join(dirname(f), spec)).split(sep).join('/');
      if (!exact.has(p) && lower.has(p.toLowerCase())) bad.push(`${f} -> ${spec}`);
    }
  }
  assert.deepEqual(bad, [], 'case-only mismatches break on Linux and case-sensitive macOS volumes');
});

test('portable: no OS-specific path or API in the host half, engine files are resolved through URLs', () => {
  const host = walk(join(ROOT, 'lib')).filter((p) => p.endsWith('.js') && !p.includes(`${sep}client${sep}`) && !p.endsWith(`${sep}client.js`));
  for (const f of host) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/process\.platform|win32|darwin/.test(s), `${f} must not branch on the OS`);
    assert.ok(!/['"`][A-Za-z]:\|['"`]\/(Users|home)\//.test(s), `${f} has an absolute path`);
  }
  const w = readFileSync(join(ROOT, 'lib/engine/worker.js'), 'utf8');
  assert.match(w, /fileURLToPath\(new URL\(/, 'vendored engine resolved from import.meta.url');
  assert.ok(existsSync(join(ROOT, 'vendor/stockfish/package.json')));
});
