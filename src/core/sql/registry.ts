/**
 * Registre des dialectes SQL disponibles.
 *
 * Séparé de `dialect.ts` (qui ne définit que l'interface) pour que celui-ci
 * reste indépendant de toute implémentation concrète. Le frontend n'importe
 * jamais directement les modules internes d'un dialecte (générateur,
 * échappement, types) : il passe systématiquement par `getSqlDialect`.
 */
import type { SqlDialect, SqlDialectId } from './dialect';
import { mySqlDialect } from './mysql/dialect';
import { postgreSqlDialect } from './postgresql/dialect';
import { sqliteDialect } from './sqlite/dialect';

export const SQL_DIALECTS: Readonly<Record<SqlDialectId, SqlDialect>> = {
  postgresql: postgreSqlDialect,
  mysql: mySqlDialect,
  sqlite: sqliteDialect,
};

/** Retrouve un dialecte par son identifiant ; `undefined` si inconnu (ex. valeur importée invalide). */
export function getSqlDialect(id: SqlDialectId): SqlDialect | undefined {
  return SQL_DIALECTS[id];
}
