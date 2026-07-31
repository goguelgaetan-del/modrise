/**
 * Barre de statut : bande compacte et permanente en pied de fenêtre,
 * résumant l'état du projet (comptes, erreurs, dialecte, zoom,
 * enregistrement) sans dupliquer les contrôles de la barre supérieure —
 * elle n'affiche que des informations de lecture, cliquables quand un
 * raccourci existe déjà ailleurs (nombre d'erreurs -> onglet Validation).
 */
import { AlertCircle, Database, MessageSquare, Share2, Table2, ZoomIn } from 'lucide-react';
import { useProjectStore } from '@/stores/project-store';
import { useDiagramStore } from '@/stores/diagram-store';
import { useUiStore } from '@/stores/ui-store';
import type { SaveStatus } from '@/stores/ui-store';
import { useValidation } from '@/features/validation/use-validation';
import { SQL_DIALECT_LABELS } from '@/core/sql/dialect-labels';
import { cn } from '@/lib/utils';

const SAVE_STATUS_TEXT: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Modifications non enregistrées',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: 'Erreur d’enregistrement',
};

export function StatusBar() {
  const entityCount = useProjectStore((state) => state.conceptualModel.entities.length);
  const associationCount = useProjectStore((state) => state.conceptualModel.associations.length);
  const commentCount = useDiagramStore((state) => state.comments.length);
  const sqlDialect = useProjectStore((state) => state.settings.sqlDialect);
  const zoom = useDiagramStore((state) => state.viewport.zoom);
  const saveStatus = useUiStore((state) => state.saveStatus);
  const setBottomTab = useUiStore((state) => state.setBottomTab);
  const { errorCount } = useValidation();

  return (
    <footer
      data-testid="status-bar"
      className="flex h-7 shrink-0 items-center gap-4 overflow-x-auto border-t bg-muted/30 px-3 text-xs text-muted-foreground"
    >
      <span className="flex items-center gap-1" title="Entités">
        <Table2 aria-hidden className="h-3.5 w-3.5" />
        {entityCount}
      </span>
      <span className="flex items-center gap-1" title="Associations">
        <Share2 aria-hidden className="h-3.5 w-3.5" />
        {associationCount}
      </span>
      <span className="flex items-center gap-1" title="Commentaires">
        <MessageSquare aria-hidden className="h-3.5 w-3.5" />
        {commentCount}
      </span>
      <button
        type="button"
        onClick={() => setBottomTab('validation')}
        className={cn(
          'flex items-center gap-1 rounded hover:text-foreground',
          errorCount > 0 && 'font-medium text-destructive hover:text-destructive',
        )}
        title="Ouvrir le panneau de validation"
        data-testid="status-bar-error-count"
      >
        <AlertCircle aria-hidden className="h-3.5 w-3.5" />
        {errorCount}
      </button>

      <span className="ml-auto flex items-center gap-4">
        <span className="flex items-center gap-1" title="Dialecte SQL">
          <Database aria-hidden className="h-3.5 w-3.5" />
          {SQL_DIALECT_LABELS[sqlDialect]}
        </span>
        <span className="flex items-center gap-1" title="Zoom">
          <ZoomIn aria-hidden className="h-3.5 w-3.5" />
          {Math.round(zoom * 100)}%
        </span>
        <span data-testid="status-bar-save-status">{SAVE_STATUS_TEXT[saveStatus]}</span>
      </span>
    </footer>
  );
}
