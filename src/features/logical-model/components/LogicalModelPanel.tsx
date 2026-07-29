/**
 * Panneau MLD : affiche le modèle logique dérivé du MCD courant, ou un
 * message bloquant si le MCD contient des erreurs de validation.
 */
import { KeyRound, Link2, OctagonX } from 'lucide-react';
import { formatDataType } from '@/core/conceptual-model/data-types';
import type { LogicalColumn, LogicalTable } from '@/core/logical-model/types';
import { useUiStore } from '@/stores/ui-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLogicalModel } from '../use-logical-model';

export function LogicalModelPanel() {
  const result = useLogicalModel();
  const setBottomTab = useUiStore((state) => state.setBottomTab);

  if (!result.success) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
        data-testid="logical-model-blocked"
      >
        <OctagonX aria-hidden className="h-5 w-5 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Le MLD ne peut pas être généré tant que le MCD contient des erreurs bloquantes.
        </p>
        <Button size="sm" variant="outline" onClick={() => setBottomTab('validation')}>
          Ouvrir la validation
        </Button>
      </div>
    );
  }

  const { tables, issues } = result.model;

  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
        Ajoutez une entité pour voir apparaître le modèle logique.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" data-testid="logical-model-panel">
      <div className="flex flex-wrap gap-3 p-3">
        {tables.map((table) => (
          <LogicalTableCard key={table.id} table={table} />
        ))}
      </div>
      {issues.length > 0 && (
        <div className="border-t px-3 py-2" data-testid="logical-model-issues">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Avertissements de transformation
          </h3>
          <ul className="space-y-1 text-xs">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-1.5">
                <code className="shrink-0 text-muted-foreground">{issue.code}</code>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ScrollArea>
  );
}

function LogicalTableCard({ table }: { table: LogicalTable }) {
  const primaryKeySet = new Set(table.primaryKey);
  const foreignColumnIds = new Set(table.foreignKeys.flatMap((fk) => fk.columnIds));
  const uniqueColumnIds = new Set(table.uniqueConstraints.flatMap((uq) => uq.columnIds));

  return (
    <div
      className="min-w-56 rounded-md border bg-card text-card-foreground shadow-sm"
      data-testid={`logical-table-${table.name}`}
    >
      <header className="rounded-t border-b bg-muted/60 px-3 py-1.5 text-sm font-semibold">
        {table.name}
      </header>
      <ul className="px-3 py-1.5 text-xs leading-6">
        {table.columns.map((column) => (
          <ColumnRow
            key={column.id}
            column={column}
            isPrimaryKey={primaryKeySet.has(column.id)}
            isForeignKey={foreignColumnIds.has(column.id)}
            isUnique={uniqueColumnIds.has(column.id)}
          />
        ))}
      </ul>
      {(table.foreignKeys.length > 0 || table.uniqueConstraints.length > 0) && (
        <footer className="space-y-0.5 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          {table.foreignKeys.map((fk) => (
            <div key={fk.id}>
              FK <code>{fk.name}</code>
              {fk.unique && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  unique
                </Badge>
              )}
            </div>
          ))}
          {table.uniqueConstraints.map((uq) => (
            <div key={uq.id}>
              UNIQUE <code>{uq.name}</code>
            </div>
          ))}
        </footer>
      )}
    </div>
  );
}

interface ColumnRowProps {
  column: LogicalColumn;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
}

function ColumnRow({ column, isPrimaryKey, isForeignKey, isUnique }: ColumnRowProps) {
  return (
    <li className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="flex w-8 shrink-0 gap-0.5">
        {isPrimaryKey && (
          <KeyRound
            aria-label="Clé primaire"
            className="h-3 w-3 text-amber-600 dark:text-amber-400"
          />
        )}
        {isForeignKey && (
          <Link2 aria-label="Clé étrangère" className="h-3 w-3 text-sky-600 dark:text-sky-400" />
        )}
      </span>
      <span className={cn('font-medium', isPrimaryKey && 'underline underline-offset-2')}>
        {column.name}
      </span>
      <span className="text-muted-foreground">: {formatDataType(column.dataType)}</span>
      <span className="ml-auto flex gap-1">
        {!column.nullable && (
          <Badge variant="outline" className="h-4 px-1 text-[10px]">
            NOT NULL
          </Badge>
        )}
        {isUnique && !isPrimaryKey && (
          <Badge variant="outline" className="h-4 px-1 text-[10px]">
            UNIQUE
          </Badge>
        )}
      </span>
    </li>
  );
}
