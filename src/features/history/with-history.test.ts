import { beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '@/core/project/types';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { loadProjectIntoStores } from '@/stores/project-assembly';
import { useProjectStore } from '@/stores/project-store';
import { useDiagramStore } from '@/stores/diagram-store';
import { useHistoryStore } from '@/stores/history-store';
import { captureEditorSnapshot, redo, undo, withHistory } from './with-history';

describe('withHistory', () => {
  beforeEach(() => {
    loadProjectIntoStores(createProject());
    useHistoryStore.getState().clear();
  });

  it("n'enregistre aucune entrée si la mutation ne change rien", () => {
    withHistory('Ne rien faire', () => {
      // no-op
    });
    expect(useHistoryStore.getState().canUndo).toBe(false);
  });

  it('enregistre une entrée quand la mutation change réellement l’état', () => {
    withHistory('Ajouter une entité', () => {
      useProjectStore.getState().addEntity();
    });
    expect(useHistoryStore.getState().canUndo).toBe(true);
    expect(useHistoryStore.getState().undoLabel).toBe('Ajouter une entité');
  });

  it('undo restaure l’état précédent, redo le rétablit', () => {
    withHistory('Ajouter une entité', () => {
      useProjectStore.getState().addEntity();
    });
    expect(useProjectStore.getState().conceptualModel.entities).toHaveLength(1);

    undo();
    expect(useProjectStore.getState().conceptualModel.entities).toHaveLength(0);

    redo();
    expect(useProjectStore.getState().conceptualModel.entities).toHaveLength(1);
  });

  it('undo est un no-op quand il n’y a rien à annuler', () => {
    undo();
    expect(useProjectStore.getState().conceptualModel.entities).toHaveLength(0);
  });

  it('regroupe plusieurs mutations de store en une seule entrée', () => {
    withHistory('Ajouter une entité et un nœud', () => {
      const entity = useProjectStore.getState().addEntity();
      useDiagramStore.getState().addNode(entity.id, 'entity', { x: 0, y: 0 });
    });
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it('captureEditorSnapshot reflète le modèle et le diagramme courants', () => {
    loadProjectIntoStores(createHotelExampleProject());
    const snapshot = captureEditorSnapshot();
    expect(snapshot.conceptualModel.entities.length).toBeGreaterThan(0);
    expect(snapshot.diagramNodes.length).toBeGreaterThan(0);
  });
});
