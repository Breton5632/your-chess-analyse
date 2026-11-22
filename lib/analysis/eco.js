// Opening lookup against data/eco.json ({ epd → { eco, name } }, lichess-org/chess-openings, CC0).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fenKey } from './pgn.js';

const ECO_PATH = fileURLToPath(new URL('../../data/eco.json', import.meta.url));
let table = null;

function load() {
  if (table) return table;
  try {
    table = JSON.parse(readFileSync(ECO_PATH, 'utf8'));
  } catch {
    table = {};
  }
  return table;
}

/** Entry for one position (any FEN), or null. */
export function ecoEntry(fen) {
  return load()[fenKey(fen)] ?? null;
}

/** Whether the position is in the opening book. */
export function inBook(fen) {
  return ecoEntry(fen) !== null;
}

/**
 * Deepest known opening reached by a game.
 * @param {string[]} fensAfter FEN after ply 1, 2, …
 * @returns {{ eco, name, ply } | null}
 */
export function lookupOpening(fensAfter) {
  let found = null;
  for (let i = 0; i < (fensAfter ?? []).length; i++) {
    const e = ecoEntry(fensAfter[i]);
    if (e) found = { eco: e.eco, name: e.name, ply: i + 1 };
  }
  return found;
}

/** Test hook: replace the table (null reloads from disk). */
export function setEcoTable(t) {
  table = t;
}
