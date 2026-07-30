import { beforeEach, describe, expect, it } from 'vitest';
import { createConceptualModel } from '@/core/conceptual-model/factories';
import { MAX_HISTORY_ENTRIES, useHistoryStore } from './history-store';
import type { EditorSnapshot } from './history-store';

function snapshot(): EditorSnapshot {
  return { conceptualModel: createConceptualModel(), diagramNodes: [], diagramComments: [] };
}

describe('history-store', () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  it('démarre vide : ni annulable ni rétablissable', () => {
    const state = useHistoryStore.getState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.undoLabel).toBeUndefined();
  });

  it('pushEntry rend l’action annulable et vide la pile de rétablissement', () => {
    useHistoryStore.getState().pushEntry({ label: 'Ajouter une entité', before: snapshot(), after: snapshot() });
    const state = useHistoryStore.getState();
    expect(state.canUndo).toBe(true);
    expect(state.undoLabel).toBe('Ajouter une entité');
    expect(state.canRedo).toBe(false);
  });

  it('popForUndo renvoie la dernière entrée et la déplace vers le rétablissement', () => {
    useHistoryStore.getState().pushEntry({ label: 'Action A', before: snapshot(), after: snapshot() });
    const entry = useHistoryStore.getState().popForUndo();
    expect(entry?.label).toBe('Action A');
    const state = useHistoryStore.getState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(true);
    expect(state.redoLabel).toBe('Action A');
  });

  it('popForRedo renvoie l’entrée annulée et la remet en pile annulable', () => {
    useHistoryStore.getState().pushEntry({ label: 'Action A', before: snapshot(), after: snapshot() });
    useHistoryStore.getState().popForUndo();
    const entry = useHistoryStore.getState().popForRedo();
    expect(entry?.label).toBe('Action A');
    expect(useHistoryStore.getState().canUndo).toBe(true);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it('une nouvelle action après un annuler efface la branche de rétablissement', () => {
    useHistoryStore.getState().pushEntry({ label: 'Action A', before: snapshot(), after: snapshot() });
    useHistoryStore.getState().popForUndo();
    expect(useHistoryStore.getState().canRedo).toBe(true);

    useHistoryStore.getState().pushEntry({ label: 'Action B', before: snapshot(), after: snapshot() });
    expect(useHistoryStore.getState().canRedo).toBe(false);
    expect(useHistoryStore.getState().undoLabel).toBe('Action B');
  });

  it(`limite l'historique à ${MAX_HISTORY_ENTRIES} entrées`, () => {
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 10; i += 1) {
      useHistoryStore.getState().pushEntry({ label: `Action ${i}`, before: snapshot(), after: snapshot() });
    }
    expect(useHistoryStore.getState().past).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(useHistoryStore.getState().undoLabel).toBe(`Action ${MAX_HISTORY_ENTRIES + 9}`);
  });

  it('clear vide tout (annuler et rétablir)', () => {
    useHistoryStore.getState().pushEntry({ label: 'Action A', before: snapshot(), after: snapshot() });
    useHistoryStore.getState().popForUndo();
    useHistoryStore.getState().clear();
    const state = useHistoryStore.getState();
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
  });
});
