import type { Shape } from '../types';
import type vi from './admin.vi';

export default {
  _ns: 'admin',
} satisfies Shape<typeof vi>;
