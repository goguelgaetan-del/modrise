/**
 * Version tiroir de l'inspecteur, utilisée sous 1200px (voir
 * `useIsTablet`) à la place du panneau redimensionnable persistant :
 * glisse depuis la droite quand un élément est sélectionné, sans overlay
 * modal — le canevas doit rester utilisable (sélectionner un autre élément)
 * pendant que le tiroir est ouvert.
 */
import { X } from 'lucide-react';
import { useDiagramStore } from '@/stores/diagram-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InspectorPanel } from './InspectorPanel';

interface InspectorDrawerProps {
  onRequestDeleteSelection: () => void;
}

export function InspectorDrawer({ onRequestDeleteSelection }: InspectorDrawerProps) {
  const hasSelection = useDiagramStore((state) => state.selectedNodeIds.length > 0);
  const setSelection = useDiagramStore((state) => state.setSelection);

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex w-full max-w-sm translate-x-full flex-col border-l bg-background shadow-lg transition-transform duration-200',
        hasSelection && 'translate-x-0',
      )}
      style={{ top: '3rem' }}
      aria-hidden={!hasSelection}
      data-testid="inspector-drawer"
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b px-2">
        <span className="text-sm font-medium">Propriétés</span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Fermer l'inspecteur"
          onClick={() => setSelection([])}
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <InspectorPanel onRequestDeleteSelection={onRequestDeleteSelection} />
      </div>
    </div>
  );
}
