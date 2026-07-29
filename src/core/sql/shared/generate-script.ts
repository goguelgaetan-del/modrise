/**
 * Moteur de génération SQL partagé par tous les dialectes.
 *
 * Ce qui est mutualisé (identique quel que soit le SGBD cible) : validation
 * défensive, parcours des tables et colonnes, calcul des noms de contraintes
 * (`pk_/uq_/fk_`, qualification par rôle pour les FK réflexives multiples),
 * assemblage du script (ordre des blocs, ligne vide entre instructions, fin
 * de fichier), gestion des issues, casse des mots-clés, terminaison des
 * instructions.
 *
 * Ce qui reste propre à chaque dialecte (fourni via `DialectSyntax`) :
 * échappement des identifiants, mapping des types, limite d'octets des noms
 * de contrainte, modes de clé étrangère autorisés (SQLite n'autorise que
 * `inline`, ne pouvant pas faire d'`ALTER TABLE ADD CONSTRAINT`), syntaxe des
 * `DROP TABLE` (suffixe, encadrement par des pragmas/réglages), préambule
 * fixe (ex. `PRAGMA foreign_keys = ON` pour SQLite) et prise en charge des
 * commentaires (seul PostgreSQL les implémente pour l'instant : les décrire
 * proprement pour MySQL nécessiterait une syntaxe inline entièrement
 * différente, hors périmètre de cette phase — une issue informative est
 * émise à la place si demandé).
 */
import type { LogicalModel, LogicalTable } from '../../logical-model/types';
import type {
  ForeignKeyMode,
  KeywordCase,
  SqlDialectId,
  SqlGenerationIssue,
  SqlGenerationOptions,
  SqlGenerationResult,
} from '../dialect';
import { SqlConstraintNameRegistry } from './constraint-registry';
import { validateLogicalModelForSql } from './validate-logical-model';

export const SQL_GENERATION_CODES = {
  constraintNameCollisionResolved: 'SQL_CONSTRAINT_NAME_COLLISION_RESOLVED',
  constraintNameTruncated: 'SQL_CONSTRAINT_NAME_TRUNCATED',
  commentUnsupportedForDialect: 'COMMENT_UNSUPPORTED_FOR_DIALECT',
  internalGenerationError: 'INTERNAL_SQL_GENERATION_ERROR',
} as const;

export interface DropWrapper {
  before: string;
  after: string;
}

export interface DialectSyntax {
  id: SqlDialectId;
  header: string;
  quoteIdentifier(identifier: string): string;
  mapDataType(type: LogicalTable['columns'][number]['dataType']): string;
  maxConstraintNameBytes: number;
  /** Modes de clé étrangère supportés ; le premier est le mode par défaut/imposé. */
  allowedForeignKeyModes: readonly ForeignKeyMode[];
  /** Texte ajouté après le nom de table dans `DROP TABLE IF EXISTS <table><suffix>;` (ex. ` CASCADE` pour PostgreSQL). */
  dropStatementSuffix: string;
  /** Instructions encadrant le bloc de DROP (ex. bascule des vérifications de clé étrangère). */
  dropWrapper?: DropWrapper;
  /** Instruction(s) toujours émises en tout premier, avant l'en-tête même (ex. `PRAGMA foreign_keys = ON;` pour SQLite). */
  preamble?: string;
  renderComments?(
    table: LogicalTable,
    options: SqlGenerationOptions,
    quote: (identifier: string) => string,
    keyword: (word: string) => string,
  ): string | undefined;
}

interface TableConstraintNames {
  primaryKey?: string;
  uniqueConstraints: Map<string, string>;
  foreignKeys: Map<string, string>;
}

export function generateSqlScript(
  model: LogicalModel,
  options: SqlGenerationOptions,
  syntax: DialectSyntax,
): SqlGenerationResult {
  try {
    const validationIssues = validateLogicalModelForSql(model);
    if (validationIssues.some((issue) => issue.severity === 'error')) {
      return { success: false, sql: '', issues: validationIssues };
    }

    const issues: SqlGenerationIssue[] = [];
    const pushIssue = (issue: Omit<SqlGenerationIssue, 'id'>): void => {
      issues.push({ id: `sql-issue-${issues.length + 1}`, ...issue });
    };

    const foreignKeyMode: ForeignKeyMode = syntax.allowedForeignKeyModes.includes(
      options.foreignKeyMode,
    )
      ? options.foreignKeyMode
      : (syntax.allowedForeignKeyModes[0] ?? 'alter-table');

    const tableById = new Map(model.tables.map((table) => [table.id, table]));
    const registry = new SqlConstraintNameRegistry(syntax.maxConstraintNameBytes);
    const constraintNames = computeConstraintNames(model, tableById, registry, pushIssue);

    const quote = syntax.quoteIdentifier;
    const K = (word: string) => applyKeywordCase(word, options.keywordCase);
    const columnName = (table: LogicalTable, columnId: string): string =>
      table.columns.find((c) => c.id === columnId)?.name ?? columnId;

    const blocks: string[] = [];

    if (syntax.preamble) {
      blocks.push(syntax.preamble);
    }

    if (options.includeHeader) {
      blocks.push(syntax.header);
    }

    if (options.includeDropStatements) {
      const dropLines = [...model.tables]
        .reverse()
        .map(
          (table) =>
            `${K('DROP TABLE IF EXISTS')} ${quote(table.name)}${syntax.dropStatementSuffix}${terminator(options)}`,
        );
      const dropBlock = dropLines.join('\n');
      blocks.push(
        syntax.dropWrapper
          ? `${syntax.dropWrapper.before}\n${dropBlock}\n${syntax.dropWrapper.after}`
          : dropBlock,
      );
    }

    for (const table of model.tables) {
      blocks.push(
        renderCreateTable(
          table,
          tableById,
          constraintNames.get(table.id)!,
          options,
          syntax,
          quote,
          K,
          columnName,
          foreignKeyMode,
        ),
      );
    }

    if (foreignKeyMode === 'alter-table') {
      for (const table of model.tables) {
        for (const foreignKey of table.foreignKeys) {
          const referencedTable = tableById.get(foreignKey.referencedTableId);
          if (!referencedTable) continue; // écarté par la validation défensive sinon
          blocks.push(
            renderAlterTableForeignKey(
              table,
              foreignKey,
              referencedTable,
              constraintNames.get(table.id)!.foreignKeys.get(foreignKey.id)!,
              quote,
              K,
              columnName,
              options,
            ),
          );
        }
      }
    }

    if (options.includeComments) {
      if (syntax.renderComments) {
        for (const table of model.tables) {
          const commentBlock = syntax.renderComments(table, options, quote, K);
          if (commentBlock) blocks.push(commentBlock);
        }
      } else if (hasAnyDescription(model)) {
        pushIssue({
          severity: 'info',
          code: SQL_GENERATION_CODES.commentUnsupportedForDialect,
          message: `Les commentaires SQL ne sont pas encore implémentés pour le dialecte « ${syntax.id} » ; aucun commentaire n'a été généré.`,
          sourceIds: [],
        });
      }
    }

    const sql = `${blocks.join('\n\n')}\n`;
    return { success: true, sql, issues };
  } catch (error) {
    console.error(`Erreur inattendue pendant la génération SQL (${syntax.id}) :`, error);
    return {
      success: false,
      sql: '',
      issues: [
        {
          id: 'internal-error',
          severity: 'error',
          code: SQL_GENERATION_CODES.internalGenerationError,
          message:
            'Une erreur interne inattendue a empêché la génération du SQL. Consultez la console pour plus de détails.',
          sourceIds: [],
        },
      ],
    };
  }
}

function hasAnyDescription(model: LogicalModel): boolean {
  return model.tables.some(
    (table) => !!table.description?.trim() || table.columns.some((c) => !!c.description?.trim()),
  );
}

function terminator(options: SqlGenerationOptions): string {
  return options.statementTerminator ? ';' : '';
}

function applyKeywordCase(word: string, keywordCase: KeywordCase): string {
  return keywordCase === 'lower' ? word.toLowerCase() : word.toUpperCase();
}

/**
 * Calcule les noms de contraintes SQL pour chaque table, dans un ordre
 * stable (clé primaire, puis contraintes uniques, puis clés étrangères).
 * Les noms de contraintes du MLD (`uniqueConstraint.name`, `foreignKey.name`)
 * ne sont pas réutilisés tels quels : la convention SQL (`pk_<table>`,
 * `uq_<table>_<colonnes>`, `fk_<table>_<table référencée>`) est calculée ici
 * pour rester la seule source de vérité du nommage des contraintes SQL,
 * commune à tous les dialectes.
 */
function computeConstraintNames(
  model: LogicalModel,
  tableById: ReadonlyMap<string, LogicalTable>,
  registry: SqlConstraintNameRegistry,
  pushIssue: (issue: Omit<SqlGenerationIssue, 'id'>) => void,
): Map<string, TableConstraintNames> {
  const result = new Map<string, TableConstraintNames>();

  const reserve = (baseName: string, sourceIds: string[]): string => {
    const { name, collided, truncated } = registry.reserve(baseName);
    if (collided) {
      pushIssue({
        severity: 'warning',
        code: SQL_GENERATION_CODES.constraintNameCollisionResolved,
        message: `Le nom de contrainte SQL généré à partir de « ${baseName} » entrait en collision ; « ${name} » a été utilisé à la place.`,
        sourceIds,
      });
    }
    if (truncated) {
      pushIssue({
        severity: 'info',
        code: SQL_GENERATION_CODES.constraintNameTruncated,
        message: `Le nom de contrainte SQL généré à partir de « ${baseName} » dépassait la limite de longueur du dialecte et a été raccourci en « ${name} ».`,
        sourceIds,
      });
    }
    return name;
  };

  for (const table of model.tables) {
    const names: TableConstraintNames = {
      uniqueConstraints: new Map(),
      foreignKeys: new Map(),
    };

    if (table.primaryKey.length > 0) {
      names.primaryKey = reserve(`pk_${table.name}`, [table.id]);
    }

    for (const uniqueConstraint of table.uniqueConstraints) {
      const columnNames = uniqueConstraint.columnIds.map(
        (id) => table.columns.find((c) => c.id === id)?.name ?? id,
      );
      names.uniqueConstraints.set(
        uniqueConstraint.id,
        reserve(`uq_${table.name}_${columnNames.join('_')}`, [table.id, uniqueConstraint.id]),
      );
    }

    for (const foreignKey of table.foreignKeys) {
      const referencedTable = tableById.get(foreignKey.referencedTableId);
      const baseName = referencedTable
        ? foreignKeyBaseName(table, foreignKey, referencedTable)
        : `fk_${table.name}`;
      names.foreignKeys.set(foreignKey.id, reserve(baseName, [table.id, foreignKey.id]));
    }

    result.set(table.id, names);
  }

  return result;
}

/**
 * Nom de base d'une clé étrangère : `fk_<table>_<table référencée>`, sauf
 * lorsque plusieurs clés étrangères de la même table pointent vers la même
 * table référencée (association réflexive multiple) — un qualificatif est
 * alors dérivé du nom de la première colonne locale de la clé (déjà préfixée
 * par le rôle lors de la transformation MCD → MLD), ex. `fk_employe_manager`
 * / `fk_employe_subordonne` plutôt qu'un suffixe numérique peu lisible.
 */
function foreignKeyBaseName(
  table: LogicalTable,
  foreignKey: LogicalTable['foreignKeys'][number],
  referencedTable: LogicalTable,
): string {
  const sameTargetCount = table.foreignKeys.filter(
    (fk) => fk.referencedTableId === foreignKey.referencedTableId,
  ).length;
  if (sameTargetCount > 1) {
    const qualified = deriveQualifiedForeignKeyBaseName(table, foreignKey, referencedTable);
    if (qualified) return qualified;
  }
  return `fk_${table.name}_${referencedTable.name}`;
}

function deriveQualifiedForeignKeyBaseName(
  table: LogicalTable,
  foreignKey: LogicalTable['foreignKeys'][number],
  referencedTable: LogicalTable,
): string | undefined {
  const firstLocalColumnId = foreignKey.columnIds[0];
  const firstReferencedColumnId = foreignKey.referencedColumnIds[0];
  if (!firstLocalColumnId || !firstReferencedColumnId) return undefined;
  const localColumn = table.columns.find((c) => c.id === firstLocalColumnId);
  const referencedColumn = referencedTable.columns.find((c) => c.id === firstReferencedColumnId);
  if (!localColumn || !referencedColumn) return undefined;
  const suffix = `_${referencedColumn.name}`;
  if (!localColumn.name.endsWith(suffix)) return undefined;
  const qualifier = localColumn.name.slice(0, -suffix.length);
  return qualifier.length > 0 ? `fk_${table.name}_${qualifier}` : undefined;
}

function renderCreateTable(
  table: LogicalTable,
  tableById: ReadonlyMap<string, LogicalTable>,
  names: TableConstraintNames,
  options: SqlGenerationOptions,
  syntax: DialectSyntax,
  quote: (identifier: string) => string,
  K: (word: string) => string,
  columnName: (table: LogicalTable, columnId: string) => string,
  foreignKeyMode: ForeignKeyMode,
): string {
  const primaryKeySet = new Set(table.primaryKey);
  const bodyLines: string[] = [];

  for (const column of table.columns) {
    const notNull = primaryKeySet.has(column.id) || !column.nullable;
    bodyLines.push(
      `  ${quote(column.name)} ${syntax.mapDataType(column.dataType)}${notNull ? ` ${K('NOT NULL')}` : ''}`,
    );
  }

  if (table.primaryKey.length > 0 && names.primaryKey) {
    const columns = table.primaryKey.map((id) => quote(columnName(table, id)));
    bodyLines.push(
      `  ${K('CONSTRAINT')} ${quote(names.primaryKey)} ${K('PRIMARY KEY')} (${columns.join(', ')})`,
    );
  }

  for (const uniqueConstraint of table.uniqueConstraints) {
    const name = names.uniqueConstraints.get(uniqueConstraint.id);
    if (!name) continue;
    const columns = uniqueConstraint.columnIds.map((id) => quote(columnName(table, id)));
    bodyLines.push(`  ${K('CONSTRAINT')} ${quote(name)} ${K('UNIQUE')} (${columns.join(', ')})`);
  }

  if (foreignKeyMode === 'inline') {
    for (const foreignKey of table.foreignKeys) {
      const name = names.foreignKeys.get(foreignKey.id);
      const referencedTable = tableById.get(foreignKey.referencedTableId);
      if (!name || !referencedTable) continue; // écarté par la validation défensive sinon
      const localColumns = foreignKey.columnIds.map((id) => quote(columnName(table, id)));
      const referencedColumns = foreignKey.referencedColumnIds.map((id) =>
        quote(columnName(referencedTable, id)),
      );
      bodyLines.push(
        `  ${K('CONSTRAINT')} ${quote(name)} ${K('FOREIGN KEY')} (${localColumns.join(', ')}) ${K('REFERENCES')} ${quote(referencedTable.name)} (${referencedColumns.join(', ')})`,
      );
    }
  }

  return `${K('CREATE TABLE')} ${quote(table.name)} (\n${bodyLines.join(',\n')}\n)${terminator(options)}`;
}

function renderAlterTableForeignKey(
  table: LogicalTable,
  foreignKey: LogicalTable['foreignKeys'][number],
  referencedTable: LogicalTable,
  constraintName: string,
  quote: (identifier: string) => string,
  K: (word: string) => string,
  columnName: (table: LogicalTable, columnId: string) => string,
  options: SqlGenerationOptions,
): string {
  const localColumns = foreignKey.columnIds.map((id) => quote(columnName(table, id)));
  const referencedColumns = foreignKey.referencedColumnIds.map((id) =>
    quote(columnName(referencedTable, id)),
  );
  return [
    `${K('ALTER TABLE')} ${quote(table.name)}`,
    `  ${K('ADD CONSTRAINT')} ${quote(constraintName)}`,
    `  ${K('FOREIGN KEY')} (${localColumns.join(', ')})`,
    `  ${K('REFERENCES')} ${quote(referencedTable.name)} (${referencedColumns.join(', ')})${terminator(options)}`,
  ].join('\n');
}
