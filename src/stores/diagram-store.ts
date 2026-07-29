/**
 * Store du diagramme : positions des nœuds, viewport et sélection.
 *
 * La sélection est un état d'interface : elle n'est pas persistée
 * (voir le sélecteur `selectPersistedDiagram` utilisé par l'autosauvegarde).
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
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
  /** Ids des nœuds (pas des objets métier) actuellement sélectionnés. */
  selectedNodeIds: string[];

  loadDiagram: (diagram: DiagramModel) => void;
  /** Ajoute un nœud et retourne son id (pour le sélectionner immédiatement). */
  addNode: (
    modelId: string,
    nodeType: DiagramNodeType,
    position: { x: number; y: number },
  ) => string;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  setNodeSize: (nodeId: string, width: number, height: number) => void;
  removeNodesForModel: (modelIds: string[]) => void;
  setViewport: (viewport: DiagramViewport) => void;
  setSelection: (nodeIds: string[]) => void;
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
    })),
  ),
);

/** Partie du store à persister dans le projet (sans la sélection). */
export function selectPersistedDiagram(state: DiagramState): DiagramModel {
  return { nodes: state.nodes, viewport: state.viewport };
}
