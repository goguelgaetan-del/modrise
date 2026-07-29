/**
 * Bibliothèque d'éléments : ajout d'entités et d'associations au diagramme.
 * Les nouveaux nœuds sont placés au centre de la vue courante puis
 * sélectionnés, pour une édition immédiate dans l'inspecteur.
 */
import { useReactFlow } from '@xyflow/react';
import { MessageSquareDashed, Shapes, Square } from 'lucide-react';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function SidebarLeft() {
  const addEntity = useProjectStore((state) => state.addEntity);
  const addAssociation = useProjectStore((state) => state.addAssociation);
  const addNode = useDiagramStore((state) => state.addNode);
  const setSelection = useDiagramStore((state) => state.setSelection);
  const { screenToFlowPosition } = useReactFlow();

  const centerPosition = () => {
    const base = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2.5,
    });
    // Léger décalage aléatoire pour éviter d'empiler les nœuds créés à la suite.
    return { x: base.x + (Math.random() - 0.5) * 60, y: base.y + (Math.random() - 0.5) * 60 };
  };

  const onAddEntity = () => {
    const entity = addEntity();
    const nodeId = addNode(entity.id, 'entity', centerPosition());
    setSelection([nodeId]);
  };

  const onAddAssociation = () => {
    const association = addAssociation();
    const nodeId = addNode(association.id, 'association', centerPosition());
    setSelection([nodeId]);
  };

  return (
    <aside aria-label="Bibliothèque d'éléments" className="flex w-44 flex-col gap-1.5 border-r p-2">
      <h2 className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Éléments
      </h2>
      <Button
        variant="outline"
        className="justify-start"
        onClick={onAddEntity}
        data-testid="add-entity"
      >
        <Square aria-hidden />
        Entité
      </Button>
      <Button
        variant="outline"
        className="justify-start"
        onClick={onAddAssociation}
        data-testid="add-association"
      >
        <Shapes aria-hidden />
        Association
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="outline" className="w-full justify-start" disabled>
              <MessageSquareDashed aria-hidden />
              Commentaire
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          Fonctionnalité prévue dans une prochaine version
        </TooltipContent>
      </Tooltip>
      <p className="mt-2 px-1 text-xs leading-5 text-muted-foreground">
        Tracez un lien entre une entité et une association pour créer une participation.
      </p>
    </aside>
  );
}
