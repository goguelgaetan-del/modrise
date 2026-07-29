/**
 * Panneau inférieur : onglets Validation / MLD / SQL.
 * Les onglets MLD et SQL affichent honnêtement leur indisponibilité tant que
 * les moteurs correspondants (v0.2 / v0.3) ne sont pas implémentés.
 */
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import type { BottomTab } from '@/stores/ui-store';
import { ValidationPanel } from '@/features/validation/components/ValidationPanel';
import { useValidation } from '@/features/validation/use-validation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function BottomPanel() {
  const bottomTab = useUiStore((state) => state.bottomTab);
  const setBottomTab = useUiStore((state) => state.setBottomTab);
  const open = useUiStore((state) => state.bottomPanelOpen);
  const setOpen = useUiStore((state) => state.setBottomPanelOpen);
  const { errorCount, warningCount } = useValidation();
  const issueCount = errorCount + warningCount;

  return (
    <section
      aria-label="Panneau inférieur"
      className="flex flex-col border-t bg-background"
      style={{ height: open ? 220 : 40 }}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 px-2">
        <Tabs value={bottomTab} onValueChange={(value) => setBottomTab(value as BottomTab)}>
          <TabsList className="h-8">
            <TabsTrigger value="validation" className="gap-1.5">
              Validation
              {issueCount > 0 && (
                <Badge
                  variant={errorCount > 0 ? 'destructive' : 'secondary'}
                  className="h-4 min-w-4 px-1 text-[10px]"
                >
                  {issueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mld">MLD</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          size="icon-sm"
          variant="ghost"
          className="ml-auto"
          aria-label={open ? 'Réduire le panneau inférieur' : 'Ouvrir le panneau inférieur'}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown aria-hidden /> : <ChevronUp aria-hidden />}
        </Button>
      </div>

      {open && (
        <div className="min-h-0 flex-1">
          {bottomTab === 'validation' && <ValidationPanel />}
          {bottomTab === 'mld' && (
            <PlannedFeature label="La transformation MCD → MLD est prévue pour la version 0.2." />
          )}
          {bottomTab === 'sql' && (
            <PlannedFeature label="La génération SQL (PostgreSQL, MySQL, SQLite) est prévue pour la version 0.3." />
          )}
        </div>
      )}
    </section>
  );
}

function PlannedFeature({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
      Fonctionnalité prévue dans une prochaine version — {label}
    </div>
  );
}
