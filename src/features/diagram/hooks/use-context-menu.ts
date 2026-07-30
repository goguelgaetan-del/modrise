/**
 * État du menu contextuel du canvas : ouvert sur clic droit (canvas vide ou
 * nœud), fermé sur Échap, clic extérieur, ou sélection d'une action.
 */
import { useCallback, useState } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import type { DiagramNodeType } from '@/core/diagram/types';
import type { ModriseNode } from '../adapters/to-react-flow';

export type ContextMenuState =
  | { kind: 'canvas'; x: number; y: number; flowPosition: { x: number; y: number } }
  | { kind: 'node'; x: number; y: number; nodeId: string; nodeType: DiagramNodeType }
  | null;

export interface ContextMenuApi {
  state: ContextMenuState;
  onPaneContextMenu: (event: MouseEvent | React.MouseEvent) => void;
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  close: () => void;
}

export function useContextMenu(): ContextMenuApi {
  const [state, setState] = useState<ContextMenuState>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const { clientX, clientY } = event as MouseEvent;
      setState({
        kind: 'canvas',
        x: clientX,
        y: clientY,
        flowPosition: screenToFlowPosition({ x: clientX, y: clientY }),
      });
    },
    [screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const modriseNode = node as ModriseNode;
    setState({
      kind: 'node',
      x: event.clientX,
      y: event.clientY,
      nodeId: modriseNode.id,
      nodeType: modriseNode.type,
    });
  }, []);

  const close = useCallback(() => setState(null), []);

  return { state, onPaneContextMenu, onNodeContextMenu, close };
}
