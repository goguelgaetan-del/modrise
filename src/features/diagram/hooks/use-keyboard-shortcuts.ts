/**
 * Raccourcis clavier du socle : Ctrl/Cmd+S (sauvegarder), Suppr/Retour
 * (supprimer la sélection), Échap (désélectionner), F (centrer).
 *
 * TODO(v0.4) : Ctrl+Z/Y (historique), Ctrl+C/V/D, Ctrl+O/N, Ctrl+A.
 *
 * Les raccourcis sont ignorés quand le focus est dans un champ de saisie.
 */
import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { saveNow } from '@/persistence/autosave';
import { useDiagramStore } from '@/stores/diagram-store';

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null
  );
}

export function useKeyboardShortcuts(requestDeleteSelection: () => void): void {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditingTarget(event.target)) return;
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveNow();
        return;
      }
      if (!modifier && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        requestDeleteSelection();
        return;
      }
      if (!modifier && event.key === 'Escape') {
        useDiagramStore.getState().setSelection([]);
        return;
      }
      if (!modifier && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void fitView({ padding: 0.2, duration: 300 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitView, requestDeleteSelection]);
}
