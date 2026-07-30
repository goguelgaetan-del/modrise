/**
 * Géométrie pure du diagramme : centre d'un nœud et choix du côté de
 * connexion le plus naturel entre deux nœuds. Partagée entre l'adaptateur
 * React Flow (`src/features/diagram/adapters`) et le générateur d'export
 * SVG (`src/core/export`), pour garantir que les deux tracent les mêmes
 * arêtes.
 */
import type { DiagramNode } from './types';

/** Dimensions supposées d'un nœud jamais encore mesuré par le navigateur. */
export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 100;

/** Côtés de connexion : chaque nœud expose une paire de handles par côté. */
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

export function nodeCenter(node: DiagramNode): { x: number; y: number } {
  return {
    x: node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) / 2,
    y: node.position.y + (node.height ?? DEFAULT_NODE_HEIGHT) / 2,
  };
}

/**
 * Point d'intersection entre le bord d'un nœud et le rayon partant de son
 * centre en direction d'un point cible — utilisé pour ancrer une arête à la
 * bordure d'une boîte plutôt qu'à son centre (sans quoi une étiquette
 * positionnée « à 30 % du segment » peut tomber sous le rectangle du nœud).
 */
export function nodeBorderPoint(
  node: DiagramNode,
  towardX: number,
  towardY: number,
): { x: number; y: number } {
  const width = node.width ?? DEFAULT_NODE_WIDTH;
  const height = node.height ?? DEFAULT_NODE_HEIGHT;
  const center = nodeCenter(node);
  const dx = towardX - center.x;
  const dy = towardY - center.y;
  if (dx === 0 && dy === 0) return center;

  const scaleX = dx !== 0 ? width / 2 / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? height / 2 / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

/** Choisit le couple de côtés le plus naturel entre deux nœuds. */
export function closestSides(
  from: DiagramNode,
  to: DiagramNode,
): { from: HandleSide; to: HandleSide } {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
  }
  return dy >= 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
}
