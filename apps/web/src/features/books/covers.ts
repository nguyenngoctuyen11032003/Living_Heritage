/** The three cover styles (books.cover_style must match ^[a-z0-9-]{1,30}$). */
export const COVER_STYLES = ['lua-xanh', 'giay-do', 'dat-nung'] as const;
export type CoverStyle = (typeof COVER_STYLES)[number];

export interface CoverTheme {
  bg: string;
  ink: string;
  accent: string;
  /** Extra decorative layer class (noise texture etc). */
  texture: string;
}

export const COVER_THEMES: Record<CoverStyle, CoverTheme> = {
  'lua-xanh': { bg: 'linear-gradient(135deg, #214E43 0%, #163A31 60%, #10302a 100%)', ink: '#FAF7F0', accent: '#DCE8D5', texture: 'bg-noise opacity-[0.12]' },
  'giay-do': { bg: 'linear-gradient(160deg, #F3EBDA 0%, #E8DCC2 100%)', ink: '#1F2933', accent: '#A84832', texture: 'bg-noise opacity-[0.25]' },
  'dat-nung': { bg: 'linear-gradient(150deg, #B85A3E 0%, #A84832 55%, #7E3423 100%)', ink: '#FAF7F0', accent: '#F3D9B1', texture: 'bg-noise opacity-[0.15]' },
};

export function asCoverStyle(value: string | null | undefined): CoverStyle {
  return (COVER_STYLES as readonly string[]).includes(value ?? '') ? (value as CoverStyle) : 'lua-xanh';
}
