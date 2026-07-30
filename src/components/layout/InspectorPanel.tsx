/**
 * Inspecteur de propriétés : affiche l'éditeur de l'élément sélectionné
 * (entité ou association) ou un message d'aide.
 */
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Copy,
  Trash2,
} from 'lucide-react';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { copySelection, duplicateSelection } from '@/features/clipboard/actions';
import { alignSelection, distributeSelection } from '@/features/diagram/layout/alignment-actions';
import { AssociationInspector } from '@/features/associations/components/AssociationInspector';
import { EntityInspector } from '@/features/entities/components/EntityInspector';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {selectedNodeIds.length} éléments sélectionnés. Sélectionnez un seul élément pour
                modifier ses propriétés.
              </p>

              <div className="space-y-1.5">
                <h3 className="text-xs font-medium text-muted-foreground">Aligner</h3>
                <div className="flex flex-wrap gap-1">
                  <AlignButton
                    label="Aligner à gauche"
                    icon={<AlignLeft aria-hidden />}
                    onClick={() => alignSelection('left')}
                  />
                  <AlignButton
                    label="Centrer horizontalement"
                    icon={<AlignCenterHorizontal aria-hidden />}
                    onClick={() => alignSelection('centerX')}
                  />
                  <AlignButton
                    label="Aligner à droite"
                    icon={<AlignRight aria-hidden />}
                    onClick={() => alignSelection('right')}
                  />
                  <AlignButton
                    label="Aligner en haut"
                    icon={<AlignStartVertical aria-hidden />}
                    onClick={() => alignSelection('top')}
                  />
                  <AlignButton
                    label="Centrer verticalement"
                    icon={<AlignCenterVertical aria-hidden />}
                    onClick={() => alignSelection('centerY')}
                  />
                  <AlignButton
                    label="Aligner en bas"
                    icon={<AlignEndVertical aria-hidden />}
                    onClick={() => alignSelection('bottom')}
                  />
                </div>
              </div>

              {selectedNodeIds.length > 2 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium text-muted-foreground">Distribuer</h3>
                  <div className="flex flex-wrap gap-1">
                    <AlignButton
                      label="Distribuer horizontalement"
                      icon={<AlignHorizontalDistributeCenter aria-hidden />}
                      onClick={() => distributeSelection('horizontal')}
                    />
                    <AlignButton
                      label="Distribuer verticalement"
                      icon={<AlignVerticalDistributeCenter aria-hidden />}
                      onClick={() => distributeSelection('vertical')}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={copySelection}>
                  <Copy aria-hidden />
                  Copier
                </Button>
                <Button size="sm" variant="outline" onClick={duplicateSelection}>
                  <Copy aria-hidden />
                  Dupliquer
                </Button>
                <Button size="sm" variant="destructive" onClick={onRequestDeleteSelection}>
                  <Trash2 aria-hidden />
                  Supprimer la sélection
                </Button>
              </div>
            </div>
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

function AlignButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="outline" aria-label={label} onClick={onClick}>
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
