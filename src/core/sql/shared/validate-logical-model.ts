/**
 * Validation défensive du modèle logique avant génération SQL.
 *
 * Partagée par tous les dialectes : elle ne dépend d'aucune syntaxe
 * spécifique (échappement, types), seulement de la cohérence structurelle
 * du `LogicalModel` lui-même. Le MLD produit par `transformToLogicalModel`
 * est déjà cohérent en pratique, mais aucun générateur ne lui fait jamais une
 * confiance aveugle : un modèle malformé (construit à la main, ou par une
 * future évolution du moteur) ne doit jamais produire un script trompeur ni
 * faire planter l'application.
 */
import { DATA_TYPE_KINDS } from '../../conceptual-model/data-types';
import type { LogicalModel, LogicalTable } from '../../logical-model/types';
import type { SqlGenerationIssue } from '../dialect';

export const SQL_VALIDATION_CODES = {
  tableWithoutName: 'TABLE_WITHOUT_NAME',
  columnWithoutName: 'COLUMN_WITHOUT_NAME',
  tableWithoutColumns: 'TABLE_WITHOUT_COLUMNS',
  primaryKeyUnknownColumn: 'PRIMARY_KEY_UNKNOWN_COLUMN',
  uniqueConstraintUnknownColumn: 'UNIQUE_CONSTRAINT_UNKNOWN_COLUMN',
  foreignKeyColumnCountMismatch: 'FOREIGN_KEY_COLUMN_COUNT_MISMATCH',
  foreignKeyUnknownTable: 'FOREIGN_KEY_UNKNOWN_TABLE',
  foreignKeyLocalUnknownColumn: 'FOREIGN_KEY_LOCAL_UNKNOWN_COLUMN',
  foreignKeyReferencedUnknownColumn: 'FOREIGN_KEY_REFERENCED_UNKNOWN_COLUMN',
  unsupportedDataType: 'UNSUPPORTED_DATA_TYPE',
} as const;

export function validateLogicalModelForSql(model: LogicalModel): SqlGenerationIssue[] {
  const issues: SqlGenerationIssue[] = [];
  const push = (issue: Omit<SqlGenerationIssue, 'id'>): void => {
    issues.push({ id: `sql-issue-${issues.length + 1}`, ...issue });
  };

  const tableById = new Map(model.tables.map((table) => [table.id, table]));

  for (const table of model.tables) {
    validateTable(table, tableById, push);
  }

  return issues;
}

type Push = (issue: Omit<SqlGenerationIssue, 'id'>) => void;

function validateTable(
  table: LogicalTable,
  tableById: ReadonlyMap<string, LogicalTable>,
  push: Push,
): void {
  if (table.name.trim().length === 0) {
    push({
      severity: 'error',
      code: SQL_VALIDATION_CODES.tableWithoutName,
      message: 'Une table du modèle logique ne possède pas de nom.',
      sourceIds: [table.id],
    });
  }
  if (table.columns.length === 0) {
    push({
      severity: 'error',
      code: SQL_VALIDATION_CODES.tableWithoutColumns,
      message: `La table « ${table.name || table.id} » ne possède aucune colonne.`,
      sourceIds: [table.id],
    });
  }

  const columnById = new Map(table.columns.map((column) => [column.id, column]));

  for (const column of table.columns) {
    if (column.name.trim().length === 0) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.columnWithoutName,
        message: `Une colonne de la table « ${table.name} » ne possède pas de nom.`,
        sourceIds: [table.id, column.id],
      });
    }
    if (!DATA_TYPE_KINDS.includes(column.dataType.kind)) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.unsupportedDataType,
        message: `La colonne « ${column.name} » de la table « ${table.name} » a un type non supporté.`,
        sourceIds: [table.id, column.id],
      });
    }
  }

  for (const columnId of table.primaryKey) {
    if (!columnById.has(columnId)) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.primaryKeyUnknownColumn,
        message: `La clé primaire de la table « ${table.name} » référence une colonne inexistante.`,
        sourceIds: [table.id],
      });
    }
  }

  for (const uniqueConstraint of table.uniqueConstraints) {
    if (uniqueConstraint.columnIds.some((id) => !columnById.has(id))) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.uniqueConstraintUnknownColumn,
        message: `La contrainte unique « ${uniqueConstraint.name} » de la table « ${table.name} » référence une colonne inexistante.`,
        sourceIds: [table.id, uniqueConstraint.id],
      });
    }
  }

  for (const foreignKey of table.foreignKeys) {
    const referencedTable = tableById.get(foreignKey.referencedTableId);
    if (!referencedTable) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.foreignKeyUnknownTable,
        message: `La clé étrangère « ${foreignKey.name} » de la table « ${table.name} » référence une table inexistante.`,
        sourceIds: [table.id, foreignKey.id],
      });
      continue;
    }
    if (foreignKey.columnIds.some((id) => !columnById.has(id))) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.foreignKeyLocalUnknownColumn,
        message: `La clé étrangère « ${foreignKey.name} » de la table « ${table.name} » référence une colonne locale inexistante.`,
        sourceIds: [table.id, foreignKey.id],
      });
    }
    const referencedColumnById = new Map(referencedTable.columns.map((c) => [c.id, c]));
    if (foreignKey.referencedColumnIds.some((id) => !referencedColumnById.has(id))) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.foreignKeyReferencedUnknownColumn,
        message: `La clé étrangère « ${foreignKey.name} » de la table « ${table.name} » référence une colonne inexistante dans « ${referencedTable.name} ».`,
        sourceIds: [table.id, foreignKey.id],
      });
    }
    if (foreignKey.columnIds.length !== foreignKey.referencedColumnIds.length) {
      push({
        severity: 'error',
        code: SQL_VALIDATION_CODES.foreignKeyColumnCountMismatch,
        message: `La clé étrangère « ${foreignKey.name} » de la table « ${table.name} » n'a pas le même nombre de colonnes locales (${foreignKey.columnIds.length}) que de colonnes référencées (${foreignKey.referencedColumnIds.length}).`,
        sourceIds: [table.id, foreignKey.id],
      });
    }
  }
}
