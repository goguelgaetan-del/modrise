import { describe, expect, it } from 'vitest';
import { computeDiagramBounds } from './bounds';
import type { DiagramNode } from './types';

function node(id: string, x: number, y: number, width?: number, height?: number): DiagramNode {
  return { id, modelId: id, nodeType: 'entity', position: { x, y }, width, height };
}

describe('computeDiagramBounds', () => {
  it('renvoie un rectangle vide pour un diagramme sans nœud', () => {
    expect(computeDiagramBounds([], 40)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('englobe un seul nœud avec la marge de chaque côté', () => {
    expect(computeDiagramBounds([node('a', 100, 100, 200, 100)], 40)).toEqual({
      x: 60,
      y: 60,
      width: 280,
      height: 180,
    });
  });

  it('englobe plusieurs nœuds, y compris à coordonnées négatives', () => {
    const nodes = [node('a', -50, -20, 200, 100), node('b', 300, 400, 150, 80)];
    expect(computeDiagramBounds(nodes, 40)).toEqual({
      x: -90,
      y: -60,
      width: 300 + 150 - -50 + 80,
      height: 400 + 80 - -20 + 80,
    });
  });

  it('utilise des dimensions par défaut pour un nœud jamais mesuré', () => {
    expect(computeDiagramBounds([node('a', 0, 0)], 0)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  it('ignore la sélection : ne prend pas ce paramètre', () => {
    const nodes = [node('a', 0, 0, 200, 100), node('b', 500, 500, 200, 100)];
    const bounds = computeDiagramBounds(nodes, 40);
    expect(bounds.width).toBeGreaterThan(500);
  });
});
