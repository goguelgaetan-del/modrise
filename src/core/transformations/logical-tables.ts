/**
 * Construction des tables logiques issues directement des entités
 * (colonnes propres, clé primaire simple ou composée, contraintes uniques).
 *
 * Les colonnes de clés étrangères et les attributs d'association migrés sont
 * ajoutés ensuite par `logical-associations.ts` : ce module ne s'occupe que
 * de ce qu'une entité produit par elle-même.
 */
import type { Entity } from '../conceptual-model/types';
import type {
  LogicalColumn,
  LogicalTable,
  LogicalTransformationIssue,
  UniqueConstraint,
} from '../logical-model/types';
import {
  entityTableBaseName,
  reserveColumnNameWithIssue,
  reserveConstraintNameWithIssue,
  reserveTableNameWithIssue,
  type LogicalNameRegistry,
} from './logical-naming';

type PushIssue = (issue: Omit<LogicalTransformationIssue, 'id'>) => void;

/** Identifiant déterministe de la table d'une entité. */
export function entityTableId(entityId: string): string {
  return `t:entity:${entityId}`;
}

/**
 * Construit la table logique d'une entité : une colonne par attribut, la clé
 * primaire (simple ou composée) issue de l'identifiant primaire, et une
 * contrainte unique par identifiant alternatif ou par attribut marqué
 * `unique` en dehors de la clé primaire.
 */
export function buildEntityTable(
  entity: Entity,
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
): LogicalTable {
  const tableId = entityTableId(entity.id);
  const tableName = reserveTableNameWithIssue(registry, pushIssue, entityTableBaseName(entity), [
    entity.id,
  ]);

  const columns: LogicalColumn[] = entity.attributes.map((attribute) => ({
    id: `c:${tableId}:attr:${attribute.id}`,
    name: reserveColumnNameWithIssue(registry, pushIssue, tableId, attribute.name, [
      entity.id,
      attribute.id,
    ]),
    dataType: attribute.dataType,
    nullable: !attribute.required,
    sourceId: attribute.id,
    origin: 'entity-attribute',
  }));
  const columnIdByAttributeId = new Map(
    entity.attributes.map((attribute, index) => [attribute.id, columns[index]?.id]),
  );

  const primaryIdentifier = entity.identifiers.find((identifier) => identifier.primary);
  const primaryKey = (primaryIdentifier?.attributeIds ?? [])
    .map((attributeId) => columnIdByAttributeId.get(attributeId))
    .filter((id): id is string => id !== undefined);
  const primaryKeyAttributeIds = new Set(primaryIdentifier?.attributeIds ?? []);

  const uniqueConstraints: UniqueConstraint[] = [];

  for (const identifier of entity.identifiers) {
    if (identifier.primary) continue;
    const columnIds = identifier.attributeIds
      .map((attributeId) => columnIdByAttributeId.get(attributeId))
      .filter((id): id is string => id !== undefined);
    if (columnIds.length === 0) continue;
    const columnNames = columnIds.map((id) => columns.find((c) => c.id === id)?.name ?? id);
    uniqueConstraints.push({
      id: `uq:${tableId}:identifier:${identifier.id}`,
      name: reserveConstraintNameWithIssue(
        registry,
        pushIssue,
        `uq_${tableName}_${columnNames.join('_')}`,
        [entity.id, identifier.id],
      ),
      columnIds,
      sourceIdentifierId: identifier.id,
    });
  }

  // Attribut `unique: true` hors identifiant : contrainte unique mono-colonne,
  // sans identifiant conceptuel d'origine (ce n'est pas un Identifier).
  for (const attribute of entity.attributes) {
    if (!attribute.unique || primaryKeyAttributeIds.has(attribute.id)) continue;
    const columnId = columnIdByAttributeId.get(attribute.id);
    if (!columnId) continue;
    const column = columns.find((c) => c.id === columnId);
    uniqueConstraints.push({
      id: `uq:${tableId}:attribute:${attribute.id}`,
      name: reserveConstraintNameWithIssue(
        registry,
        pushIssue,
        `uq_${tableName}_${column?.name ?? attribute.id}`,
        [entity.id, attribute.id],
      ),
      columnIds: [columnId],
    });
  }

  return {
    id: tableId,
    name: tableName,
    sourceIds: [entity.id],
    columns,
    primaryKey,
    foreignKeys: [],
    uniqueConstraints,
  };
}

/**
 * Copie les colonnes de la clé primaire d'une table référencée dans une
 * autre table (clé étrangère). Le préfixe (rôle ou nom d'entité) est fourni
 * par l'appelant ; la nullabilité est laissée à `false` par défaut et doit
 * être ajustée ensuite selon la cardinalité du côté porteur.
 */
export function migratePrimaryKeyColumns(
  targetTableId: string,
  referencedTable: LogicalTable,
  prefix: string,
  idSeed: string,
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
  sourceIds: string[],
): { columns: LogicalColumn[]; columnIds: string[] } {
  const referencedColumnById = new Map(
    referencedTable.columns.map((column) => [column.id, column]),
  );
  const columns: LogicalColumn[] = [];
  for (const referencedColumnId of referencedTable.primaryKey) {
    const referencedColumn = referencedColumnById.get(referencedColumnId);
    if (!referencedColumn) continue; // défensif : ne devrait pas arriver sur un modèle validé
    const baseName = `${prefix}_${referencedColumn.name}`;
    columns.push({
      id: `c:${targetTableId}:fk:${idSeed}:${referencedColumn.id}`,
      name: reserveColumnNameWithIssue(registry, pushIssue, targetTableId, baseName, sourceIds),
      dataType: referencedColumn.dataType,
      nullable: false,
      origin: 'migrated-identifier',
    });
  }
  return { columns, columnIds: columns.map((column) => column.id) };
}
