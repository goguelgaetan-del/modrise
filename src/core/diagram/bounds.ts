/**
 * Calcule le rectangle englobant de tous les nœuds du diagramme (entités,
 * associations, commentaires confondus — ce sont tous des `DiagramNode`),
 * avec une marge de chaque côté. Utilisé par les exports SVG et PNG pour
 * cadrer le diagramme entier, indépendamment du viewport affiché à l'écran
 * et de la sélection courante.
 */
import type { DiagramNode } from './types';

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Dimensions supposées d'un nœud jamais encore mesuré par le navigateur. */
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 100;

export function computeDiagramBounds(nodes: DiagramNode[], margin: number): Bounds {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const width = node.width ?? DEFAULT_NODE_WIDTH;
    const height = node.height ?? DEFAULT_NODE_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}
