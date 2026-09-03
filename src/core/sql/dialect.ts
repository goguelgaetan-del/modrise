/**
 * Interface des dialectes SQL.
 *
 * Un dialecte consomme exclusivement un `LogicalModel` (jamais le MCD) et
 * produit un script SQL déterministe. Voir `src/core/sql/postgresql` pour
 * la première implémentation (v0.3.1) et `src/core/sql/registry.ts` pour le
 * registre des dialectes disponibles.
 *
 * Trois dialectes sont livrés, dans des dossiers frères couvrant les mêmes
 * capacités : `postgresql/` (v0.3.1), `mysql/` et `sqlite/` (v0.3.2). Ajouter
 * un dialecte consiste à créer un dossier de plus, à l'enregistrer dans
 * `registry.ts` et à étendre `SqlDialectId` — le moteur partagé de
 * `shared/` fait le reste.
 */
import type { ConceptualDataType } from '../conceptual-model/data-types';
import type { LogicalModel } from '../logical-model/types';

export type SqlDialectId = 'postgresql' | 'mysql' | 'sqlite';

export const SQL_DIALECT_IDS: readonly SqlDialectId[] = ['postgresql', 'mysql', 'sqlite'];

/** Stratégie de placement des clés étrangères dans le script généré. */
export type ForeignKeyMode = 'alter-table' | 'inline';

export type KeywordCase = 'upper' | 'lower';

export interface SqlGenerationOptions {
  /** Inclure un en-tête de commentaire identifiant Modrise et le dialecte. */
  includeHeader: boolean;
  /**
   * Inclure des `COMMENT ON` reprenant les descriptions du modèle logique.
   * Sans effet tant qu'aucune description n'est renseignée sur les entités
   * ou associations du MCD (voir docs/postgresql-generation.md).
   */
  includeComments: boolean;
  /** Préfixer le script par des `DROP TABLE IF EXISTS ... CASCADE`. */
  includeDropStatements: boolean;
  /** `alter-table` (par défaut) évite tout problème de dépendance circulaire ou réflexive. */
  foreignKeyMode: ForeignKeyMode;
  keywordCase: KeywordCase;
  /** Terminer chaque instruction par un point-virgule (toujours `true` en pratique). */
  statementTerminator: boolean;
}

export const DEFAULT_SQL_GENERATION_OPTIONS: SqlGenerationOptions = {
  includeHeader: true,
  includeComments: false,
  includeDropStatements: false,
  foreignKeyMode: 'alter-table',
  keywordCase: 'upper',
  statementTerminator: true,
};

export type SqlGenerationSeverity = 'error' | 'warning' | 'info';

export interface SqlGenerationIssue {
  id: string;
  severity: SqlGenerationSeverity;
  code: string;
  message: string;
  sourceIds: string[];
}

export interface SqlGenerationResult {
  success: boolean;
  sql: string;
  issues: SqlGenerationIssue[];
}

export interface SqlDialect {
  id: SqlDialectId;
  label: string;
  quoteIdentifier(identifier: string): string;
  mapDataType(type: ConceptualDataType): string;
  generate(model: LogicalModel, options?: SqlGenerationOptions): SqlGenerationResult;
}
