/**
 * Actions de haut niveau du presse-papiers : relient la logique pure
 * (`clipboard.ts`) aux stores et à l'historique. Chaque action produit au
 * plus une seule entrée d'historique.
 */
import { withHistory } from '@/features/history/with-history';
import { useClipboardStore } from '@/stores/clipboard-store';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import { buildClipboard, remapForPaste } from './clipboard';

const DUPLICATE_OFFSET_PX = 40;

function currentClipboardFromSelection() {
  const { nodes, comments, selectedNodeIds } = useDiagramStore.getState();
  const { conceptualModel } = useProjectStore.getState();
  return buildClipboard(conceptualModel, nodes, comments, selectedNodeIds);
}

function describeCount(clipboard: {
  entities: unknown[];
  associations: unknown[];
  comments: unknown[];
}): number {
  return clipboard.entities.length + clipboard.associations.length + clipboard.comments.length;
}

/** Copie la sélection courante dans le presse-papiers interne. */
export function copySelection(): void {
  const clipboard = currentClipboardFromSelection();
  const notify = useUiStore.getState().notify;
  if (!clipboard) {
    notify('info', 'Aucun élément sélectionné à copier.');
    return;
  }
  useClipboardStore.getState().setClipboard(clipboard);
  const count = describeCount(clipboard);
  notify('info', `${count} élément${count > 1 ? 's' : ''} copié${count > 1 ? 's' : ''}.`);
}

/**
 * Colle le contenu du presse-papiers interne, avec un décalage croissant à
 * chaque collage successif (remis à zéro à la prochaine copie). Sélectionne
 * automatiquement les éléments collés.
 */
export function pasteClipboard(): void {
  const clipboard = useClipboardStore.getState().clipboard;
  if (!clipboard) {
    useUiStore.getState().notify('info', 'Le presse-papiers est vide.');
    return;
  }
  const offsetPx = useClipboardStore.getState().consumePasteOffset();
  const { entities, associations, comments, nodes } = remapForPaste(clipboard, {
    x: offsetPx,
    y: offsetPx,
  });
  if (nodes.length === 0) return;

  withHistory(`Coller ${nodes.length} élément${nodes.length > 1 ? 's' : ''}`, () => {
    useProjectStore.getState().pasteEntitiesAndAssociations(entities, associations);
    useDiagramStore.getState().pasteNodesAndComments(nodes, comments);
  });
  useDiagramStore.getState().setSelection(nodes.map((node) => node.id));
}

/**
 * Duplique la sélection courante directement (sans passer par le
 * presse-papiers utilisateur, qui reste inchangé). Sélectionne
 * automatiquement la copie.
 */
export function duplicateSelection(): void {
  const clipboard = currentClipboardFromSelection();
  if (!clipboard) return;
  const { entities, associations, comments, nodes } = remapForPaste(clipboard, {
    x: DUPLICATE_OFFSET_PX,
    y: DUPLICATE_OFFSET_PX,
  });
  if (nodes.length === 0) return;

  withHistory(`Dupliquer ${nodes.length} élément${nodes.length > 1 ? 's' : ''}`, () => {
    useProjectStore.getState().pasteEntitiesAndAssociations(entities, associations);
    useDiagramStore.getState().pasteNodesAndComments(nodes, comments);
  });
  useDiagramStore.getState().setSelection(nodes.map((node) => node.id));
}

export function hasClipboardContent(): boolean {
  return useClipboardStore.getState().clipboard !== null;
}
