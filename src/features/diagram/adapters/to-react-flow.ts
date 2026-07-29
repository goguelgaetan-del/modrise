/**
 * Adaptateurs entre le modèle de Modrise et React Flow.
 *
 * React Flow n'est qu'une couche de rendu : ses nœuds et arêtes sont
 * recalculés à partir des stores et ne sont jamais la source de vérité.
 */
import type { Edge, Node } from '@xyflow/react';
import type { Association, ConceptualModel, Entity } from '@/core/conceptual-model/types';
import { formatCardinality } from '@/core/conceptual-model/types';
import type { DiagramNode } from '@/core/diagram/types';

export interface EntityNodeData extends Record<string, unknown> {
  entity: Entity;
  hasErrors: boolean;
}

export interface AssociationNodeData extends Record<string, unknown> {
  association: Association;
  hasErrors: boolean;
}

export interface ParticipationEdgeData extends Record<string, unknown> {
  cardinalityLabel: string;
  role?: string;
  hasErrors: boolean;
}

export type ModriseNode = Node<EntityNodeData, 'entity'> | Node<AssociationNodeData, 'association'>;
export type ModriseEdge = Edge<ParticipationEdgeData, 'participation'>;

/** Côtés de connexion : chaque nœud expose une paire de handles par côté. */
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

function nodeCenter(node: DiagramNode): { x: number; y: number } {
  return {
    x: node.position.x + (node.width ?? 200) / 2,
    y: node.position.y + (node.height ?? 100) / 2,
  };
}

/** Choisit le couple de côtés le plus naturel entre deux nœuds. */
function closestSides(from: DiagramNode, to: DiagramNode): { from: HandleSide; to: HandleSide } {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
  }
  return dy >= 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
}

export function toReactFlowNodes(
  diagramNodes: DiagramNode[],
  model: ConceptualModel,
  selectedNodeIds: string[],
  modelIdsWithErrors: ReadonlySet<string>,
): ModriseNode[] {
  const selected = new Set(selectedNodeIds);
  const nodes: ModriseNode[] = [];
  for (const diagramNode of diagramNodes) {
    if (diagramNode.nodeType === 'entity') {
      const entity = model.entities.find((e) => e.id === diagramNode.modelId);
      if (!entity) continue;
      nodes.push({
        id: diagramNode.id,
        type: 'entity',
        position: diagramNode.position,
        selected: selected.has(diagramNode.id),
        data: { entity, hasErrors: modelIdsWithErrors.has(entity.id) },
      });
    } else if (diagramNode.nodeType === 'association') {
      const association = model.associations.find((a) => a.id === diagramNode.modelId);
      if (!association) continue;
      nodes.push({
        id: diagramNode.id,
        type: 'association',
        position: diagramNode.position,
        selected: selected.has(diagramNode.id),
        data: { association, hasErrors: modelIdsWithErrors.has(association.id) },
      });
    }
    // TODO(v0.4) : nœuds de commentaire.
  }
  return nodes;
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
