import type { RouteObject } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { internalPath, prefetchPath, resetPrefetch } from './prefetch';

describe('prefetch', () => {
  const layout = vi.fn(async () => ({}));
  const page = vi.fn(async () => ({}));
  const bad = vi.fn(async () => {
    throw new Error('x');
  });
  const routes: RouteObject[] = [
    { lazy: layout as never, children: [{ path: 'a', lazy: page as never }, { path: 'bad', lazy: bad as never }] },
  ];
  beforeEach(() => {
    resetPrefetch();
    vi.clearAllMocks();
  });

  it('calls lazy of every matching route once per path', () => {
    expect(prefetchPath(routes, '/a')).toBe(true);
    expect(prefetchPath(routes, '/a/')).toBe(false);
    expect(layout).toHaveBeenCalledTimes(1);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('honours the basename and ignores non-matching paths', () => {
    expect(prefetchPath(routes, '/app/a', '/app')).toBe(true);
    expect(page).toHaveBeenCalledTimes(1);
    expect(prefetchPath(routes, '/nope')).toBe(false);
  });

  it('swallows lazy failures', async () => {
    expect(() => prefetchPath(routes, '/bad')).not.toThrow();
    await Promise.resolve();
  });

  it('internalPath filters external and new-tab links', () => {
    const mk = (attrs: Record<string, string>) => {
      const a = document.createElement('a');
      for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
      return a;
    };
    const o = window.location.origin;
    expect(internalPath(mk({ href: '/kham-pha' }), o)).toBe('/kham-pha');
    expect(internalPath(mk({ href: 'https://other.example/x' }), o)).toBeNull();
    expect(internalPath(mk({ href: '/x', target: '_blank' }), o)).toBeNull();
    expect(internalPath(mk({ href: '#top' }), o)).toBeNull();
  });
});
