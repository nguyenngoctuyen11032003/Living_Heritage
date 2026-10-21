import type { Shape } from '../types';
import type vi from './settings.vi';

export default {
  _ns: 'settings',
} satisfies Shape<typeof vi>;
