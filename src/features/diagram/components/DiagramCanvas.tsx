/**
 * Canvas MCD : intégration React Flow.
 *
 * Flux de données : les stores (projet + diagramme) sont la source de
 * vérité ; les nœuds/arêtes React Flow en sont dérivés à chaque rendu et
 * les interactions (déplacement, sélection, connexion) sont retraduites en
 * actions de store par les gestionnaires ci-dessous.
 */
import { useCallback, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Connection,
  type NodeChange,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import { useHistoryStore } from '@/stores/history-store';
import type { EditorSnapshot } from '@/stores/history-store';
import { captureEditorSnapshot, withHistory } from '@/features/history/with-history';
import { useValidation } from '@/features/validation/use-validation';
import { toReactFlowEdges, toReactFlowNodes, type ModriseNode } from '../adapters/to-react-flow';
import { AssociationNode } from '../nodes/AssociationNode';
import { EntityNode } from '../nodes/EntityNode';
import { CommentNode } from '../nodes/CommentNode';
import { ParticipationEdge } from '../edges/ParticipationEdge';
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';
import { EmptyCanvasState } from './EmptyCanvasState';
import { OnboardingHelp } from './OnboardingHelp';
import { CanvasContextMenu } from './CanvasContextMenu';
import { useContextMenu } from '../hooks/use-context-menu';

const nodeTypes = { entity: EntityNode, association: AssociationNode, comment: CommentNode };
const edgeTypes = { participation: ParticipationEdge };

const GRID_SIZE = 16;

interface DiagramCanvasProps {
  onRequestDeleteSelection: () => void;
}

export function DiagramCanvas({ onRequestDeleteSelection }: DiagramCanvasProps) {
  const diagramNodes = useDiagramStore((state) => state.nodes);
  const comments = useDiagramStore((state) => state.comments);
  const viewport = useDiagramStore((state) => state.viewport);
  const selectedNodeIds = useDiagramStore((state) => state.selectedNodeIds);
  const moveNode = useDiagramStore((state) => state.moveNode);
  const setNodeSize = useDiagramStore((state) => state.setNodeSize);
  const setSelection = useDiagramStore((state) => state.setSelection);
  const setViewport = useDiagramStore((state) => state.setViewport);

  const conceptualModel = useProjectStore((state) => state.conceptualModel);
  const gridEnabled = useProjectStore((state) => state.settings.gridEnabled);
  const snapToGrid = useProjectStore((state) => state.settings.snapToGrid);
  const addParticipation = useProjectStore((state) => state.addParticipation);
  const notify = useUiStore((state) => state.notify);

  const { errorOwnerIds, errorParticipationIds } = useValidation();
  useKeyboardShortcuts(onRequestDeleteSelection);
  const contextMenu = useContextMenu();

  const dragSnapshotRef = useRef<EditorSnapshot | null>(null);

  const nodes = useMemo(
    () => toReactFlowNodes(diagramNodes, conceptualModel, comments, selectedNodeIds, errorOwnerIds),
    [diagramNodes, conceptualModel, comments, selectedNodeIds, errorOwnerIds],
  );
  const edges = useMemo(
    () => toReactFlowEdges(diagramNodes, conceptualModel, errorParticipationIds),
    [diagramNodes, conceptualModel, errorParticipationIds],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<ModriseNode>[]) => {
      let selection: string[] | null = null;
      let movedCount = 0;
      let dragEnded = false;

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (!dragSnapshotRef.current) {
            dragSnapshotRef.current = captureEditorSnapshot();
          }
          moveNode(change.id, change.position);
          movedCount += 1;
          if (change.dragging === false) dragEnded = true;
        } else if (change.type === 'dimensions' && change.dimensions) {
          setNodeSize(change.id, change.dimensions.width, change.dimensions.height);
        } else if (change.type === 'select') {
          selection ??= [...useDiagramStore.getState().selectedNodeIds];
          selection = change.selected
            ? [...selection.filter((id) => id !== change.id), change.id]
            : selection.filter((id) => id !== change.id);
        }
      }

      if (selection !== null) {
        setSelection(selection);
      }

      // Un déplacement continu (glisser-déposer) ne doit produire qu'une
      // seule entrée d'historique, enregistrée au relâchement du nœud —
      // jamais à chaque pixel intermédiaire.
      if (dragEnded && dragSnapshotRef.current) {
        const before = dragSnapshotRef.current;
        dragSnapshotRef.current = null;
        const after = captureEditorSnapshot();
        if (before.diagramNodes !== after.diagramNodes) {
          const label = movedCount > 1 ? `Déplacer ${movedCount} éléments` : 'Déplacer un élément';
          useHistoryStore.getState().pushEntry({ label, before, after });
        }
      }
    },
    [moveNode, setNodeSize, setSelection],
  );

  /**
   * Une connexion n'est valide qu'entre une entité et une association :
   * elle crée alors une participation (cardinalité 0,N par défaut).
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      const { nodes: storeNodes } = useDiagramStore.getState();
      const sourceNode = storeNodes.find((node) => node.id === connection.source);
      const targetNode = storeNodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return;

      const [entityNode, associationNode] =
        sourceNode.nodeType === 'entity' && targetNode.nodeType === 'association'
          ? [sourceNode, targetNode]
          : sourceNode.nodeType === 'association' && targetNode.nodeType === 'entity'
            ? [targetNode, sourceNode]
            : [undefined, undefined];

      if (!entityNode || !associationNode) {
        notify(
          'error',
          'Connexion impossible : reliez une entité à une association (deux entités ne peuvent pas être reliées directement).',
        );
        return;
      }
      withHistory('Ajouter une participation', () => {
        addParticipation(associationNode.modelId, entityNode.modelId);
      });
    },
    [addParticipation, notify],
  );

  const onMoveEnd = useCallback(
    (_event: unknown, nextViewport: Viewport) => {
      setViewport(nextViewport);
    },
    [setViewport],
  );

  const isEmpty = diagramNodes.length === 0;

  return (
    <div className="relative h-full w-full" data-testid="diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        onNodeContextMenu={contextMenu.onNodeContextMenu}
        onPaneClick={contextMenu.close}
        onPaneContextMenu={contextMenu.onPaneContextMenu}
        defaultViewport={viewport}
        snapToGrid={snapToGrid}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        // La suppression est gérée par nos raccourcis (garde-fou sur les
        // entités référencées) : on désactive celle de React Flow.
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        {gridEnabled && <Background variant={BackgroundVariant.Dots} gap={GRID_SIZE} size={1} />}
        <Controls showInteractive={false} />
      </ReactFlow>
      {isEmpty && <EmptyCanvasState />}
      <OnboardingHelp />
      <CanvasContextMenu
        state={contextMenu.state}
        onClose={contextMenu.close}
        onRequestDeleteSelection={onRequestDeleteSelection}
      />
    </div>
  );
}
