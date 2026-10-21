// Pure helpers for the illustrated heritage avatars (members + narrators): initials and a stable warm palette.

export interface AvatarPalette {
  /** Circle background. */
  bg: string;
  /** Pattern + initials colour. */
  ink: string;
}

/** Warm palette drawn from the public hub's topic bands (features/knowledge/topics.ts). */
export const AVATAR_PALETTES: readonly AvatarPalette[] = [
  { bg: '#E9C9A0', ink: '#7A3E1D' },
  { bg: '#D9B8A8', ink: '#6B2E22' },
  { bg: '#BFD3C1', ink: '#1F4A3D' },
  { bg: '#C9C2D8', ink: '#3B3360' },
  { bg: '#EBC08F', ink: '#7C3A12' },
  { bg: '#C6D9A8', ink: '#2F5122' },
];

/** Same seed, same colour: a cheap FNV-1a hash so the avatar never changes between renders or devices. */
export function avatarPalette(seed: string): AvatarPalette {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return AVATAR_PALETTES[(h >>> 0) % AVATAR_PALETTES.length]!;
}

/**
 * Vietnamese names put the given name last ("Nguyễn Thị Lan" → "L", "Bà Út" → "Ú"), so the initial is the
 * first letter of the last word. Falls back to "?" for empty names. Keeps combined diacritics (NFC).
 */
export function avatarInitial(name: string | null | undefined): string {
  const words = (name ?? '').normalize('NFC').trim().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1];
  if (!last) return '?';
  const first = Array.from(last).find((ch) => /\p{L}|\p{N}/u.test(ch));
  return first ? first.toLocaleUpperCase('vi') : '?';
}
