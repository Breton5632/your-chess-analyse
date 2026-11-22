// Classification tokens (spec 9.2): background colour of the round badge + glyph. Our own drawings.
export const ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];

export const TOKENS = {
  brilliant: { color: '#26c2a3', glyph: '!!' },
  great: { color: '#749bbf', glyph: '!' },
  best: { color: '#81b64c', glyph: 'star' },
  excellent: { color: '#96bc4b', glyph: 'check' },
  good: { color: '#97af8b', glyph: 'check' },
  book: { color: '#a88865', glyph: 'knight' },
  inaccuracy: { color: '#f7c631', glyph: '?!' },
  mistake: { color: '#ffa459', glyph: '?' },
  miss: { color: '#ff7769', glyph: 'cross' },
  blunder: { color: '#fa412d', glyph: '??' },
};

// Moves worth a marker on the eval graph.
export const ERRORS = new Set(['inaccuracy', 'mistake', 'miss', 'blunder']);
// Moves the trainer drills.
export const TRAINER_ERRORS = new Set(['mistake', 'miss', 'blunder']);

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// White or near-black glyph, whichever reads better on the token colour.
export function inkFor(hex) {
  return contrast(hex, '#ffffff') >= contrast(hex, '#1b1a18') ? '#ffffff' : '#1b1a18';
}
