/**
 * Dérivation du script SQL à partir du modèle logique courant.
 *
 * Pipeline : ConceptualModel → Validation → LogicalModel → SqlDialect → SQL.
 * Le SQL n'est jamais persisté comme source de vérité : c'est une vue
 * dérivée, recalculée (mémoïsée) à chaque changement du MCD, du MLD, de la
 * convention de nommage ou des options SQL.
 */
import { useMemo } from 'react';
import type { SqlDialectId, SqlGenerationOptions, SqlGenerationResult } from '@/core/sql/dialect';
import { getSqlDialect } from '@/core/sql/registry';
import { useProjectStore } from '@/stores/project-store';
import { useLogicalModel } from '@/features/logical-model/use-logical-model';

export type SqlPreviewState =
  | { status: 'blocked' }
  | { status: 'unsupported-dialect'; dialectId: SqlDialectId }
  | { status: 'ready'; result: SqlGenerationResult };

export function useSqlGeneration(options: SqlGenerationOptions): SqlPreviewState {
  const logicalModelResult = useLogicalModel();
  const dialectId = useProjectStore((state) => state.settings.sqlDialect);

  return useMemo<SqlPreviewState>(() => {
    if (!logicalModelResult.success) {
      return { status: 'blocked' };
    }
    const dialect = getSqlDialect(dialectId);
    if (!dialect) {
      return { status: 'unsupported-dialect', dialectId };
    }
    return { status: 'ready', result: dialect.generate(logicalModelResult.model, options) };
  }, [logicalModelResult, dialectId, options]);
}
