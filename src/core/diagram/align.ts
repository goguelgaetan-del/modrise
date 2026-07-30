/**
 * Alignement et distribution d'une sélection de nœuds — géométrie pure, sans
 * dépendance React Flow. Un nœud verrouillé (`locked: true`) sert d'ancre
 * fixe : il participe au calcul de la cible (bordure, centre) mais n'est
 * jamais lui-même déplacé — le même principe que l'auto-layout, pour un
 * comportement prévisible et cohérent entre les deux fonctionnalités.
 */
import type { DiagramNode } from './types';
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from './geometry';

export type AlignDirection = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type DistributeDirection = 'horizontal' | 'vertical';
export type NodePositions = Map<string, { x: number; y: number }>;

function nodeWidth(node: DiagramNode): number {
  return node.width ?? DEFAULT_NODE_WIDTH;
}

function nodeHeight(node: DiagramNode): number {
  return node.height ?? DEFAULT_NODE_HEIGHT;
}

/**
 * Aligne au moins deux nœuds sur un bord ou un centre commun, calculé sur le
 * rectangle englobant de la sélection entière (nœuds verrouillés inclus).
 */
export function computeAlignment(nodes: DiagramNode[], direction: AlignDirection): NodePositions {
  const positions: NodePositions = new Map();
  if (nodes.length < 2) return positions;

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const maxRight = Math.max(...nodes.map((n) => n.position.x + nodeWidth(n)));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const maxBottom = Math.max(...nodes.map((n) => n.position.y + nodeHeight(n)));
  const centerX = (minX + maxRight) / 2;
  const centerY = (minY + maxBottom) / 2;

  for (const node of nodes) {
    if (node.locked) continue;
    const width = nodeWidth(node);
    const height = nodeHeight(node);
    switch (direction) {
      case 'left':
        positions.set(node.id, { x: minX, y: node.position.y });
        break;
      case 'right':
        positions.set(node.id, { x: maxRight - width, y: node.position.y });
        break;
      case 'centerX':
        positions.set(node.id, { x: centerX - width / 2, y: node.position.y });
        break;
      case 'top':
        positions.set(node.id, { x: node.position.x, y: minY });
        break;
      case 'bottom':
        positions.set(node.id, { x: node.position.x, y: maxBottom - height });
        break;
      case 'centerY':
        positions.set(node.id, { x: node.position.x, y: centerY - height / 2 });
        break;
    }
  }
  return positions;
}

/**
 * Distribue un espacement égal (centre à centre) entre au moins trois nœuds,
 * en conservant fixes les deux éléments extrêmes (les premiers/derniers
 * selon leur centre sur l'axe choisi). Un nœud verrouillé au milieu de la
 * sélection n'est jamais déplacé non plus, mais ne change pas le calcul des
 * positions cibles des autres — un comportement simple et prévisible plutôt
 * qu'une redistribution qui tiendrait compte de son blocage.
 */
export function computeDistribution(
  nodes: DiagramNode[],
  direction: DistributeDirection,
): NodePositions {
  const positions: NodePositions = new Map();
  if (nodes.length < 3) return positions;

  const isHorizontal = direction === 'horizontal';
  const size = (node: DiagramNode) => (isHorizontal ? nodeWidth(node) : nodeHeight(node));
  const center = (node: DiagramNode) =>
    (isHorizontal ? node.position.x : node.position.y) + size(node) / 2;

  const sorted = [...nodes].sort((a, b) => center(a) - center(b));
  const firstCenter = center(sorted[0]!);
  const lastCenter = center(sorted[sorted.length - 1]!);
  const step = (lastCenter - firstCenter) / (sorted.length - 1);

  for (let i = 1; i < sorted.length - 1; i += 1) {
    const node = sorted[i]!;
    if (node.locked) continue;
    const newCenter = firstCenter + i * step;
    const newCoord = newCenter - size(node) / 2;
    positions.set(
      node.id,
      isHorizontal ? { x: newCoord, y: node.position.y } : { x: node.position.x, y: newCoord },
    );
  }
  return positions;
}
