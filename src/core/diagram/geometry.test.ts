/**
 * Géométrie des arêtes. `nodeBorderPoint` a fait l'objet d'un correctif :
 * une arête ancrée au *centre* d'un nœud plaçait son étiquette de
 * cardinalité (positionnée à 30 % du segment) sous le rectangle du nœud,
 * donc invisible. Les cas ci-dessous verrouillent le comportement corrigé —
 * le point rendu est toujours sur la bordure, jamais à l'intérieur.
 */
import { describe, expect, it } from 'vitest';
import type { DiagramNode } from './types';
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  closestSides,
  nodeBorderPoint,
  nodeCenter,
} from './geometry';

function node(id: string, x: number, y: number, width = 200, height = 100): DiagramNode {
  return { id, modelId: `m-${id}`, nodeType: 'entity', position: { x, y }, width, height };
}

/** Distance du point au rectangle : 0 exactement s'il est sur la bordure. */
function isOnBorder(target: DiagramNode, point: { x: number; y: number }): boolean {
  const width = target.width ?? DEFAULT_NODE_WIDTH;
  const height = target.height ?? DEFAULT_NODE_HEIGHT;
  const left = target.position.x;
  const top = target.position.y;
  const onVerticalEdge =
    (Math.abs(point.x - left) < 1e-9 || Math.abs(point.x - (left + width)) < 1e-9) &&
    point.y >= top - 1e-9 &&
    point.y <= top + height + 1e-9;
  const onHorizontalEdge =
    (Math.abs(point.y - top) < 1e-9 || Math.abs(point.y - (top + height)) < 1e-9) &&
    point.x >= left - 1e-9 &&
    point.x <= left + width + 1e-9;
  return onVerticalEdge || onHorizontalEdge;
}

describe('centre d’un nœud', () => {
  it('utilise les dimensions mesurées', () => {
    expect(nodeCenter(node('a', 100, 200, 300, 80))).toEqual({ x: 250, y: 240 });
  });

  it('retombe sur les dimensions par défaut si le nœud n’est pas encore mesuré', () => {
    const unmeasured: DiagramNode = {
      id: 'a',
      modelId: 'm-a',
      nodeType: 'entity',
      position: { x: 0, y: 0 },
    };
    expect(nodeCenter(unmeasured)).toEqual({
      x: DEFAULT_NODE_WIDTH / 2,
      y: DEFAULT_NODE_HEIGHT / 2,
    });
  });
});

describe('ancrage d’une arête à la bordure', () => {
  const source = node('source', 0, 0, 200, 100);

  it.each([
    ['à droite', 1000, 50],
    ['à gauche', -1000, 50],
    ['en dessous', 100, 1000],
    ['au-dessus', 100, -1000],
    ['en diagonale', 900, 700],
    ['en diagonale opposée', -900, -700],
    ['à 45° exactement', 1100, 1050],
  ])('rend un point sur la bordure pour une cible %s', (_label, towardX, towardY) => {
    const point = nodeBorderPoint(source, towardX, towardY);
    expect(isOnBorder(source, point)).toBe(true);
  });

  it('sort par le côté qui fait face à la cible', () => {
    expect(nodeBorderPoint(source, 1000, 50)).toEqual({ x: 200, y: 50 });
    expect(nodeBorderPoint(source, -1000, 50)).toEqual({ x: 0, y: 50 });
    expect(nodeBorderPoint(source, 100, 1000)).toEqual({ x: 100, y: 100 });
    expect(nodeBorderPoint(source, 100, -1000)).toEqual({ x: 100, y: 0 });
  });

  it('laisse l’étiquette à 30 % du segment hors du rectangle du nœud', () => {
    // C'était le symptôme du défaut corrigé : ancrée au centre, l'étiquette
    // tombait sous la boîte. Ancrée à la bordure, elle ne peut plus y entrer.
    const target = node('cible', 600, 0, 160, 60);
    const sourceCenter = nodeCenter(source);
    const targetCenter = nodeCenter(target);
    const from = nodeBorderPoint(source, targetCenter.x, targetCenter.y);
    const to = nodeBorderPoint(target, sourceCenter.x, sourceCenter.y);
    const label = { x: from.x + (to.x - from.x) * 0.3, y: from.y + (to.y - from.y) * 0.3 };

    expect(label.x).toBeGreaterThan(source.position.x + (source.width ?? 0));
    expect(label.x).toBeLessThan(target.position.x);
  });

  it('rend le centre pour une association réflexive (cible confondue)', () => {
    const center = nodeCenter(source);
    expect(nodeBorderPoint(source, center.x, center.y)).toEqual(center);
  });
});

describe('choix du côté de raccordement', () => {
  const origin = node('origine', 0, 0, 200, 100);

  it('privilégie l’horizontale quand l’écart horizontal domine', () => {
    expect(closestSides(origin, node('b', 800, 20))).toEqual({ from: 'right', to: 'left' });
    expect(closestSides(origin, node('b', -800, 20))).toEqual({ from: 'left', to: 'right' });
  });

  it('privilégie la verticale quand l’écart vertical domine', () => {
    expect(closestSides(origin, node('b', 10, 800))).toEqual({ from: 'bottom', to: 'top' });
    expect(closestSides(origin, node('b', 10, -800))).toEqual({ from: 'top', to: 'bottom' });
  });

  it('reste déterministe sur une diagonale parfaite', () => {
    const diagonal = closestSides(origin, node('b', 500, 550, 200, 100));
    expect(closestSides(origin, node('b', 500, 550, 200, 100))).toEqual(diagonal);
  });

  it('est symétrique : inverser les nœuds inverse les côtés', () => {
    const other = node('b', 800, 20);
    expect(closestSides(origin, other)).toEqual({ from: 'right', to: 'left' });
    expect(closestSides(other, origin)).toEqual({ from: 'left', to: 'right' });
  });
});
