import type { Shape } from '../types';
import type vi from './family.vi';

export default {
  _ns: 'family',
} satisfies Shape<typeof vi>;
