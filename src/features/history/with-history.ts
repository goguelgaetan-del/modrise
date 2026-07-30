/**
 * Orchestration de l'historique : capture un instantané avant/après une
 * action utilisateur complète (potentiellement plusieurs mutations de
 * store), et l'enregistre comme une seule entrée si quelque chose a
 * réellement changé.
 *
 * `withHistory` est le seul point d'entrée attendu pour toute mutation
 * historisable : les stores eux-mêmes (`project-store`, `diagram-store`)
 * restent inchangés et ignorent l'existence de l'historique, ce qui évite
 * toute régression sur leurs 276 tests existants.
 */
import type { EditorSnapshot } from '@/stores/history-store';
import { useHistoryStore } from '@/stores/history-store';
import { useProjectStore } from '@/stores/project-store';
import { useDiagramStore } from '@/stores/diagram-store';

export function captureEditorSnapshot(): EditorSnapshot {
  const project = useProjectStore.getState();
  const diagram = useDiagramStore.getState();
  return {
    conceptualModel: project.conceptualModel,
    diagramNodes: diagram.nodes,
    diagramComments: diagram.comments,
  };
}

function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  return (
    a.conceptualModel === b.conceptualModel &&
    a.diagramNodes === b.diagramNodes &&
    a.diagramComments === b.diagramComments
  );
}

/**
 * Exécute `mutate` (une ou plusieurs actions de store) et enregistre le
 * résultat comme une seule entrée d'historique nommée `label`, sauf si rien
 * n'a réellement changé (comparaison par référence : Immer ne change une
 * référence que lorsque la partie correspondante est effectivement modifiée).
 */
export function withHistory(label: string, mutate: () => void): void {
  const before = captureEditorSnapshot();
  mutate();
  const after = captureEditorSnapshot();
  if (snapshotsEqual(before, after)) return;
  useHistoryStore.getState().pushEntry({ label, before, after });
}

function applySnapshot(snapshot: EditorSnapshot): void {
  useProjectStore.setState({
    conceptualModel: snapshot.conceptualModel,
    updatedAt: new Date().toISOString(),
  });
  useDiagramStore.setState({
    nodes: snapshot.diagramNodes,
    comments: snapshot.diagramComments,
    selectedNodeIds: [],
  });
}

/** Annule la dernière action historisée, si elle existe. */
export function undo(): void {
  const entry = useHistoryStore.getState().popForUndo();
  if (!entry) return;
  applySnapshot(entry.before);
}

/** Rétablit la dernière action annulée, si elle existe. */
export function redo(): void {
  const entry = useHistoryStore.getState().popForRedo();
  if (!entry) return;
  applySnapshot(entry.after);
}
