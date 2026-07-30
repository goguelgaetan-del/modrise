/**
 * Organisation automatique du diagramme via dagre (bibliothèque de layout de
 * graphes orientés, mature et largement utilisée avec React Flow) — voir
 * docs/auto-layout.md pour la justification du choix et le comportement
 * retenu. Vit dans la couche diagramme (features), jamais dans `src/core` :
 * l'algorithme de layout n'est pas une dépendance du moteur Merise. Chargée
 * dynamiquement (voir export-svg.ts pour un import direct, mais ici la
 * bibliothèque est plus lourde et rarement utilisée dans une session) au
 * clic sur « Organiser automatiquement », jamais dans le chunk initial.
 */
import type { ConceptualModel } from '@/core/conceptual-model/types';
import type { DiagramNode } from '@/core/diagram/types';
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from '@/core/diagram/geometry';

export type LayoutDirection = 'horizontal' | 'vertical';

const NODE_SEPARATION_PX = 60;
const RANK_SEPARATION_PX = 100;

export type LayoutPositions = Map<string, { x: number; y: number }>;

/**
 * Calcule de nouvelles positions (coin haut-gauche) pour les nœuds fournis.
 * Les commentaires sont inclus comme nœuds sans arête — dagre les place
 * donc à l'écart du reste plutôt que de tenter de les rapprocher de leur
 * position relative précédente (comportement documenté, voir
 * docs/auto-layout.md). Un nœud verrouillé (`locked: true`) est inclus dans
 * le graphe comme obstacle mais sa position calculée n'est jamais retournée
 * — l'appelant doit conserver sa position actuelle (même principe que
 * `computeAlignment`/`computeDistribution`, voir `src/core/diagram/align.ts`).
 */
export async function computeAutoLayout(
  nodes: DiagramNode[],
  model: ConceptualModel,
  direction: LayoutDirection,
): Promise<LayoutPositions> {
  const dagre = await import('@dagrejs/dagre');
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({
    rankdir: direction === 'horizontal' ? 'LR' : 'TB',
    nodesep: NODE_SEPARATION_PX,
    ranksep: RANK_SEPARATION_PX,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: node.width ?? DEFAULT_NODE_WIDTH,
      height: node.height ?? DEFAULT_NODE_HEIGHT,
    });
  }

  const nodeIdByModelId = new Map(nodes.map((node) => [node.modelId, node.id]));
  let edgeSequence = 0;
  for (const association of model.associations) {
    const associationNodeId = nodeIdByModelId.get(association.id);
    if (!associationNodeId) continue;
    for (const participation of association.participations) {
      const entityNodeId = nodeIdByModelId.get(participation.entityId);
      if (!entityNodeId) continue;
      edgeSequence += 1;
      // Clé d'arête explicite (graphe multi-arêtes) : une association
      // réflexive relie deux fois le même couple de nœuds.
      graph.setEdge(entityNodeId, associationNodeId, {}, `e${edgeSequence}`);
    }
  }

  dagre.layout(graph);

  const positions: LayoutPositions = new Map();
  for (const node of nodes) {
    if (node.locked) continue;
    const layoutNode = graph.node(node.id);
    if (!layoutNode) continue;
    const width = node.width ?? DEFAULT_NODE_WIDTH;
    const height = node.height ?? DEFAULT_NODE_HEIGHT;
    positions.set(node.id, { x: layoutNode.x - width / 2, y: layoutNode.y - height / 2 });
  }
  return positions;
}
