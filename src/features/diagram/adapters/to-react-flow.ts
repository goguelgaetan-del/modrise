/**
 * Adaptateurs entre le modèle de Modrise et React Flow.
 *
 * React Flow n'est qu'une couche de rendu : ses nœuds et arêtes sont
 * recalculés à partir des stores et ne sont jamais la source de vérité.
 */
import type { Edge, Node } from '@xyflow/react';
import type { Association, ConceptualModel, Entity } from '@/core/conceptual-model/types';
import { formatCardinality } from '@/core/conceptual-model/types';
import type { DiagramComment, DiagramNode } from '@/core/diagram/types';
import { closestSides } from '@/core/diagram/geometry';

export interface EntityNodeData extends Record<string, unknown> {
  entity: Entity;
  hasErrors: boolean;
  locked: boolean;
}

export interface AssociationNodeData extends Record<string, unknown> {
  association: Association;
  hasErrors: boolean;
  locked: boolean;
}

export interface CommentNodeData extends Record<string, unknown> {
  comment: DiagramComment;
  locked: boolean;
}

export interface ParticipationEdgeData extends Record<string, unknown> {
  cardinalityLabel: string;
  role?: string;
  hasErrors: boolean;
}

export type ModriseNode =
  | Node<EntityNodeData, 'entity'>
  | Node<AssociationNodeData, 'association'>
  | Node<CommentNodeData, 'comment'>;
export type ModriseEdge = Edge<ParticipationEdgeData, 'participation'>;

export function toReactFlowNodes(
  diagramNodes: DiagramNode[],
  model: ConceptualModel,
  comments: DiagramComment[],
  selectedNodeIds: string[],
  modelIdsWithErrors: ReadonlySet<string>,
): ModriseNode[] {
  const selected = new Set(selectedNodeIds);
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]));
  const associationById = new Map(model.associations.map((association) => [association.id, association]));
  const nodes: ModriseNode[] = [];
  for (const diagramNode of diagramNodes) {
    if (diagramNode.nodeType === 'entity') {
      const entity = entityById.get(diagramNode.modelId);
      if (!entity) continue;
      nodes.push({
        id: diagramNode.id,
        type: 'entity',
        position: diagramNode.position,
        selected: selected.has(diagramNode.id),
        draggable: !diagramNode.locked,
        data: { entity, hasErrors: modelIdsWithErrors.has(entity.id), locked: diagramNode.locked ?? false },
      });
    } else if (diagramNode.nodeType === 'association') {
      const association = associationById.get(diagramNode.modelId);
      if (!association) continue;
      nodes.push({
        id: diagramNode.id,
        type: 'association',
        position: diagramNode.position,
        selected: selected.has(diagramNode.id),
        draggable: !diagramNode.locked,
        data: {
          association,
          hasErrors: modelIdsWithErrors.has(association.id),
          locked: diagramNode.locked ?? false,
        },
      });
    } else if (diagramNode.nodeType === 'comment') {
      const comment = commentById.get(diagramNode.modelId);
      if (!comment) continue;
      nodes.push({
        id: diagramNode.id,
        type: 'comment',
        position: diagramNode.position,
        width: diagramNode.width,
        height: diagramNode.height,
        selected: selected.has(diagramNode.id),
        draggable: !diagramNode.locked,
        data: { comment, locked: diagramNode.locked ?? false },
      });
    }
  }
  return nodes;
}

/**
 * Superpose les positions d'un déplacement en cours aux nœuds dérivés du
 * store, sans repasser par celui-ci (v0.5.1, voir
 * docs/canvas-performance.md).
 *
 * Seuls les nœuds réellement déplacés donnent lieu à un nouvel objet : les
 * autres conservent leur identité référentielle, ce qui laisse React Flow et
 * les `memo` des composants de nœud court-circuiter leur rendu. Sans
 * déplacement en cours, le tableau d'origine est retourné tel quel.
 */
export function applyDragPreviewToNodes(
  nodes: ModriseNode[],
  positions: Readonly<Record<string, { x: number; y: number }>> | null,
): ModriseNode[] {
  if (!positions) return nodes;
  const ids = Object.keys(positions);
  if (ids.length === 0) return nodes;
  let changed = false;
  const next = nodes.map((node) => {
    const position = positions[node.id];
    if (!position || (position.x === node.position.x && position.y === node.position.y)) {
      return node;
    }
    changed = true;
    return { ...node, position } as ModriseNode;
  });
  return changed ? next : nodes;
}

/**
 * Recalcule la géométrie des seules arêtes touchées par un déplacement en
 * cours : le choix du côté de raccordement ne dépend que des positions des
 * deux nœuds reliés, donc une arête dont aucune extrémité ne bouge est
 * conservée à l'identique (§ « arêtes » de docs/canvas-performance.md).
 */
export function applyDragPreviewToEdges(
  edges: ModriseEdge[],
  diagramNodes: DiagramNode[],
  positions: Readonly<Record<string, { x: number; y: number }>> | null,
): ModriseEdge[] {
  if (!positions) return edges;
  const movedIds = Object.keys(positions);
  if (movedIds.length === 0) return edges;

  const moved = new Set(movedIds);
  if (!edges.some((edge) => moved.has(edge.source) || moved.has(edge.target))) return edges;

  const nodeById = new Map<string, DiagramNode>();
  for (const node of diagramNodes) {
    const position = positions[node.id];
    nodeById.set(node.id, position ? { ...node, position } : node);
  }

  let changed = false;
  const next = edges.map((edge) => {
    if (!moved.has(edge.source) && !moved.has(edge.target)) return edge;
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return edge;
    const sides = closestSides(source, target);
    const sourceHandle = `source-${sides.from}`;
    const targetHandle = `target-${sides.to}`;
    if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) return edge;
    changed = true;
    return { ...edge, sourceHandle, targetHandle };
  });
  return changed ? next : edges;
}

/**
 * Une arête React Flow par participation : de l'entité vers l'association,
 * étiquetée par la cardinalité (côté entité) et le rôle éventuel.
 */
export function toReactFlowEdges(
  diagramNodes: DiagramNode[],
  model: ConceptualModel,
  modelIdsWithErrors: ReadonlySet<string>,
): ModriseEdge[] {
  const nodeByModelId = new Map(diagramNodes.map((node) => [node.modelId, node]));
  const edges: ModriseEdge[] = [];
  for (const association of model.associations) {
    const associationNode = nodeByModelId.get(association.id);
    if (!associationNode) continue;
    for (const participation of association.participations) {
      const entityNode = nodeByModelId.get(participation.entityId);
      if (!entityNode) continue;
      const sides = closestSides(entityNode, associationNode);
      edges.push({
        id: participation.id,
        type: 'participation',
        source: entityNode.id,
        sourceHandle: `source-${sides.from}`,
        target: associationNode.id,
        targetHandle: `target-${sides.to}`,
        data: {
          cardinalityLabel: formatCardinality(participation.cardinality),
          role: participation.role,
          hasErrors: modelIdsWithErrors.has(participation.id),
        },
      });
    }
  }
  return edges;
}
