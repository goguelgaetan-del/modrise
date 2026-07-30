/**
 * Raccourcis clavier complets : Ctrl/Cmd+S (sauvegarder), Ctrl/Cmd+O
 * (importer), Ctrl/Cmd+N (nouveau projet vide), Ctrl/Cmd+Z (annuler),
 * Ctrl/Cmd+Shift+Z et Ctrl+Y (rétablir), Ctrl/Cmd+C/V/D (copier/coller/
 * dupliquer), Ctrl/Cmd+A (tout sélectionner), Suppr/Retour (supprimer la
 * sélection), Échap (désélectionner), F (centrer).
 *
 * Les raccourcis sont ignorés quand le focus est dans un champ de saisie,
 * pour ne jamais casser la copie/collage natifs d'un input ou d'un textarea.
 */
import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { saveNow } from '@/persistence/autosave';
import { copySelection, duplicateSelection, pasteClipboard } from '@/features/clipboard/actions';
import { redo, undo } from '@/features/history/with-history';
import { loadNewProject } from '@/features/projects/new-project';
import { useDiagramStore } from '@/stores/diagram-store';

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null
  );
}

function clickImportInput(): void {
  document.querySelector<HTMLInputElement>('[data-testid="import-file-input"]')?.click();
}

export function useKeyboardShortcuts(requestDeleteSelection: () => void): void {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditingTarget(event.target)) return;
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (modifier && ((key === 'z' && event.shiftKey) || key === 'y')) {
        event.preventDefault();
        redo();
        return;
      }
      if (modifier && key === 'c') {
        event.preventDefault();
        copySelection();
        return;
      }
      if (modifier && key === 'v') {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if (modifier && key === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }
      if (modifier && key === 'a') {
        event.preventDefault();
        const { nodes, setSelection } = useDiagramStore.getState();
        setSelection(nodes.map((node) => node.id));
        return;
      }
      if (modifier && key === 'n') {
        event.preventDefault();
        void loadNewProject('empty').then(() => void fitView({ padding: 0.2 }));
        return;
      }
      if (modifier && key === 'o') {
        event.preventDefault();
        clickImportInput();
        return;
      }
      if (modifier && key === 's') {
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
      if (!modifier && key === 'f') {
        event.preventDefault();
        void fitView({ padding: 0.2, duration: 300 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitView, requestDeleteSelection]);
}
