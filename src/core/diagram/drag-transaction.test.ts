import { describe, expect, it } from 'vitest';
import type { DiagramNode } from './types';
import { commitDrag, hasMoved, startDrag, updateDragPreview } from './drag-transaction';

function node(id: string, x: number, y: number, locked = false): DiagramNode {
  return { id, modelId: `m-${id}`, nodeType: 'entity', position: { x, y }, locked };
}

const nodes = [node('a', 0, 0), node('b', 100, 0), node('verrou', 200, 0, true)];

describe('transaction de déplacement', () => {
  it('engage les nœuds demandés avec leur position initiale', () => {
    const transaction = startDrag(nodes, ['a'], 1_000);
    expect(transaction.nodeIds).toEqual(['a']);
    expect(transaction.initialPositions.a).toEqual({ x: 0, y: 0 });
    expect(transaction.currentPositions.a).toEqual({ x: 0, y: 0 });
    expect(transaction.startedAt).toBe(1_000);
  });

  it('exclut les nœuds verrouillés, même sélectionnés avec les autres', () => {
    const transaction = startDrag(nodes, ['a', 'b', 'verrou'], 0);
    expect(transaction.nodeIds).toEqual(['a', 'b']);
    expect(transaction.initialPositions.verrou).toBeUndefined();
  });

  it('ignore un nœud absent de la transaction', () => {
    const transaction = startDrag(nodes, ['a'], 0);
    updateDragPreview(transaction, 'verrou', { x: 999, y: 999 });
    updateDragPreview(transaction, 'inconnu', { x: 999, y: 999 });
    expect(transaction.currentPositions.verrou).toBeUndefined();
    expect(transaction.currentPositions.inconnu).toBeUndefined();
  });

  it('accumule les positions successives sans toucher aux positions initiales', () => {
    const transaction = startDrag(nodes, ['a'], 0);
    for (let frame = 1; frame <= 100; frame += 1) {
      updateDragPreview(transaction, 'a', { x: frame, y: frame * 2 });
    }
    expect(transaction.initialPositions.a).toEqual({ x: 0, y: 0 });
    expect(transaction.currentPositions.a).toEqual({ x: 100, y: 200 });
  });

  it('ne signale aucun mouvement tant que rien n’a bougé', () => {
    const transaction = startDrag(nodes, ['a', 'b'], 0);
    expect(hasMoved(transaction)).toBe(false);
    updateDragPreview(transaction, 'a', { x: 0, y: 0 });
    expect(hasMoved(transaction)).toBe(false);
    updateDragPreview(transaction, 'a', { x: 1, y: 0 });
    expect(hasMoved(transaction)).toBe(true);
  });

  it('ne remonte au commit que les nœuds réellement déplacés', () => {
    const transaction = startDrag(nodes, ['a', 'b'], 0);
    updateDragPreview(transaction, 'a', { x: 40, y: 60 });
    updateDragPreview(transaction, 'b', { x: 100, y: 0 });
    expect(commitDrag(transaction)).toEqual({ a: { x: 40, y: 60 } });
  });

  it('ne remonte rien pour un simple clic', () => {
    const transaction = startDrag(nodes, ['a'], 0);
    expect(commitDrag(transaction)).toEqual({});
  });

  it('conserve les positions relatives d’un déplacement groupé', () => {
    const transaction = startDrag(nodes, ['a', 'b'], 0);
    updateDragPreview(transaction, 'a', { x: 30, y: 30 });
    updateDragPreview(transaction, 'b', { x: 130, y: 30 });
    const moved = commitDrag(transaction);
    expect(moved.b!.x - moved.a!.x).toBe(100);
    expect(moved.b!.y - moved.a!.y).toBe(0);
  });
});
