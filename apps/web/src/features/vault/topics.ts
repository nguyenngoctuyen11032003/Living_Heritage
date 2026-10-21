import type { SceneKind } from '@/components/illustrations/scenes';

export interface TopicVisual {
  scene: SceneKind;
  /** Band colour (background) and the readable text colour on it. */
  band: string;
  ink: string;
}

const VISUALS: Record<string, TopicVisual> = {
  'tuoi-tho': { scene: 'lantern', band: '#E9C46A', ink: '#3D2E07' },
  'gia-dinh': { scene: 'tet', band: '#A84832', ink: '#FAF7F0' },
  'que-huong': { scene: 'field', band: '#7A9E6B', ink: '#14261A' },
  'nghe-nghiep': { scene: 'pottery', band: '#8C6A4F', ink: '#FAF7F0' },
  'mon-an': { scene: 'kitchen', band: '#D98F4E', ink: '#2E1808' },
  'lam-vuon': { scene: 'garden', band: '#214E43', ink: '#FAF7F0' },
};

const FALLBACK: TopicVisual = { scene: 'porch', band: '#DCE8D5', ink: '#163A31' };

/** Illustration + colour band for a topic slug (unknown / missing topic → neutral porch scene). */
export function topicVisual(slug: string | null | undefined): TopicVisual {
  return (slug && VISUALS[slug]) || FALLBACK;
}
