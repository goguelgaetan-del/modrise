/**
 * Modèle graphique du diagramme.
 *
 * Volontairement séparé du modèle conceptuel : les coordonnées, tailles et
 * viewport sont des données de présentation, jamais des données métier. Les
 * commentaires suivent la même règle : ils sont purement graphiques et
 * n'existent jamais dans le `ConceptualModel`. React Flow n'est qu'une
 * couche de rendu ; les adaptateurs se trouvent dans
 * `src/features/diagram/adapters`.
 */

export type DiagramNodeType = 'entity' | 'association' | 'comment';

export interface DiagramModel {
  nodes: DiagramNode[];
  viewport: DiagramViewport;
  comments: DiagramComment[];
}

export interface DiagramViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DiagramNode {
  id: string;
  /**
   * Identifiant de l'objet représenté : une entité ou une association du
   * modèle conceptuel, ou (pour `nodeType: "comment"`) l'id d'un
   * `DiagramComment` de ce même modèle graphique.
   */
  modelId: string;
  nodeType: DiagramNodeType;
  position: {
    x: number;
    y: number;
  };
  width?: number;
  height?: number;
}

/** Commentaire purement graphique : jamais présent dans le modèle conceptuel. */
export interface DiagramComment {
  id: string;
  text: string;
}

export function createDiagramModel(): DiagramModel {
  return { nodes: [], viewport: { x: 0, y: 0, zoom: 1 }, comments: [] };
}
