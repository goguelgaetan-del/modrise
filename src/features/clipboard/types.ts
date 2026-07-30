import type { Association, Entity } from '@/core/conceptual-model/types';
import type { DiagramComment, DiagramNode } from '@/core/diagram/types';

/**
 * Presse-papiers interne à Modrise (indépendant du presse-papiers système) :
 * un instantané autonome d'une sélection, prêt à être remappé et collé.
 */
export interface EditorClipboard {
  entities: Entity[];
  associations: Association[];
  comments: DiagramComment[];
  nodes: DiagramNode[];
}
