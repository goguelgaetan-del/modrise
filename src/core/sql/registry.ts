/**
 * Registre des dialectes SQL disponibles.
 *
 * Chaque dialecte (générateur, échappement, types — voir `shared/`) n'est
 * chargé qu'à la demande (`import()` dynamique), en cache après le premier
 * chargement : le frontend n'a jamais besoin des trois générateurs en même
 * temps, seulement de celui actuellement sélectionné (v0.5, voir
 * docs/performance.md). Pour un simple libellé d'affichage sans charger de
 * générateur, voir `dialect-labels.ts`.
 */
import type { SqlDialect, SqlDialectId } from './dialect';

type DialectLoader = () => Promise<SqlDialect>;

const DIALECT_LOADERS: Readonly<Record<SqlDialectId, DialectLoader>> = {
  postgresql: () => import('./postgresql/dialect').then((m) => m.postgreSqlDialect),
  mysql: () => import('./mysql/dialect').then((m) => m.mySqlDialect),
  sqlite: () => import('./sqlite/dialect').then((m) => m.sqliteDialect),
};

const dialectCache = new Map<SqlDialectId, SqlDialect>();
// Une seule requête de chargement en vol par dialecte, même si plusieurs
// appelants la déclenchent avant qu'elle n'aboutisse.
const pendingLoads = new Map<SqlDialectId, Promise<SqlDialect>>();

export class UnknownSqlDialectError extends Error {}

/** Charge (et met en cache) le générateur d'un dialecte. */
export async function loadSqlDialect(id: SqlDialectId): Promise<SqlDialect> {
  const cached = dialectCache.get(id);
  if (cached) return cached;

  const pending = pendingLoads.get(id);
  if (pending) return pending;

  const loader = DIALECT_LOADERS[id];
  if (!loader) throw new UnknownSqlDialectError(`Dialecte SQL inconnu : « ${id} ».`);

  const promise = loader()
    .then((dialect) => {
      dialectCache.set(id, dialect);
      return dialect;
    })
    .finally(() => {
      pendingLoads.delete(id);
    });
  pendingLoads.set(id, promise);
  return promise;
}

/** Dialecte déjà chargé, sans déclencher de chargement — pour un rendu synchrone. */
export function getCachedSqlDialect(id: SqlDialectId): SqlDialect | undefined {
  return dialectCache.get(id);
}
