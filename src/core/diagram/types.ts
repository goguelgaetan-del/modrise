/**
 * Modèle graphique du diagramme.
 *
 * Volontairement séparé du modèle conceptuel : les coordonnées, tailles et
 * viewport sont des données de présentation, jamais des données métier.
 * React Flow n'est qu'une couche de rendu ; les adaptateurs se trouvent dans
 * `src/features/diagram/adapters`.
 */

export type DiagramNodeType = 'entity' | 'association' | 'comment';

export interface DiagramModel {
  nodes: DiagramNode[];
  viewport: DiagramViewport;
}

export interface DiagramViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DiagramNode {
  id: string;
  /** Identifiant de l'objet métier représenté (entité, association…). */
  modelId: string;
  nodeType: DiagramNodeType;
  position: {
    x: number;
    y: number;
  };
  width?: number;
  height?: number;
}

export function createDiagramModel(): DiagramModel {
  return { nodes: [], viewport: { x: 0, y: 0, zoom: 1 } };
}
