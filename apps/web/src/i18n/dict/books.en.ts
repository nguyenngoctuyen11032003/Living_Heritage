import type { Shape } from '../types';
import type vi from './books.vi';

export default {
  _ns: 'books',
} satisfies Shape<typeof vi>;
