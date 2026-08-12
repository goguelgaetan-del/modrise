/**
 * Raccourcis clavier complets : Ctrl/Cmd+S (sauvegarder), Ctrl/Cmd+O
 * (importer), Ctrl/Cmd+N (nouveau projet vide), Ctrl/Cmd+Z (annuler),
 * Ctrl/Cmd+Shift+Z et Ctrl+Y (rétablir), Ctrl/Cmd+C/V/D (copier/coller/
 * dupliquer), Ctrl/Cmd+A (tout sélectionner), Suppr/Retour (supprimer la
 * sélection), Échap (désélectionner), F (centrer), F8/Shift+F8 (problème
 * de validation suivant/précédent).
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
import { validateConceptualModel } from '@/core/validation/validate';
import { resolveIssueAnchor } from '@/features/validation/issue-anchors';
import { resolveNextIssueId } from '@/features/validation/issue-navigation';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]') !== null
  );
}

function clickImportInput(): void {
  document.querySelector<HTMLInputElement>('[data-testid="import-file-input"]')?.click();
}

/**
 * F8/Shift+F8 : sélectionne le problème de validation suivant/précédent,
 * ouvre le panneau de validation, sélectionne l'élément concerné dans le
 * diagramme et recentre le canvas dessus.
 */
function focusNextIssue(offset: 1 | -1, fitView: ReturnType<typeof useReactFlow>['fitView']): void {
  const { conceptualModel, settings } = useProjectStore.getState();
  const issues = validateConceptualModel(conceptualModel, {
    namingConvention: settings.namingConvention,
  });
  const ui = useUiStore.getState();
  const nextIssueId = resolveNextIssueId(issues, ui.focusedIssueId, offset);
  if (!nextIssueId) return;
  ui.setFocusedIssueId(nextIssueId);
  ui.setBottomTab('validation');

  const issue = issues.find((i) => i.id === nextIssueId);
  if (!issue) return;
  const anchor = resolveIssueAnchor(conceptualModel, issue);
  if (!anchor.ownerId) return;
  const diagramStore = useDiagramStore.getState();
  const node = diagramStore.nodes.find((n) => n.modelId === anchor.ownerId);
  if (!node) return;
  diagramStore.setSelection([node.id]);
  void fitView({ nodes: [{ id: node.id }], padding: 1.2, duration: 300, maxZoom: 1.2 });
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
        return;
      }
      if (!modifier && event.key === 'F8') {
        event.preventDefault();
        focusNextIssue(event.shiftKey ? -1 : 1, fitView);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitView, requestDeleteSelection]);
}
