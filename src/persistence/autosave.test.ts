/**
 * Contrat de sauvegarde du glisser-déposer (v0.5.1, voir
 * docs/canvas-performance.md) : les positions intermédiaires d'un
 * déplacement ne doivent jamais atteindre IndexedDB. Seule la position
 * finale est écrite, une fois, après le délai de calme.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveProjectSpy = vi.hoisted(() => vi.fn(async () => {}));
const setLastOpenedProjectIdSpy = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('./project-repository', () => ({
  saveProject: saveProjectSpy,
  setLastOpenedProjectId: setLastOpenedProjectIdSpy,
}));

const { startAutosave } = await import('./autosave');
const { useDiagramStore } = await import('@/stores/diagram-store');
const { useUiStore } = await import('@/stores/ui-store');
const { commitDrag, startDrag, updateDragPreview } = await import('@/core/diagram/drag-transaction');

const DEBOUNCE_MS = 50;

function loadDiagram() {
  useDiagramStore.getState().loadDiagram({
    nodes: [
      { id: 'a', modelId: 'm-a', nodeType: 'entity', position: { x: 0, y: 0 } },
      { id: 'b', modelId: 'm-b', nodeType: 'entity', position: { x: 100, y: 0 } },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
    comments: [],
  });
}

describe('autosauvegarde pendant un déplacement', () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    saveProjectSpy.mockClear();
    loadDiagram();
    useUiStore.getState().setSaveStatus('saved');
    stop = startAutosave(DEBOUNCE_MS);
  });

  afterEach(() => {
    stop?.();
    vi.useRealTimers();
  });

  it('n’écrit rien pendant les 100 événements d’un déplacement', async () => {
    // Le chemin transitoire réel : les positions s'accumulent dans la
    // transaction, jamais dans le store — donc rien n'est planifié.
    const transaction = startDrag(useDiagramStore.getState().nodes, ['a', 'b'], 0);
    for (let frame = 1; frame <= 100; frame += 1) {
      updateDragPreview(transaction, 'a', { x: frame, y: frame });
      updateDragPreview(transaction, 'b', { x: 100 + frame, y: frame });
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 10);
    }

    expect(saveProjectSpy).not.toHaveBeenCalled();
    expect(useUiStore.getState().saveStatus).toBe('saved');

    // Puis le relâchement : une écriture, une sauvegarde.
    useDiagramStore.getState().moveNodes(commitDrag(transaction));
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(saveProjectSpy).toHaveBeenCalledTimes(1);
  });

  it('n’écrit qu’une fois pour l’écriture unique du relâchement', async () => {
    useDiagramStore.getState().moveNodes({ a: { x: 40, y: 40 }, b: { x: 140, y: 40 } });
    expect(useUiStore.getState().saveStatus).toBe('dirty');
    expect(saveProjectSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(saveProjectSpy).toHaveBeenCalledTimes(1);
    expect(useUiStore.getState().saveStatus).toBe('saved');
  });

  it('ne persiste que la dernière position si plusieurs commits s’enchaînent', async () => {
    useDiagramStore.getState().moveNodes({ a: { x: 10, y: 10 } });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
    useDiagramStore.getState().moveNodes({ a: { x: 20, y: 20 } });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
    useDiagramStore.getState().moveNodes({ a: { x: 30, y: 30 } });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

    // Le debounce fusionne les commits rapprochés : une seule écriture, avec
    // la position la plus récente.
    expect(saveProjectSpy).toHaveBeenCalledTimes(1);
    const saved = saveProjectSpy.mock.calls.at(0)?.at(0) as unknown as {
      diagram: { nodes: { id: string; position: unknown }[] };
    };
    expect(saved.diagram.nodes.find((node) => node.id === 'a')?.position).toEqual({ x: 30, y: 30 });
  });

  it('ne planifie pas de sauvegarde pour un lot de positions vide', async () => {
    useDiagramStore.getState().moveNodes({});
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(saveProjectSpy).not.toHaveBeenCalled();
  });
});
