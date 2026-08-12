/**
 * Nœud de commentaire : note graphique libre, sans poignée de connexion.
 * Double-clic pour éditer le texte en place ; l'inspecteur permet aussi la
 * modification (voir `CommentInspector`).
 */
import { memo, useState } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Lock, StickyNote } from 'lucide-react';
import { useDiagramStore } from '@/stores/diagram-store';
import { withHistory } from '@/features/history/with-history';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { CommentNodeData } from '../adapters/to-react-flow';

type CommentNodeProps = NodeProps<Node<CommentNodeData, 'comment'>>;

/** Voir le commentaire équivalent dans `EntityNode.tsx`. */
function arePropsEqual(prev: CommentNodeProps, next: CommentNodeProps): boolean {
  return (
    prev.selected === next.selected &&
    prev.data.comment === next.data.comment &&
    prev.data.locked === next.data.locked
  );
}

export const CommentNode = memo(function CommentNode({ data, selected }: CommentNodeProps) {
  const { comment, locked } = data;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const updateCommentText = useDiagramStore((state) => state.updateCommentText);

  const commit = () => {
    setEditing(false);
    if (draft === comment.text) return;
    withHistory('Modifier le commentaire', () => {
      updateCommentText(comment.id, draft);
    });
  };

  return (
    <div
      className={cn(
        'min-w-40 rounded-md border-2 border-amber-300 bg-amber-50 p-2 text-xs text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100',
        selected && 'ring-2 ring-primary',
      )}
      data-testid={`comment-node-${comment.id}`}
      onDoubleClick={() => {
        setDraft(comment.text);
        setEditing(true);
      }}
    >
      <div className="mb-1 flex items-center gap-1 text-amber-700 dark:text-amber-300">
        <StickyNote aria-hidden className="h-3 w-3" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">Commentaire</span>
        {locked && <Lock aria-label="Nœud verrouillé" className="ml-auto h-3 w-3" />}
      </div>
      {editing ? (
        <Textarea
          autoFocus
          value={draft}
          rows={3}
          className="border-amber-400 bg-white text-xs dark:bg-amber-950"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDraft(comment.text);
              setEditing(false);
            }
          }}
          data-testid="comment-textarea"
        />
      ) : (
        <p className="whitespace-pre-wrap break-words">
          {comment.text.trim() || <span className="italic opacity-60">Commentaire vide</span>}
        </p>
      )}
    </div>
  );
}, arePropsEqual);
