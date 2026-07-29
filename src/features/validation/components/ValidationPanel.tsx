/**
 * Panneau de validation : liste filtrable des erreurs et avertissements.
 * Un clic sur un problème sélectionne l'élément concerné et recentre le
 * canvas dessus.
 */
import { useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { AlertTriangle, CircleCheck, Info, OctagonX } from 'lucide-react';
import type { ValidationIssue, ValidationSeverity } from '@/core/validation/types';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { resolveIssueAnchor } from '../issue-anchors';
import { useValidation } from '../use-validation';

const SEVERITY_ICONS: Record<ValidationSeverity, typeof Info> = {
  error: OctagonX,
  warning: AlertTriangle,
  info: Info,
};

export function ValidationPanel() {
  const { issues, errorCount, warningCount } = useValidation();
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const { fitView } = useReactFlow();

  const visibleIssues = useMemo(
    () =>
      issues.filter(
        (issue) =>
          (issue.severity === 'error' && showErrors) ||
          (issue.severity === 'warning' && showWarnings) ||
          issue.severity === 'info',
      ),
    [issues, showErrors, showWarnings],
  );

  const focusIssue = (issue: ValidationIssue) => {
    const { conceptualModel } = useProjectStore.getState();
    const anchor = resolveIssueAnchor(conceptualModel, issue);
    if (!anchor.ownerId) return;
    const diagramStore = useDiagramStore.getState();
    const node = diagramStore.nodes.find((n) => n.modelId === anchor.ownerId);
    if (!node) return;
    diagramStore.setSelection([node.id]);
    void fitView({ nodes: [{ id: node.id }], padding: 1.2, duration: 300, maxZoom: 1.2 });
  };

  return (
    <div className="flex h-full flex-col" data-testid="validation-panel">
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <Button
          size="sm"
          variant={showErrors ? 'secondary' : 'ghost'}
          aria-pressed={showErrors}
          onClick={() => setShowErrors((v) => !v)}
        >
          <OctagonX aria-hidden className="text-destructive" />
          {errorCount} erreur{errorCount > 1 ? 's' : ''}
        </Button>
        <Button
          size="sm"
          variant={showWarnings ? 'secondary' : 'ghost'}
          aria-pressed={showWarnings}
          onClick={() => setShowWarnings((v) => !v)}
        >
          <AlertTriangle aria-hidden className="text-amber-600 dark:text-amber-400" />
          {warningCount} avertissement{warningCount > 1 ? 's' : ''}
        </Button>
        {errorCount > 0 && (
          <Badge variant="destructive" className="ml-auto">
            Génération SQL bloquée
          </Badge>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {visibleIssues.length === 0 ? (
          <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
            <CircleCheck aria-hidden className="h-4 w-4 text-green-600 dark:text-green-400" />
            Aucun problème à afficher : le modèle est cohérent.
          </p>
        ) : (
          <ul className="divide-y">
            {visibleIssues.map((issue) => {
              const Icon = SEVERITY_ICONS[issue.severity];
              return (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => focusIssue(issue)}
                    className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <Icon
                      aria-label={issue.severity === 'error' ? 'Erreur' : 'Avertissement'}
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        issue.severity === 'error'
                          ? 'text-destructive'
                          : 'text-amber-600 dark:text-amber-400',
                      )}
                    />
                    <span>{issue.message}</span>
                    <code className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {issue.code}
                    </code>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
