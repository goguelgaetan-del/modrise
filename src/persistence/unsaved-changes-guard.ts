/**
 * Garde-fou de fermeture d'onglet : n'avertit que s'il existe réellement des
 * modifications non sauvegardées (`saveStatus` à `'dirty'` ou `'saving'` —
 * une sauvegarde en cours ne doit pas non plus être interrompue en
 * silence). Désactivé dès que l'autosauvegarde a abouti.
 */
import { useUiStore } from '@/stores/ui-store';

export function startUnsavedChangesGuard(): () => void {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    const { saveStatus } = useUiStore.getState();
    if (saveStatus !== 'dirty' && saveStatus !== 'saving') return;
    event.preventDefault();
    event.returnValue = '';
  };

  window.addEventListener('beforeunload', onBeforeUnload);
  return () => window.removeEventListener('beforeunload', onBeforeUnload);
}
