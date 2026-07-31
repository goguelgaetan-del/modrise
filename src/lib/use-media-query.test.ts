import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsNarrowScreen, useIsTablet } from './use-media-query';

function mockMatchMedia(matchingQueries: readonly string[]) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      media: query,
      matches: matchingQueries.includes(query),
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('useIsTablet / useIsNarrowScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('useIsTablet est vrai sous 1200px', () => {
    const restore = mockMatchMedia(['(max-width: 1199px)']);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
    restore();
  });

  it('useIsTablet est faux au-dessus de 1200px', () => {
    const restore = mockMatchMedia([]);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
    restore();
  });

  it('useIsNarrowScreen est vrai sous 768px, indépendamment de useIsTablet', () => {
    const restore = mockMatchMedia(['(max-width: 1199px)', '(max-width: 767px)']);
    const { result } = renderHook(() => useIsNarrowScreen());
    expect(result.current).toBe(true);
    restore();
  });

  it('useIsNarrowScreen est faux entre 768px et 1200px', () => {
    const restore = mockMatchMedia(['(max-width: 1199px)']);
    const { result } = renderHook(() => useIsNarrowScreen());
    expect(result.current).toBe(false);
    restore();
  });
});
