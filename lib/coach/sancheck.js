// Anti-hallucination check for the coach's text (spec §8.3) and payload scrubbing.
// Every SAN token of a reply must belong to the set of moves we gave the coach.

// Strict SAN: castling, piece moves (with disambiguation / capture), pawn moves (capture, promotion),
// optional check/mate sign and !/? annotations. Not preceded or followed by a letter or digit.
const SAN_SRC = '(?<![A-Za-z0-9])(?:O-O-O|O-O|0-0-0|0-0|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?(?:[!?]{1,2})?(?![A-Za-z0-9])';

/** Canonical form for comparison: no annotations/check signs, castling with letters. */
export function normalizeSan(token) {
  return String(token).replace(/[!?]+$/g, '').replace(/[+#]$/g, '').replace(/0/g, 'O');
}

/** All SAN-looking tokens of a markdown text, annotations stripped, in order of appearance (duplicates kept). */
export function extractSanTokens(markdown) {
  const out = [];
  for (const m of String(markdown ?? '').matchAll(new RegExp(SAN_SRC, 'g'))) out.push(m[0].replace(/[!?]+$/g, ''));
  return out;
}

/**
 * @param {string} markdown
 * @param {Set<string>|string[]} allowed SAN moves given to the coach
 * @returns {string[]} unique flagged tokens (not in the allowed set), in order of appearance
 */
export function checkSan(markdown, allowed) {
  const ok = new Set([...(allowed || [])].map(normalizeSan));
  const flagged = [];
  for (const t of extractSanTokens(markdown)) {
    if (!ok.has(normalizeSan(t)) && !flagged.includes(t)) flagged.push(t);
  }
  return flagged;
}

const SECRET_KEY = /(token|secret|password|passwd|passphrase|api[_-]?key|credential|authori[sz]ation|cookie|client[_-]?id|nonce|path|username|email|contact)/i;

/** Deep copy without any credential-, path-, identity- or setting-like key. */
export function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET_KEY.test(k)).map(([k, v]) => [k, scrub(v)]));
  }
  return value;
}
