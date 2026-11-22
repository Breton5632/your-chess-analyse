// Build data/eco.json from lichess-org/chess-openings (CC0): a.tsv .. e.tsv.
// Usage: node scripts/build-eco.mjs [--from <dir containing a.tsv .. e.tsv>]
// Dev time only: without --from it downloads the files (network needed).
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { Chess } from '../vendor/chess.js';

const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master';
const OUT = fileURLToPath(new URL('../data/eco.json', import.meta.url));
const keyOf = (fen) => fen.split(' ').slice(0, 4).join(' ');

const fromIdx = process.argv.indexOf('--from');
const fromDir = fromIdx > 0 ? process.argv[fromIdx + 1] : null;

async function tsv(letter) {
  if (fromDir) return readFileSync(join(fromDir, `${letter}.tsv`), 'utf8');
  const res = await fetch(`${BASE}/${letter}.tsv`, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${letter}.tsv: HTTP ${res.status}`);
  return res.text();
}

const table = {};
let rows = 0;
for (const letter of ['a', 'b', 'c', 'd', 'e']) {
  const lines = (await tsv(letter)).split(/\r?\n/).filter(Boolean);
  for (const line of lines.slice(1)) {
    const [eco, name, pgn] = line.split('\t');
    if (!eco || !name || !pgn) continue;
    const chess = new Chess();
    try { chess.loadPgn(pgn); } catch { continue; }
    rows++;
    const key = keyOf(chess.fen());
    // Transpositions: keep the first entry listed for a position.
    if (!table[key]) table[key] = { eco, name };
  }
}
mkdirSync(dirname(OUT), { recursive: true });
const json = JSON.stringify(table);
writeFileSync(OUT, json);
console.log(`eco.json: ${Object.keys(table).length} positions from ${rows} lines, ${(json.length / 1024).toFixed(0)} KB`);
