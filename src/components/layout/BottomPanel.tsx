/**
 * Panneau inférieur : onglets Validation / MLD / SQL, redimensionnable et
 * réductible (voir `AppLayout` pour le `Panel` englobant).
 */
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RefObject } from 'react';
import { useEffect } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { useUiStore } from '@/stores/ui-store';
import type { BottomTab } from '@/stores/ui-store';
import { useProjectStore } from '@/stores/project-store';
import { getSqlDialect } from '@/core/sql/registry';
import { useLogicalModel } from '@/features/logical-model/use-logical-model';
import { LogicalModelPanel } from '@/features/logical-model/components/LogicalModelPanel';
import { SqlPreviewPanel } from '@/features/sql-preview/components/SqlPreviewPanel';
import { ValidationPanel } from '@/features/validation/components/ValidationPanel';
import { useValidation } from '@/features/validation/use-validation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
          {getSqlDialect(sqlDialectId)?.label ?? sqlDialectId}
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
          {bottomTab === 'mld' && <LogicalModelPanel />}
          {bottomTab === 'sql' && <SqlPreviewPanel />}
        </div>
      )}
    </section>
  );
}
