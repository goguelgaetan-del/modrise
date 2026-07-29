import { useUiStore } from '@/stores/ui-store';

export const THEME_STORAGE_KEY = 'modrise-theme';

/** Applique le thème mémorisé (localStorage) au démarrage, s'il existe. */
export function loadStoredTheme(): void {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    useUiStore.getState().setTheme(stored);
  }
}
