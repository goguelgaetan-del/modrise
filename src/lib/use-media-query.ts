/**
 * Points de rupture responsive de l'application (voir docs/responsive-layout.md).
 *
 * - Tablette (< 1200px) : la barre latérale gauche se replie et l'inspecteur
 *   devient un tiroir plutôt qu'un panneau redimensionnable persistant.
 * - Écran trop étroit (< 768px) : un message non bloquant est affiché en
 *   plus, sans rien désactiver.
 */
import { useEffect, useState } from 'react';

const TABLET_BREAKPOINT_QUERY = '(max-width: 1199px)';
const NARROW_BREAKPOINT_QUERY = '(max-width: 767px)';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const onChange = () => setMatches(mediaQueryList.matches);
    onChange();
    mediaQueryList.addEventListener('change', onChange);
    return () => mediaQueryList.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsTablet(): boolean {
  return useMediaQuery(TABLET_BREAKPOINT_QUERY);
}

export function useIsNarrowScreen(): boolean {
  return useMediaQuery(NARROW_BREAKPOINT_QUERY);
}
