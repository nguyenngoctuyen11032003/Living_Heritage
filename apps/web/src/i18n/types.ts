export type Locale = 'vi' | 'en';
export const LOCALES: readonly Locale[] = ['vi', 'en'];

/** Same tree as T with every leaf widened to string: an en dictionary must have exactly the vi keys. */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

/** 'a.b.c' paths to the string leaves of T. */
export type DotPath<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPath<T[K]>}`;
}[keyof T & string];
