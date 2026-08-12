/**
 * Transaction de déplacement de nœuds.
 *
 * Un glisser-déposer produit des dizaines d'événements par seconde alors
 * qu'il ne représente qu'une seule modification du modèle. Cette structure
 * porte l'état *transitoire* du déplacement en cours : les positions
 * courantes y sont accumulées sans jamais toucher au `DiagramModel`, qui
 * reste la source de vérité et n'est mis à jour qu'au relâchement
 * (`commitDrag`) — une seule écriture du store, une seule entrée
 * d'historique, une seule sauvegarde (v0.5.1, voir
 * docs/canvas-performance.md).
 *
 * Module pur : aucune dépendance à React, React Flow ou Zustand.
 */
import type { DiagramNode } from './types';

export interface Position {
  x: number;
  y: number;
}

export interface DragTransaction {
  /** Nœuds effectivement déplaçables engagés dans le déplacement. */
  nodeIds: string[];
  initialPositions: Record<string, Position>;
  currentPositions: Record<string, Position>;
  startedAt: number;
}

function samePosition(a: Position | undefined, b: Position | undefined): boolean {
  return a !== undefined && b !== undefined && a.x === b.x && a.y === b.y;
}

/**
 * Ouvre une transaction pour les nœuds indiqués. Les nœuds verrouillés sont
 * exclus dès l'ouverture : ils ne bougent pas, même s'ils font partie de la
 * sélection déplacée.
 */
export function startDrag(
  nodes: readonly DiagramNode[],
  nodeIds: readonly string[],
  startedAt: number,
): DragTransaction {
  const requested = new Set(nodeIds);
  const transaction: DragTransaction = {
    nodeIds: [],
    initialPositions: {},
    currentPositions: {},
    startedAt,
  };
  for (const node of nodes) {
    if (!requested.has(node.id) || node.locked) continue;
    transaction.nodeIds.push(node.id);
    transaction.initialPositions[node.id] = node.position;
    transaction.currentPositions[node.id] = node.position;
  }
  return transaction;
}

/**
 * Enregistre la position courante d'un nœud. Mutation en place : appelée à
 * chaque événement de déplacement, elle ne doit rien allouer d'inutile ni
 * déclencher de rendu.
 *
 * Un nœud inconnu de la transaction (verrouillé, ou apparu après son
 * ouverture) est ignoré : le déplacement reste borné à ce qui a été engagé.
 */
export function updateDragPreview(
  transaction: DragTransaction,
  nodeId: string,
  position: Position,
): void {
  if (transaction.initialPositions[nodeId] === undefined) return;
  transaction.currentPositions[nodeId] = position;
}

/** Vrai dès qu'au moins un nœud a réellement changé de position. */
export function hasMoved(transaction: DragTransaction): boolean {
  return transaction.nodeIds.some(
    (id) => !samePosition(transaction.initialPositions[id], transaction.currentPositions[id]),
  );
}

/**
 * Positions à écrire dans le store au relâchement : uniquement les nœuds
 * qui ont réellement bougé (un simple clic n'écrit donc rien).
 *
 * Il n'existe pas d'opération d'annulation symétrique : le store n'ayant
 * jamais été écrit pendant le déplacement, abandonner une transaction se
 * réduit à l'oublier — les positions du `DiagramModel` font alors foi.
 */
export function commitDrag(transaction: DragTransaction): Record<string, Position> {
  const moved: Record<string, Position> = {};
  for (const id of transaction.nodeIds) {
    const initial = transaction.initialPositions[id];
    const current = transaction.currentPositions[id];
    if (current === undefined || samePosition(initial, current)) continue;
    moved[id] = current;
  }
  return moved;
}
