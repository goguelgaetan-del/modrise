/**
 * Menu contextuel léger du canvas : ouvert au clic droit sur le canvas vide
 * ou sur un nœud, fermé avec Échap ou au clic extérieur (comportement natif
 * du `DropdownMenu` sous-jacent). Réutilise les composants shadcn/ui
 * existants plutôt qu'un menu personnalisé.
 */
import { Copy, Crosshair, Focus, MessageSquareText, Pencil, Plus, Shapes, Square, Trash2 } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { copySelection, duplicateSelection, hasClipboardContent, pasteClipboard } from '@/features/clipboard/actions';
import { createAssociationAt, createCommentAt, createEntityAt } from '@/features/diagram/actions';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContextMenuState } from '../hooks/use-context-menu';

interface CanvasContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onRequestDeleteSelection: () => void;
}

export function CanvasContextMenu({ state, onClose, onRequestDeleteSelection }: CanvasContextMenuProps) {
  const { fitView } = useReactFlow();
  if (!state) return null;

  const selectAndAct = (act: () => void) => {
    act();
    onClose();
  };

  return (
    <DropdownMenu
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          style={{ position: 'fixed', left: state.x, top: state.y, width: 0, height: 0 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        data-testid="canvas-context-menu"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {state.kind === 'canvas' && (
          <>
            <DropdownMenuItem onSelect={() => selectAndAct(() => createEntityAt(state.flowPosition))}>
              <Square aria-hidden /> Ajouter une entité
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => selectAndAct(() => createAssociationAt(state.flowPosition))}
            >
              <Shapes aria-hidden /> Ajouter une association
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => selectAndAct(() => createCommentAt(state.flowPosition))}>
              <MessageSquareText aria-hidden /> Ajouter un commentaire
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!hasClipboardContent()}
              onSelect={() => selectAndAct(pasteClipboard)}
            >
              <Plus aria-hidden /> Coller
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => selectAndAct(() => void fitView({ padding: 0.2, duration: 300 }))}
            >
              <Focus aria-hidden /> Centrer le diagramme
            </DropdownMenuItem>
          </>
        )}

        {state.kind === 'node' && (
          <>
            <DropdownMenuItem
              onSelect={() => {
                useDiagramStore.getState().setSelection([state.nodeId]);
                selectAndAct(copySelection);
              }}
            >
              <Copy aria-hidden /> Copier
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                useDiagramStore.getState().setSelection([state.nodeId]);
                selectAndAct(duplicateSelection);
              }}
            >
              <Copy aria-hidden /> Dupliquer
            </DropdownMenuItem>
            {state.nodeType === 'entity' && (
              <DropdownMenuItem
                onSelect={() => {
                  const node = useDiagramStore.getState().nodes.find((n) => n.id === state.nodeId);
                  if (node) useProjectStore.getState().addAttribute(node.modelId);
                  onClose();
                }}
              >
                <Plus aria-hidden /> Ajouter un attribut
              </DropdownMenuItem>
            )}
            {state.nodeType === 'comment' && (
              <DropdownMenuItem
                onSelect={() => {
                  useDiagramStore.getState().setSelection([state.nodeId]);
                  onClose();
                }}
              >
                <Pencil aria-hidden /> Modifier
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                useDiagramStore.getState().setSelection([state.nodeId]);
                selectAndAct(() =>
                  void fitView({ nodes: [{ id: state.nodeId }], padding: 1.2, duration: 300, maxZoom: 1.2 }),
                );
              }}
            >
              <Crosshair aria-hidden /> Centrer sur l'élément
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                useDiagramStore.getState().setSelection([state.nodeId]);
                selectAndAct(onRequestDeleteSelection);
              }}
            >
              <Trash2 aria-hidden /> Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
