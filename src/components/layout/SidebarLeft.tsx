/**
 * Bibliothèque d'éléments : ajout d'entités, d'associations et de
 * commentaires au diagramme. Les nouveaux nœuds sont placés au centre de la
 * vue courante puis sélectionnés, pour une édition immédiate dans
 * l'inspecteur.
 */
import { useReactFlow } from '@xyflow/react';
import { MessageSquareText, Shapes, Square } from 'lucide-react';
import { createAssociationAt, createCommentAt, createEntityAt } from '@/features/diagram/actions';
import { Button } from '@/components/ui/button';

export function SidebarLeft() {
  const { screenToFlowPosition } = useReactFlow();

  const centerPosition = () => {
    const base = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2.5,
    });
    // Léger décalage aléatoire pour éviter d'empiler les nœuds créés à la suite.
    return { x: base.x + (Math.random() - 0.5) * 60, y: base.y + (Math.random() - 0.5) * 60 };
  };

  return (
    <aside
      aria-label="Bibliothèque d'éléments"
      className="flex h-full flex-col gap-1.5 overflow-y-auto border-r p-2"
    >
      <h2 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Éléments
      </h2>
      <Button
        variant="outline"
        className="justify-start"
        onClick={() => createEntityAt(centerPosition())}
        data-testid="add-entity"
      >
        <Square aria-hidden />
        Entité
      </Button>
      <Button
        variant="outline"
        className="justify-start"
        onClick={() => createAssociationAt(centerPosition())}
        data-testid="add-association"
      >
        <Shapes aria-hidden />
        Association
      </Button>
      <Button
        variant="outline"
        className="justify-start"
        onClick={() => createCommentAt(centerPosition())}
        data-testid="add-comment"
      >
        <MessageSquareText aria-hidden />
        Commentaire
      </Button>
      <p className="mt-2 px-1 text-xs leading-5 text-muted-foreground">
        Tracez un lien entre une entité et une association pour créer une participation.
      </p>
    </aside>
  );
}
