/**
 * Panneau SQL : aperçu du script généré à partir du MLD courant pour le
 * dialecte sélectionné (PostgreSQL, MySQL/MariaDB ou SQLite), options
 * fonctionnelles (en-tête, DROP TABLE, casse des mots-clés), copie et
 * téléchargement. Le dialecte est persisté dans les paramètres du projet.
 */
import { useState } from 'react';
import { Copy, Download, OctagonX } from 'lucide-react';
import { DEFAULT_SQL_GENERATION_OPTIONS, SQL_DIALECT_IDS } from '@/core/sql/dialect';
import type { SqlDialectId, SqlGenerationOptions } from '@/core/sql/dialect';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { downloadSqlFile } from '../sql-export';
import { useSqlGeneration } from '../use-sql-generation';

const DIALECT_LABELS: Record<SqlDialectId, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlite: 'SQLite',
};

const DIALECT_NOTES: Record<SqlDialectId, string> = {
  postgresql:
    'Les clés étrangères sont ajoutées après la création des tables afin de gérer les cycles.',
  mysql:
    'Les identifiants sont échappés avec des accents graves. Les UUID sont générés en CHAR(36).',
  sqlite:
    'SQLite utilise des affinités de types. Les clés étrangères sont intégrées aux CREATE TABLE.',
};

export function SqlPreviewPanel() {
  const [options, setOptions] = useState<SqlGenerationOptions>(DEFAULT_SQL_GENERATION_OPTIONS);
  const dialectId = useProjectStore((s) => s.settings.sqlDialect);
  const setSqlDialect = useProjectStore((s) => s.setSqlDialect);
  const state = useSqlGeneration(options);
  const setBottomTab = useUiStore((s) => s.setBottomTab);
  const notify = useUiStore((s) => s.notify);
  const projectName = useProjectStore((s) => s.name);

  const dialectSelector = (
    <Select value={dialectId} onValueChange={(value) => setSqlDialect(value as SqlDialectId)}>
      <SelectTrigger
        size="sm"
        className="w-44"
        aria-label="Dialecte SQL"
        data-testid="sql-dialect-select"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SQL_DIALECT_IDS.map((id) => (
          <SelectItem key={id} value={id}>
            {DIALECT_LABELS[id]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (state.status === 'blocked') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
        data-testid="sql-preview-blocked"
      >
        <OctagonX aria-hidden className="h-5 w-5 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Le SQL ne peut pas être généré tant que le modèle contient des erreurs bloquantes.
        </p>
        <Button size="sm" variant="outline" onClick={() => setBottomTab('validation')}>
          Ouvrir la validation
        </Button>
      </div>
    );
  }

  if (state.status === 'unsupported-dialect') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
        {dialectSelector}
        <p>
          Fonctionnalité prévue dans une prochaine version — le dialecte « {state.dialectId} » n'est
          pas encore disponible.
        </p>
      </div>
    );
  }

  const { result } = state;
  const sql = result.success ? result.sql : '';
  const canExport = result.success && sql.length > 0;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      notify('info', 'SQL copié');
    } catch {
      notify('error', 'Impossible de copier le SQL');
    }
  };

  const onDownload = () => {
    downloadSqlFile(projectName, dialectId, sql);
  };

  return (
    <div className="flex h-full flex-col" data-testid="sql-preview-panel">
      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-1.5">
        {dialectSelector}
        <Separator orientation="vertical" className="!h-5" />

        <Label className="gap-1.5 text-xs font-normal">
          <Checkbox
            checked={options.includeHeader}
            onCheckedChange={(checked) =>
              setOptions((o) => ({ ...o, includeHeader: checked === true }))
            }
          />
          En-tête
        </Label>
        <Label className="gap-1.5 text-xs font-normal">
          <Checkbox
            checked={options.includeDropStatements}
            onCheckedChange={(checked) =>
              setOptions((o) => ({ ...o, includeDropStatements: checked === true }))
            }
          />
          DROP TABLE
        </Label>
        <Label className="gap-1.5 text-xs font-normal">
          <Checkbox
            checked={options.keywordCase === 'upper'}
            onCheckedChange={(checked) =>
              setOptions((o) => ({ ...o, keywordCase: checked === true ? 'upper' : 'lower' }))
            }
          />
          Majuscules
        </Label>

        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={!canExport}
            onClick={() => void onCopy()}
            data-testid="sql-copy-button"
          >
            <Copy aria-hidden />
            Copier
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canExport}
            onClick={onDownload}
            data-testid="sql-download-button"
          >
            <Download aria-hidden />
            Télécharger
          </Button>
        </div>
      </div>

      <p
        className="border-b px-3 py-1 text-[11px] text-muted-foreground"
        data-testid="sql-dialect-note"
      >
        {DIALECT_NOTES[dialectId]}
      </p>

      {!result.success ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <OctagonX aria-hidden className="h-5 w-5 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Le SQL n'a pas pu être généré : le modèle logique est incohérent.
          </p>
          <ul className="text-xs text-muted-foreground">
            {result.issues.map((issue) => (
              <li key={issue.id}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <pre className="overflow-x-auto p-3 font-mono text-xs leading-5" data-testid="sql-code">
            <code>{sql}</code>
          </pre>
          {result.issues.length > 0 && (
            <div className="border-t px-3 py-2" data-testid="sql-issues">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Avertissements
              </h3>
              <ul className="space-y-1 text-xs">
                {result.issues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-1.5">
                    <code className="shrink-0 text-muted-foreground">{issue.code}</code>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
