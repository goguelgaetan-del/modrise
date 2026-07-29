/**
 * Layout principal : barre supérieure, bibliothèque, canvas, inspecteur,
 * panneau inférieur.
 */
import { DiagramCanvas } from '@/features/diagram/components/DiagramCanvas';
import { DeleteConfirmationDialog } from '@/features/diagram/components/DeleteConfirmationDialog';
import { useDeletion } from '@/features/diagram/hooks/use-deletion';
import { Notifications } from '@/components/common/Notifications';
import { BottomPanel } from './BottomPanel';
import { InspectorPanel } from './InspectorPanel';
import { SidebarLeft } from './SidebarLeft';
import { TopBar } from './TopBar';

export function AppLayout() {
  const deletion = useDeletion();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SidebarLeft />
        <main aria-label="Canvas du modèle conceptuel" className="min-w-0 flex-1">
          <DiagramCanvas onRequestDeleteSelection={deletion.requestDeleteSelection} />
        </main>
        <InspectorPanel onRequestDeleteSelection={deletion.requestDeleteSelection} />
      </div>
      <BottomPanel />
      <DeleteConfirmationDialog deletion={deletion} />
      <Notifications />
    </div>
  );
}
