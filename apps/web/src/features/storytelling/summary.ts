// "Kết thúc buổi kể" summary: how many recordings were kept in this session.

export type KeptKey = 'end.keptNone' | 'end.keptOne' | 'end.keptMany';

export function keptKey(count: number): KeptKey {
  if (count <= 0) return 'end.keptNone';
  return count === 1 ? 'end.keptOne' : 'end.keptMany';
}
