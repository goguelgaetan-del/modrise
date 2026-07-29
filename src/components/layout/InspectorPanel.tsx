/**
 * Inspecteur de propriétés : affiche l'éditeur de l'élément sélectionné
 * (entité ou association) ou un message d'aide.
 */
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { AssociationInspector } from '@/features/associations/components/AssociationInspector';
import { EntityInspector } from '@/features/entities/components/EntityInspector';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InspectorPanelProps {
  onRequestDeleteSelection: () => void;
}

export function InspectorPanel({ onRequestDeleteSelection }: InspectorPanelProps) {
  const selectedNodeIds = useDiagramStore((state) => state.selectedNodeIds);
  const nodes = useDiagramStore((state) => state.nodes);
  const conceptualModel = useProjectStore((state) => state.conceptualModel);

  const selectedNode =
    selectedNodeIds.length === 1 ? nodes.find((node) => node.id === selectedNodeIds[0]) : undefined;
  const entity =
    selectedNode?.nodeType === 'entity'
      ? conceptualModel.entities.find((e) => e.id === selectedNode.modelId)
      : undefined;
  const association =
    selectedNode?.nodeType === 'association'
      ? conceptualModel.associations.find((a) => a.id === selectedNode.modelId)
      : undefined;

  return (
    <aside
      aria-label="Inspecteur de propriétés"
      className="w-80 shrink-0 border-l"
      data-testid="inspector"
    >
      <ScrollArea className="h-full">
        <div className="p-3">
          {entity ? (
            <EntityInspector entity={entity} onRequestDelete={onRequestDeleteSelection} />
          ) : association ? (
            <AssociationInspector
              association={association}
              onRequestDelete={onRequestDeleteSelection}
            />
          ) : selectedNodeIds.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              {selectedNodeIds.length} éléments sélectionnés. Sélectionnez un seul élément pour
              modifier ses propriétés.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sélectionnez une entité ou une association pour modifier ses propriétés.
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
