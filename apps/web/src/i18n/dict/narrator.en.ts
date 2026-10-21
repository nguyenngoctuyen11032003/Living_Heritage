import type { Shape } from '../types';
import type vi from './narrator.vi';

export default {
  _ns: 'narrator',
} satisfies Shape<typeof vi>;
