/**
 * Store du diagramme : positions des nœuds, viewport, commentaires
 * graphiques et sélection.
 *
 * La sélection est un état d'interface : elle n'est pas persistée
 * (voir le sélecteur `selectPersistedDiagram` utilisé par l'autosauvegarde).
 * Les commentaires sont purement graphiques (jamais dans le modèle
 * conceptuel) mais sont persistés au même titre que les positions.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  DiagramComment,
  DiagramModel,
  DiagramNode,
  DiagramNodeType,
  DiagramViewport,
} from '@/core/diagram/types';
import { createDiagramModel } from '@/core/diagram/types';
import { createId } from '@/core/id';

interface DiagramState {
  nodes: DiagramNode[];
  viewport: DiagramViewport;
  comments: DiagramComment[];
  /** Ids des nœuds (pas des objets métier) actuellement sélectionnés. */
  selectedNodeIds: string[];

  loadDiagram: (diagram: DiagramModel) => void;
  /** Ajoute un nœud et retourne son id (pour le sélectionner immédiatement). */
  addNode: (
    modelId: string,
    nodeType: DiagramNodeType,
    position: { x: number; y: number },
  ) => string;
  /** Crée un commentaire graphique et son nœud ; retourne l'id du nœud. */
  addComment: (text: string, position: { x: number; y: number }) => string;
  updateCommentText: (commentId: string, text: string) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  setNodeSize: (nodeId: string, width: number, height: number) => void;
  /** Supprime des nœuds (et, le cas échéant, les commentaires associés) par id d'objet représenté. */
  removeNodesForModel: (modelIds: string[]) => void;
  setViewport: (viewport: DiagramViewport) => void;
  setSelection: (nodeIds: string[]) => void;
  /**
   * Ajoute des nœuds et commentaires déjà entièrement formés (nouveaux ids,
   * `modelId` déjà remappé) — utilisé par le collage et la duplication.
   */
  pasteNodesAndComments: (nodes: DiagramNode[], comments: DiagramComment[]) => void;
}

export const useDiagramStore = create<DiagramState>()(
  subscribeWithSelector(
    immer((set) => ({
      ...createDiagramModel(),
      selectedNodeIds: [],

      loadDiagram: (diagram) => {
        set((state) => {
          state.nodes = diagram.nodes;
          state.viewport = diagram.viewport;
          state.comments = diagram.comments;
          state.selectedNodeIds = [];
        });
      },

      addNode: (modelId, nodeType, position) => {
        const id = createId();
        set((state) => {
          state.nodes.push({ id, modelId, nodeType, position });
        });
        return id;
      },

      addComment: (text, position) => {
        const commentId = createId();
        const nodeId = createId();
        set((state) => {
          state.comments.push({ id: commentId, text });
          state.nodes.push({ id: nodeId, modelId: commentId, nodeType: 'comment', position });
        });
        return nodeId;
      },

      updateCommentText: (commentId, text) => {
        set((state) => {
          const comment = state.comments.find((c) => c.id === commentId);
          if (comment) comment.text = text;
        });
      },

      moveNode: (nodeId, position) => {
        set((state) => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (node) node.position = position;
        });
      },

      setNodeSize: (nodeId, width, height) => {
        set((state) => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (node) {
            node.width = width;
            node.height = height;
          }
        });
      },

      removeNodesForModel: (modelIds) => {
        set((state) => {
          const ids = new Set(modelIds);
          state.nodes = state.nodes.filter((node) => !ids.has(node.modelId));
          state.comments = state.comments.filter((comment) => !ids.has(comment.id));
          state.selectedNodeIds = state.selectedNodeIds.filter((selectedId) =>
            state.nodes.some((node) => node.id === selectedId),
          );
        });
      },

      setViewport: (viewport) => {
        set((state) => {
          state.viewport = viewport;
        });
      },

      setSelection: (nodeIds) => {
        set((state) => {
          state.selectedNodeIds = nodeIds;
        });
      },

      pasteNodesAndComments: (nodes, comments) => {
        set((state) => {
          state.comments.push(...comments);
          state.nodes.push(...nodes);
        });
      },
    })),
  ),
);

/** Partie du store à persister dans le projet (sans la sélection). */
export function selectPersistedDiagram(state: DiagramState): DiagramModel {
  return { nodes: state.nodes, viewport: state.viewport, comments: state.comments };
}
