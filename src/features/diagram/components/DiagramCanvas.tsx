/**
 * Canvas MCD : intégration React Flow.
 *
 * Flux de données : les stores (projet + diagramme) sont la source de
 * vérité ; les nœuds/arêtes React Flow en sont dérivés à chaque rendu et
 * les interactions (déplacement, sélection, connexion) sont retraduites en
 * actions de store par les gestionnaires ci-dessous.
 *
 * Exception assumée : le glisser-déposer. Écrire la position dans le store à
 * chaque événement reconstruisait l'intégralité des nœuds et des arêtes
 * plusieurs dizaines de fois par seconde (~162 ms par événement sur un
 * diagramme de 250 nœuds). Le déplacement en cours vit donc dans une
 * transaction transitoire (`src/core/diagram/drag-transaction.ts`) rendue par
 * React Flow lui-même, et n'est écrit dans le store qu'au relâchement — une
 * écriture, une entrée d'historique, une sauvegarde (v0.5.1, voir
 * docs/canvas-performance.md).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  applyDragPreviewToEdges,
  applyDragPreviewToNodes,
  toReactFlowEdges,
  toReactFlowNodes,
  type ModriseNode,
} from '../adapters/to-react-flow';
import {
  commitDrag,
  isDragTransactionStale,
  startDrag,
  updateDragPreview,
  type DragTransaction,
} from '@/core/diagram/drag-transaction';
import { AssociationNode } from '../nodes/AssociationNode';
import { EntityNode } from '../nodes/EntityNode';
import { CommentNode } from '../nodes/CommentNode';
import { ParticipationEdge } from '../edges/ParticipationEdge';
import { countEvent, measureSync } from '@/lib/performance/diagnostics';
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
  const moveNodes = useDiagramStore((state) => state.moveNodes);
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
  // La transaction est un objet *muté sur place* à chaque événement de
  // déplacement (aucun rendu), mais conservé dans l'état React : le rendu a
  // ainsi le droit de lire les positions courantes, et seuls l'ouverture et
  // la clôture de la transaction provoquent un rendu — deux par déplacement,
  // au lieu d'un par pixel.
  const [drag, setDrag] = useState<DragTransaction | null>(null);
  // Miroir non réactif de `drag`, lu par le gestionnaire d'événements : un
  // `setState` n'est pas visible avant le rendu suivant, or plusieurs lots de
  // changements peuvent arriver entre-temps.
  const dragRef = useRef<DragTransaction | null>(null);

  const baseNodes = useMemo(
    () => toReactFlowNodes(diagramNodes, conceptualModel, comments, selectedNodeIds, errorOwnerIds),
    [diagramNodes, conceptualModel, comments, selectedNodeIds, errorOwnerIds],
  );
  const baseEdges = useMemo(
    () => toReactFlowEdges(diagramNodes, conceptualModel, errorParticipationIds),
    [diagramNodes, conceptualModel, errorParticipationIds],
  );

  // Pendant un déplacement, le store n'est pas écrit : React Flow rend
  // lui-même le mouvement. La superposition ci-dessous ne sert donc qu'aux
  // rendus déclenchés par une *autre* source pendant le glissement (une
  // sélection, une validation…), pour qu'ils n'annulent pas le mouvement en
  // cours. Sans déplacement actif, les tableaux d'origine sont retournés à
  // l'identique — aucune allocation, aucun rendu supplémentaire.
  const dragPositions = drag?.currentPositions ?? null;
  const nodes = applyDragPreviewToNodes(baseNodes, dragPositions);
  const edges = applyDragPreviewToEdges(baseEdges, diagramNodes, dragPositions);

  // Compteur de rendus du canvas : sans tableau de dépendances, l'effet
  // s'exécute à chaque rendu validé. Sans effet hors diagnostic actif.
  useEffect(() => {
    countEvent('canvas-render');
  });

  /**
   * Clôt la transaction en cours : une seule écriture du store, une seule
   * entrée d'historique, puis une seule sauvegarde (déclenchée par
   * l'abonnement de l'autosauvegarde à cette écriture).
   */
  const commitDragTransaction = useCallback((transaction: DragTransaction | null) => {
    setDrag(null);
    const before = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    if (!transaction || !before) return;

    // Le diagramme a-t-il changé sous la transaction (import, suppression,
    // annulation pendant que le bouton était enfoncé) ? Si oui, l'oublier.
    if (isDragTransactionStale(transaction, useDiagramStore.getState().nodes)) return;

    const moved = commitDrag(transaction);
    const movedCount = Object.keys(moved).length;
    if (movedCount === 0) return;

    measureSync(
      'drag-commit',
      () => {
        moveNodes(moved);
        const after = captureEditorSnapshot();
        if (before.diagramNodes === after.diagramNodes) return;
        const label = movedCount > 1 ? `Déplacer ${movedCount} éléments` : 'Déplacer un élément';
        useHistoryStore.getState().pushEntry({ label, before, after });
      },
      { nodes: movedCount, gestureMs: Math.round(performance.now() - transaction.startedAt) },
    );
  }, [moveNodes]);

  const onNodesChange = useCallback(
    (changes: NodeChange<ModriseNode>[]) => {
      let selection: string[] | null = null;
      let dragEnded = false;
      let transaction = dragRef.current;

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          if (!transaction) {
            // Première position reçue : on capture l'état d'avant une seule
            // fois, pour l'unique entrée d'historique du déplacement.
            dragSnapshotRef.current = captureEditorSnapshot();
            transaction = startDrag(
              useDiagramStore.getState().nodes,
              changes.flatMap((c) => (c.type === 'position' ? [c.id] : [])),
              performance.now(),
            );
            dragRef.current = transaction;
            setDrag(transaction);
          }
          updateDragPreview(transaction, change.id, change.position);
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

      // Le store, l'historique et la sauvegarde n'entrent en jeu qu'au
      // relâchement — jamais à chaque pixel intermédiaire.
      if (dragEnded) {
        dragRef.current = null;
        commitDragTransaction(transaction);
      }
    },
    [commitDragTransaction, setNodeSize, setSelection],
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
