/**
 * Contrat de performance du glisser-déposer (v0.5.1, voir
 * docs/canvas-performance.md).
 *
 * Ces tests ne mesurent pas des millisecondes — instables en CI — mais le
 * *nombre de recalculs* déclenchés par un déplacement : c'est ce qui a rendu
 * le canvas lent, et c'est ce qui doit rester borné. Un déplacement, quel que
 * soit le nombre d'événements intermédiaires, ne doit produire qu'une
 * écriture du store, une entrée d'historique et une sauvegarde, et ne doit
 * relancer ni la validation, ni le MLD, ni le SQL.
 *
 * React Flow est remplacé par un composant espion : le canvas lui passe
 * `onNodesChange`, ce qui permet de rejouer des lots de changements
 * exactement comme la bibliothèque les émettrait.
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeChange } from '@xyflow/react';
import type { ModriseNode } from '../adapters/to-react-flow';
import type * as ReactFlowModule from '@xyflow/react';
import type * as ValidateModule from '@/core/validation/validate';
import type * as TransformModule from '@/core/transformations/mcd-to-mld';

const capturedProps: { current: Record<string, unknown> | null } = { current: null };

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof ReactFlowModule>('@xyflow/react');
  return {
    ...actual,
    ReactFlow: (props: Record<string, unknown>) => {
      capturedProps.current = props;
      return <div data-testid="react-flow-stub" />;
    },
    Background: () => null,
    Controls: () => null,
    useReactFlow: () => ({ fitView: vi.fn(), screenToFlowPosition: (p: unknown) => p }),
  };
});

const validateSpy = vi.hoisted(() => vi.fn());
vi.mock('@/core/validation/validate', async () => {
  const actual = await vi.importActual<typeof ValidateModule>('@/core/validation/validate');
  return {
    ...actual,
    validateConceptualModel: (...args: Parameters<typeof actual.validateConceptualModel>) => {
      validateSpy();
      return actual.validateConceptualModel(...args);
    },
  };
});

const transformSpy = vi.hoisted(() => vi.fn());
vi.mock('@/core/transformations/mcd-to-mld', async () => {
  const actual = await vi.importActual<typeof TransformModule>(
    '@/core/transformations/mcd-to-mld',
  );
  return {
    ...actual,
    transformToLogicalModel: (...args: Parameters<typeof actual.transformToLogicalModel>) => {
      transformSpy();
      return actual.transformToLogicalModel(...args);
    },
  };
});

const { DiagramCanvas } = await import('./DiagramCanvas');
const { useDiagramStore } = await import('@/stores/diagram-store');
const { useProjectStore } = await import('@/stores/project-store');
const { useHistoryStore } = await import('@/stores/history-store');
const { largeDiagram, largeModel } = await import('@/tests/fixtures/models');
const { redo, undo } = await import('@/features/history/with-history');

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function positionChanges(
  ids: readonly string[],
  frame: number,
  dragging: boolean,
): NodeChange<ModriseNode>[] {
  return ids.map((id, index) => ({
    type: 'position',
    id,
    position: { x: frame * 4 + index * 200, y: frame * 2 },
    dragging,
  }));
}

function emit(changes: NodeChange<ModriseNode>[]) {
  const handler = capturedProps.current?.onNodesChange as
    | ((changes: NodeChange<ModriseNode>[]) => void)
    | undefined;
  if (!handler) throw new Error('onNodesChange non fourni au composant React Flow');
  handler(changes);
}

describe('contrat de performance du glisser-déposer', () => {
  let storeWrites = 0;
  let unsubscribe: (() => void) | undefined;
  let nodeIds: string[] = [];

  beforeEach(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

    const model = largeModel({ entityCount: 20, associationCount: 25 });
    const diagram = largeDiagram(model);
    nodeIds = diagram.nodes.map((n) => n.id);
    useProjectStore.setState({ conceptualModel: model });
    useDiagramStore.getState().loadDiagram(diagram);
    useHistoryStore.setState({ past: [], future: [] });

    storeWrites = 0;
    unsubscribe = useDiagramStore.subscribe(
      (state) => state.nodes,
      () => {
        storeWrites += 1;
      },
    );

    validateSpy.mockClear();
    transformSpy.mockClear();

    render(<DiagramCanvas onRequestDeleteSelection={() => {}} />);
    // Le rendu initial valide et transforme légitimement une fois.
    validateSpy.mockClear();
    transformSpy.mockClear();
  });

  afterEach(() => {
    unsubscribe?.();
    capturedProps.current = null;
    vi.clearAllMocks();
  });

  it('n’écrit pas le store pendant le déplacement, une seule fois au relâchement', () => {
    const dragged = nodeIds[0]!;
    for (let frame = 1; frame <= 100; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }
    expect(storeWrites).toBe(0);

    emit(positionChanges([dragged], 100, false));
    expect(storeWrites).toBe(1);
  });

  it('ne relance ni la validation, ni le MLD, ni le SQL pendant le déplacement', () => {
    const dragged = nodeIds[0]!;
    for (let frame = 1; frame <= 100; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }
    emit(positionChanges([dragged], 100, false));

    // Une position n'appartient pas au modèle conceptuel : aucun recalcul
    // métier n'a de raison d'être déclenché, ni pendant, ni après.
    expect(validateSpy).not.toHaveBeenCalled();
    expect(transformSpy).not.toHaveBeenCalled();
  });

  it('ne crée qu’une entrée d’historique pour un déplacement continu', () => {
    const dragged = nodeIds[0]!;
    for (let frame = 1; frame <= 50; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }
    emit(positionChanges([dragged], 50, false));

    const { past } = useHistoryStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0]!.label).toBe('Déplacer un élément');
  });

  it('applique la position finale, pas les positions intermédiaires', () => {
    const dragged = nodeIds[0]!;
    for (let frame = 1; frame <= 20; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }
    emit(positionChanges([dragged], 20, false));

    const node = useDiagramStore.getState().nodes.find((n) => n.id === dragged);
    expect(node?.position).toEqual({ x: 80, y: 40 });
  });

  it('ne produit qu’une écriture et une entrée pour un déplacement groupé', () => {
    const dragged = nodeIds.slice(0, 20);
    for (let frame = 1; frame <= 30; frame += 1) {
      emit(positionChanges(dragged, frame, true));
    }
    expect(storeWrites).toBe(0);
    emit(positionChanges(dragged, 30, false));

    expect(storeWrites).toBe(1);
    const { past } = useHistoryStore.getState();
    expect(past).toHaveLength(1);
    expect(past[0]!.label).toBe('Déplacer 20 éléments');

    // Positions relatives préservées : la fixture les espace de 200 px.
    const nodes = useDiagramStore.getState().nodes;
    const first = nodes.find((n) => n.id === dragged[0]!)!;
    const second = nodes.find((n) => n.id === dragged[1]!)!;
    expect(second.position.x - first.position.x).toBe(200);
    expect(second.position.y).toBe(first.position.y);
  });

  it('laisse immobile un nœud verrouillé déplacé avec la sélection', () => {
    const locked = nodeIds[0]!;
    const free = nodeIds[1]!;
    useDiagramStore.getState().setNodeLocked(locked, true);
    const initial = useDiagramStore.getState().nodes.find((n) => n.id === locked)!.position;
    storeWrites = 0;

    for (let frame = 1; frame <= 10; frame += 1) {
      emit(positionChanges([locked, free], frame, true));
    }
    emit(positionChanges([locked, free], 10, false));

    const nodes = useDiagramStore.getState().nodes;
    expect(nodes.find((n) => n.id === locked)!.position).toEqual(initial);
    expect(nodes.find((n) => n.id === free)!.position).toEqual({ x: 240, y: 20 });
  });

  it('n’écrit rien pour un clic sans déplacement réel', () => {
    const clicked = nodeIds[0]!;
    const position = useDiagramStore.getState().nodes.find((n) => n.id === clicked)!.position;
    emit([{ type: 'position', id: clicked, position, dragging: true }]);
    emit([{ type: 'position', id: clicked, position, dragging: false }]);

    expect(storeWrites).toBe(0);
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it('déplace un commentaire comme un nœud métier, sans recalcul métier', () => {
    const comment = nodeIds.find((id) => id.startsWith('node-comment-'))!;
    for (let frame = 1; frame <= 30; frame += 1) {
      emit(positionChanges([comment], frame, true));
    }
    expect(storeWrites).toBe(0);
    emit(positionChanges([comment], 30, false));

    expect(storeWrites).toBe(1);
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useDiagramStore.getState().nodes.find((n) => n.id === comment)!.position).toEqual({
      x: 120,
      y: 60,
    });
    // Un commentaire n'appartient pas au modèle conceptuel non plus.
    expect(validateSpy).not.toHaveBeenCalled();
    expect(transformSpy).not.toHaveBeenCalled();
  });

  it('restaure la position initiale après annulation, puis la rétablit', () => {
    const dragged = nodeIds[0]!;
    const initial = useDiagramStore.getState().nodes.find((n) => n.id === dragged)!.position;

    for (let frame = 1; frame <= 10; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }
    emit(positionChanges([dragged], 10, false));
    const moved = useDiagramStore.getState().nodes.find((n) => n.id === dragged)!.position;
    expect(moved).not.toEqual(initial);

    undo();
    expect(useDiagramStore.getState().nodes.find((n) => n.id === dragged)!.position).toEqual(
      initial,
    );

    redo();
    expect(useDiagramStore.getState().nodes.find((n) => n.id === dragged)!.position).toEqual(moved);
  });

  it('abandonne la branche de rétablissement si un déplacement suit une annulation', () => {
    const dragged = nodeIds[0]!;
    emit(positionChanges([dragged], 1, true));
    emit(positionChanges([dragged], 5, false));
    undo();
    expect(useHistoryStore.getState().future).toHaveLength(1);

    // Un nouveau déplacement après annulation coupe la branche rétablissable.
    emit(positionChanges([dragged], 1, true));
    emit(positionChanges([dragged], 9, false));
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(useHistoryStore.getState().past).toHaveLength(1);
  });

  it('abandonne la transaction si le nœud déplacé est supprimé en cours de route', () => {
    const dragged = nodeIds[0]!;
    const modelId = useDiagramStore.getState().nodes.find((n) => n.id === dragged)!.modelId;

    for (let frame = 1; frame <= 10; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }
    useDiagramStore.getState().removeNodesForModel([modelId]);
    const writesAfterDeletion = storeWrites;

    emit(positionChanges([dragged], 10, false));

    // Le nœud n'est pas ressuscité, et aucune entrée d'historique ne décrit
    // un diagramme qui n'existe plus.
    expect(useDiagramStore.getState().nodes.some((n) => n.id === dragged)).toBe(false);
    expect(storeWrites).toBe(writesAfterDeletion);
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });

  it('abandonne la transaction si un autre projet est ouvert en cours de route', () => {
    const dragged = nodeIds[0]!;
    for (let frame = 1; frame <= 10; frame += 1) {
      emit(positionChanges([dragged], frame, true));
    }

    const other = largeDiagram(largeModel({ entityCount: 3, associationCount: 2 }));
    useDiagramStore.getState().loadDiagram(other);
    const writesAfterImport = storeWrites;

    emit(positionChanges([dragged], 10, false));

    expect(storeWrites).toBe(writesAfterImport);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useDiagramStore.getState().nodes).toHaveLength(other.nodes.length);
  });

  it('préserve l’identité des nœuds non déplacés passés à React Flow', () => {
    const dragged = nodeIds[0]!;
    const initialNodes = capturedProps.current!.nodes as ModriseNode[];
    const untouched = initialNodes[5]!;

    emit(positionChanges([dragged], 1, true));
    emit(positionChanges([dragged], 10, false));

    const nextNodes = capturedProps.current!.nodes as ModriseNode[];
    // Le nœud déplacé change (nouvelle position) ; les autres conservent leurs
    // données métier, ce qui laisse leur `memo` court-circuiter le rendu.
    expect(nextNodes[5]!.data).toBe(untouched.data);
  });
});
