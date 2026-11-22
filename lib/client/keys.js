// Keyboard navigation logic for the review screen, kept pure so it can be tested.
// state: { ply, max, flipped, playing } -> next state, or null when the key is not ours.
export function reduceNav(state, key) {
  const { ply, max } = state;
  const go = (p) => ({ ...state, ply: Math.max(0, Math.min(max, p)) });
  switch (key) {
    case 'ArrowLeft': return { ...go(ply - 1), playing: false };
    case 'ArrowRight': return go(ply + 1);
    case 'Home': return { ...go(0), playing: false };
    case 'End': return { ...go(max), playing: false };
    case 'f': case 'F': return { ...state, flipped: !state.flipped };
    case ' ': case 'Spacebar': return { ...state, playing: ply >= max ? false : !state.playing };
    default: return null;
  }
}

// Keys must not be hijacked while the user types.
export function isTypingTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = String(el.tagName).toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true;
}
