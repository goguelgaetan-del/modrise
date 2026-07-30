/**
 * Historisation des champs texte à mise à jour continue (nom, description,
 * rôle, longueur…) : la valeur change en direct à chaque frappe (contrôlée
 * par le store), mais une seule entrée d'historique est créée par session
 * d'édition — capturée au focus, validée au blur — jamais une par frappe.
 */
import { useRef } from 'react';
import type { EditorSnapshot } from '@/stores/history-store';
import { useHistoryStore } from '@/stores/history-store';
import { captureEditorSnapshot } from './with-history';

function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  return (
    a.conceptualModel === b.conceptualModel &&
    a.diagramNodes === b.diagramNodes &&
    a.diagramComments === b.diagramComments
  );
}

export interface FieldHistoryHandlers {
  onFocus: () => void;
  onBlur: () => void;
}

export function useFieldHistory(label: string): FieldHistoryHandlers {
  const snapshotRef = useRef<EditorSnapshot | null>(null);

  const onFocus = () => {
    snapshotRef.current ??= captureEditorSnapshot();
  };

  const onBlur = () => {
    const before = snapshotRef.current;
    snapshotRef.current = null;
    if (!before) return;
    const after = captureEditorSnapshot();
    if (snapshotsEqual(before, after)) return;
    useHistoryStore.getState().pushEntry({ label, before, after });
  };

  return { onFocus, onBlur };
}
