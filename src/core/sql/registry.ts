/**
 * Registre des dialectes SQL disponibles.
 *
 * Séparé de `dialect.ts` (qui ne définit que l'interface) pour que celui-ci
 * reste indépendant de toute implémentation concrète. MySQL/MariaDB et
 * SQLite seront ajoutés ici sans modifier le moteur MLD ni cette interface
 * (v0.4+).
 */
import type { SqlDialect, SqlDialectId } from './dialect';
import { postgreSqlDialect } from './postgresql/dialect';

export const SQL_DIALECTS: Partial<Record<SqlDialectId, SqlDialect>> = {
  postgresql: postgreSqlDialect,
};

export function getSqlDialect(id: SqlDialectId): SqlDialect | undefined {
  return SQL_DIALECTS[id];
}
