/**
 * Dérivation du script SQL à partir du modèle logique courant.
 *
 * Pipeline : ConceptualModel → Validation → LogicalModel → SqlDialect → SQL.
 * Le SQL n'est jamais persisté comme source de vérité : c'est une vue
 * dérivée, recalculée (mémoïsée) à chaque changement du MCD, du MLD, de la
 * convention de nommage ou des options SQL.
 *
 * Le générateur du dialecte sélectionné est chargé à la demande
 * (`loadSqlDialect`, `src/core/sql/registry.ts`) — jamais stocké dans
 * Zustand, seulement dans l'état local de ce hook et le cache du registre
 * (v0.5, voir docs/performance.md). Le passage d'un dialecte à l'autre
 * traverse donc brièvement un état `loading-dialect`.
 */
import { useEffect, useMemo, useState } from 'react';
import type {
  SqlDialect,
  SqlDialectId,
  SqlGenerationOptions,
  SqlGenerationResult,
} from '@/core/sql/dialect';
import { getCachedSqlDialect, loadSqlDialect } from '@/core/sql/registry';
import { useProjectStore } from '@/stores/project-store';
import { useLogicalModel } from '@/features/logical-model/use-logical-model';
import { countEvent } from '@/lib/performance/diagnostics';

export type SqlPreviewState =
  | { status: 'blocked' }
  | { status: 'loading-dialect' }
  | { status: 'dialect-load-error'; dialectId: SqlDialectId }
  | { status: 'ready'; result: SqlGenerationResult };

export function useSqlGeneration(options: SqlGenerationOptions): SqlPreviewState {
  const logicalModelResult = useLogicalModel();
  const dialectId = useProjectStore((state) => state.settings.sqlDialect);
  // Chargé de manière asynchrone (voir l'effet ci-dessous) seulement quand
  // absent du cache ; sinon lu directement au rendu, sans passer par un
  // `setState` synchrone dans l'effet.
  const [loadedDialect, setLoadedDialect] = useState<SqlDialect | undefined>(undefined);
  const [failedDialectId, setFailedDialectId] = useState<SqlDialectId | undefined>(undefined);

  useEffect(() => {
    if (getCachedSqlDialect(dialectId)) return;
    let cancelled = false;
    loadSqlDialect(dialectId)
      .then((loaded) => {
        if (cancelled) return;
        setLoadedDialect(loaded);
        setFailedDialectId(undefined);
      })
      .catch(() => {
        if (cancelled) return;
        setFailedDialectId(dialectId);
      });
    return () => {
      cancelled = true;
    };
  }, [dialectId]);

  const dialect =
    getCachedSqlDialect(dialectId) ?? (loadedDialect?.id === dialectId ? loadedDialect : undefined);

  return useMemo<SqlPreviewState>(() => {
    if (!logicalModelResult.success) return { status: 'blocked' };
    if (failedDialectId === dialectId) return { status: 'dialect-load-error', dialectId };
    if (!dialect) return { status: 'loading-dialect' };
    countEvent('sql-recompute');
    return { status: 'ready', result: dialect.generate(logicalModelResult.model, options) };
  }, [logicalModelResult, dialect, dialectId, failedDialectId, options]);
}
