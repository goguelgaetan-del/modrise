/**
 * Layout principal : barre supérieure, bibliothèque, canvas, inspecteur,
 * panneau inférieur — les quatre zones de travail (bibliothèque, canvas,
 * inspecteur, panneau inférieur) sont redimensionnables (voir
 * docs/responsive-layout.md) : tailles min/max, double-clic sur une
 * séparation pour revenir à la taille par défaut, dimensions persistées
 * localement (`react-resizable-panels`, choisi pour son absence de
 * dépendance et son support clavier natif des séparateurs).
 *
 * Sous 1200px (tablette), la bibliothèque et l'inspecteur redimensionnables
 * cèdent la place à des tiroirs non modaux (le canevas reste utilisable
 * pendant qu'un tiroir est ouvert) : voir `InspectorDrawer` et le tiroir de
 * bibliothèque ci-dessous.
 */
import { useState } from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { Group, Panel, Separator, usePanelRef, useDefaultLayout } from 'react-resizable-panels';
import { DiagramCanvas } from '@/features/diagram/components/DiagramCanvas';
import { DeleteConfirmationDialog } from '@/features/diagram/components/DeleteConfirmationDialog';
import { useDeletion } from '@/features/diagram/hooks/use-deletion';
import { Notifications } from '@/components/common/Notifications';
import { useIsTablet } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomPanel } from './BottomPanel';
import { InspectorPanel } from './InspectorPanel';
import { InspectorDrawer } from './InspectorDrawer';
import { SidebarLeft } from './SidebarLeft';
import { StatusBar } from './StatusBar';
import { TopBar } from './TopBar';
import { NarrowScreenNotice } from './NarrowScreenNotice';

const SEPARATOR_CLASS =
  'group relative shrink-0 bg-border outline-none data-[orientation=horizontal]:h-px ' +
  'data-[orientation=horizontal]:w-full data-[orientation=horizontal]:cursor-row-resize ' +
  'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px ' +
  'data-[orientation=vertical]:cursor-col-resize hover:bg-primary/50 focus-visible:bg-primary';

export function AppLayout() {
  const deletion = useDeletion();
  const isTablet = useIsTablet();
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const bottomPanelRef = usePanelRef();
  const outerLayout = useDefaultLayout({
    id: 'modrise-layout-outer',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  });
  const innerLayout = useDefaultLayout({
    id: 'modrise-layout-inner',
    storage: typeof window === 'undefined' ? undefined : window.localStorage,
  });

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <NarrowScreenNotice />
      <Group
        orientation="vertical"
        className="min-h-0 flex-1"
        defaultLayout={outerLayout.defaultLayout}
        onLayoutChanged={outerLayout.onLayoutChanged}
      >
        <Panel id="workspace" minSize="30%">
          {isTablet ? (
            <main aria-label="Canvas du modèle conceptuel" className="relative h-full min-w-0">
              <DiagramCanvas onRequestDeleteSelection={deletion.requestDeleteSelection} />
            </main>
          ) : (
            <Group
              orientation="horizontal"
              className="h-full"
              defaultLayout={innerLayout.defaultLayout}
              onLayoutChanged={innerLayout.onLayoutChanged}
            >
              <Panel id="sidebar" defaultSize={180} minSize={140} maxSize={320}>
                <SidebarLeft />
              </Panel>
              <Separator className={SEPARATOR_CLASS} />
              <Panel id="canvas" minSize="30%">
                <main aria-label="Canvas du modèle conceptuel" className="h-full min-w-0">
                  <DiagramCanvas onRequestDeleteSelection={deletion.requestDeleteSelection} />
                </main>
              </Panel>
              <Separator className={SEPARATOR_CLASS} />
              <Panel id="inspector" defaultSize={320} minSize={240} maxSize={480}>
                <InspectorPanel onRequestDeleteSelection={deletion.requestDeleteSelection} />
              </Panel>
            </Group>
          )}
        </Panel>
        <Separator className={SEPARATOR_CLASS} />
        <Panel
          id="bottom"
          panelRef={bottomPanelRef}
          collapsible
          collapsedSize={40}
          defaultSize={220}
          minSize={120}
          maxSize="60%"
        >
          <BottomPanel panelRef={bottomPanelRef} />
        </Panel>
      </Group>

      {isTablet && (
        <>
          <Button
            size="icon-sm"
            variant="outline"
            className="fixed left-2 z-50 bg-background shadow-sm"
            style={{ top: 'calc(3rem + 0.5rem)' }}
            aria-label={sidebarDrawerOpen ? 'Fermer la bibliothèque' : 'Ouvrir la bibliothèque'}
            data-testid="sidebar-drawer-toggle"
            onClick={() => setSidebarDrawerOpen((value) => !value)}
          >
            {sidebarDrawerOpen ? <PanelLeftClose aria-hidden /> : <PanelLeft aria-hidden />}
          </Button>
          <div
            className={cn(
              'fixed inset-y-0 left-0 z-40 w-52 -translate-x-full border-r bg-background shadow-lg transition-transform duration-200',
              sidebarDrawerOpen && 'translate-x-0',
            )}
            style={{ top: '3rem' }}
            data-testid="sidebar-drawer"
          >
            <SidebarLeft />
          </div>
          <InspectorDrawer onRequestDeleteSelection={deletion.requestDeleteSelection} />
        </>
      )}

      <StatusBar />

      <DeleteConfirmationDialog deletion={deletion} />
      <Notifications />
    </div>
  );
}
