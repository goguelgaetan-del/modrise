/**
 * Interface des dialectes SQL.
 *
 * TODO(v0.3) : implémenter les dialectes PostgreSQL, MySQL/MariaDB et SQLite
 * dans ce dossier (`postgresql.ts`, `mysql.ts`, `sqlite.ts`), chacun couvrant :
 * tables, colonnes, clés primaires simples et composées, contraintes uniques,
 * clés étrangères, nullabilité, échappement des identifiants, ordre et noms
 * de contraintes déterministes, commentaires optionnels, options ON DELETE /
 * ON UPDATE.
 */
import type { ConceptualDataType } from '../conceptual-model/data-types';
import type { LogicalModel } from '../logical-model/types';

export type SqlDialectId = 'postgresql' | 'mysql' | 'sqlite';

export const SQL_DIALECT_IDS: readonly SqlDialectId[] = ['postgresql', 'mysql', 'sqlite'];

export interface SqlGenerationOptions {
  /** Inclure les descriptions du modèle sous forme de commentaires SQL. */
  includeComments: boolean;
}

export interface SqlDialect {
  id: SqlDialectId;
  label: string;
  quoteIdentifier(identifier: string): string;
  mapDataType(type: ConceptualDataType): string;
  generate(model: LogicalModel, options: SqlGenerationOptions): string;
}

/**
 * Registre des dialectes disponibles.
 * Vide tant que la génération SQL n'est pas implémentée (v0.3) : l'interface
 * l'affiche alors comme « Fonctionnalité prévue dans une prochaine version ».
 */
export const SQL_DIALECTS: ReadonlyMap<SqlDialectId, SqlDialect> = new Map();
