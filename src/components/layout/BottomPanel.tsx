/**
 * Panneau inférieur : onglets Validation / MLD / SQL, redimensionnable et
 * réductible (voir `AppLayout` pour le `Panel` englobant).
 */
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { RefObject } from 'react';
import { lazy, Suspense, useEffect } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { useUiStore } from '@/stores/ui-store';
import type { BottomTab } from '@/stores/ui-store';
import { useProjectStore } from '@/stores/project-store';
import { SQL_DIALECT_LABELS } from '@/core/sql/dialect-labels';
import { useLogicalModel } from '@/features/logical-model/use-logical-model';
import { ValidationPanel } from '@/features/validation/components/ValidationPanel';
import { useValidation } from '@/features/validation/use-validation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Le MLD et le SQL ne sont demandés que ponctuellement (le premier onglet,
// Validation, couvre le cas d'usage le plus fréquent) : chargés à la
// demande plutôt que dans le chunk initial (v0.5, voir docs/performance.md).
const LogicalModelPanel = lazy(() =>
  import('@/features/logical-model/components/LogicalModelPanel').then((m) => ({
    default: m.LogicalModelPanel,
  })),
);
const SqlPreviewPanel = lazy(() =>
  import('@/features/sql-preview/components/SqlPreviewPanel').then((m) => ({
    default: m.SqlPreviewPanel,
  })),
);

function PanelLoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 aria-hidden className="mr-1.5 h-4 w-4 animate-spin" />
      Chargement…
    </div>
  );
}

interface BottomPanelProps {
  panelRef: RefObject<PanelImperativeHandle | null>;
}

export function BottomPanel({ panelRef }: BottomPanelProps) {
  const bottomTab = useUiStore((state) => state.bottomTab);
  const setBottomTab = useUiStore((state) => state.setBottomTab);
  const open = useUiStore((state) => state.bottomPanelOpen);
  const setOpen = useUiStore((state) => state.setBottomPanelOpen);
  const { errorCount, warningCount } = useValidation();
  const { success: mldOk } = useLogicalModel();
  const sqlDialectId = useProjectStore((state) => state.settings.sqlDialect);
  const issueCount = errorCount + warningCount;

  // Le panneau reste réductible/extensible via le bouton existant (état dans
  // ui-store, inchangé) ; le Panel redimensionnable englobant se contente de
  // refléter cet état, sans devenir une deuxième source de vérité.
  useEffect(() => {
    if (open) panelRef.current?.expand();
    else panelRef.current?.collapse();
  }, [open, panelRef]);

  return (
    <section aria-label="Panneau inférieur" className="flex h-full flex-col border-t bg-background">
      <div className="flex h-10 shrink-0 items-center gap-3 px-2">
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
            <TabsTrigger value="mld" className="gap-1.5">
              MLD
              {!mldOk && (
                <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px]">
                  !
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
          </TabsList>
        </Tabs>
        <span
          className="hidden truncate text-xs text-muted-foreground sm:inline"
          data-testid="bottom-panel-dialect-indicator"
        >
          {SQL_DIALECT_LABELS[sqlDialectId]}
        </span>
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
        <div className="min-h-0 flex-1 overflow-auto">
          {bottomTab === 'validation' && <ValidationPanel />}
          {bottomTab === 'mld' && (
            <Suspense fallback={<PanelLoadingFallback />}>
              <LogicalModelPanel />
            </Suspense>
          )}
          {bottomTab === 'sql' && (
            <Suspense fallback={<PanelLoadingFallback />}>
              <SqlPreviewPanel />
            </Suspense>
          )}
        </div>
      )}
    </section>
  );
}
