/**
 * Transformation des associations en clés étrangères ou en tables
 * associatives.
 *
 * Règle de direction 1,N (vérifiée sur le fixture « Gestion d'hôtel » —
 * voir docs/logical-transformation.md) : la clé étrangère est portée par
 * l'entité dont la cardinalité **maximale vaut 1** (le côté « plusieurs »
 * au sens relationnel : chaque ligne de cette table référence une seule
 * ligne de l'autre table), et référence l'entité dont la cardinalité
 * **maximale vaut N**. Une colonne scalaire ne peut physiquement pas porter
 * plusieurs références : c'est le côté max=1 qui reçoit forcément la FK.
 *
 * La nullabilité de la clé étrangère dépend de la cardinalité **minimale du
 * côté qui porte la clé étrangère** (et non de l'autre côté) : c'est ce côté
 * qui déclare si la relation est obligatoire ou optionnelle pour lui-même.
 *
 * Ce même principe (nullabilité = minimum du côté porteur) s'applique
 * uniformément aux associations 1,1 une fois le côté porteur choisi.
 */
import type { Association, ConceptualModel, Participation } from '../conceptual-model/types';
import type { ForeignKey, LogicalTable, LogicalTransformationIssue } from '../logical-model/types';
import {
  associationTableBaseName,
  entityTableBaseName,
  reserveColumnNameWithIssue,
  reserveConstraintNameWithIssue,
  reserveTableNameWithIssue,
  type LogicalNameRegistry,
} from './logical-naming';
import { migratePrimaryKeyColumns } from './logical-tables';

type PushIssue = (issue: Omit<LogicalTransformationIssue, 'id'>) => void;
type TableByEntityId = ReadonlyMap<string, LogicalTable>;

export type AssociationKind = 'one-to-many' | 'one-to-one' | 'junction';

/**
 * Classe une association binaire ou n-aire :
 * - exactement 2 participations, une seule à max=1 → `one-to-many` ;
 * - exactement 2 participations, toutes deux à max=1 → `one-to-one` ;
 * - toute autre configuration (N,N binaire ou n-aire, ou cas dégénéré
 *   défensif) → `junction`, gérée par une table associative générique.
 */
export function classifyAssociation(association: Association): AssociationKind {
  if (association.participations.length !== 2) return 'junction';
  const [a, b] = association.participations;
  if (!a || !b) return 'junction';
  if (a.cardinality.max === 1 && b.cardinality.max === 1) return 'one-to-one';
  if (a.cardinality.max === 'N' && b.cardinality.max === 'N') return 'junction';
  return 'one-to-many';
}

/**
 * Association réflexive (au moins deux participations vers la même entité)
 * dont les rôles ne permettent pas de nommer les colonnes sans ambiguïté :
 * signale un problème explicite plutôt que de laisser une collision muette.
 * Le registre de nommage résout de toute façon la collision (suffixe
 * numérique) ; cette fonction ajoute seulement le contexte manquant.
 */
export function checkReflexiveNaming(association: Association, pushIssue: PushIssue): void {
  const byEntity = new Map<string, Participation[]>();
  for (const participation of association.participations) {
    byEntity.set(participation.entityId, [
      ...(byEntity.get(participation.entityId) ?? []),
      participation,
    ]);
  }
  for (const participations of byEntity.values()) {
    if (participations.length < 2) continue;
    const roles = participations.map((p) => p.role?.trim().toLowerCase() ?? '');
    const missingOrDuplicated =
      roles.some((role) => role.length === 0) || new Set(roles).size !== roles.length;
    if (missingOrDuplicated) {
      pushIssue({
        severity: 'warning',
        code: 'REFLEXIVE_ASSOCIATION_MISSING_ROLE',
        message: `L'association réflexive « ${association.name} » n'a pas de rôles distincts sur chaque participation ; les noms de colonnes générés ont été désambiguïsés automatiquement.`,
        sourceIds: [association.id],
      });
    }
  }
}

/**
 * Association 1,N : migre la clé primaire du côté « N » (référencé) vers la
 * table du côté « 1 » (porteur de la clé étrangère), et y ajoute les
 * attributs portés par l'association.
 */
export function applyOneToMany(
  association: Association,
  model: ConceptualModel,
  tables: TableByEntityId,
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
): void {
  const fkHolder = association.participations.find((p) => p.cardinality.max === 1);
  const referenced = association.participations.find((p) => p.cardinality.max === 'N');
  if (!fkHolder || !referenced) {
    pushIssue({
      severity: 'error',
      code: 'MALFORMED_ONE_TO_MANY_ASSOCIATION',
      message: `L'association « ${association.name} » n'a pas pu être classée comme 1,N malgré sa détection initiale.`,
      sourceIds: [association.id],
    });
    return;
  }
  const fkHolderTable = tables.get(fkHolder.entityId);
  const referencedTable = tables.get(referenced.entityId);
  const referencedEntity = model.entities.find((e) => e.id === referenced.entityId);
  if (!fkHolderTable || !referencedTable || !referencedEntity) {
    pushIssue({
      severity: 'error',
      code: 'PARTICIPATION_UNKNOWN_ENTITY_DURING_TRANSFORM',
      message: `Une participation de l'association « ${association.name} » référence une entité introuvable ; l'association a été ignorée lors de la génération du MLD.`,
      sourceIds: [association.id],
    });
    return;
  }

  const prefix = referenced.role?.trim() || entityTableBaseName(referencedEntity);
  const { columns: fkColumns, columnIds } = migratePrimaryKeyColumns(
    fkHolderTable.id,
    referencedTable,
    prefix,
    fkHolder.id,
    registry,
    pushIssue,
    [association.id, fkHolder.id],
  );
  const nullable = fkHolder.cardinality.min === 0;
  for (const column of fkColumns) column.nullable = nullable;
  fkHolderTable.columns.push(...fkColumns);

  const foreignKey: ForeignKey = {
    id: `fk:${fkHolderTable.id}:${fkHolder.id}`,
    name: reserveConstraintNameWithIssue(
      registry,
      pushIssue,
      `fk_${fkHolderTable.name}_${referencedTable.name}`,
      [association.id],
    ),
    columnIds,
    referencedTableId: referencedTable.id,
    referencedColumnIds: referencedTable.primaryKey,
    nullable,
    unique: false,
    sourceAssociationId: association.id,
  };
  fkHolderTable.foreignKeys.push(foreignKey);

  migrateAssociationAttributes(association, fkHolderTable, registry, pushIssue);
}

/**
 * Association 1,1 : choisit un côté porteur de manière déterministe puis
 * applique la même logique de migration qu'une association 1,N (avec
 * `unique: true` sur la clé étrangère).
 *
 * Stratégie : le côté optionnel (min=0) porte la clé étrangère lorsque
 * l'autre est obligatoire (min=1). Si les deux côtés sont équivalents
 * (0,1—0,1 ou 1,1—1,1), la première participation du modèle est choisie
 * (ordre stable) et un avertissement documente le choix.
 */
export function applyOneToOne(
  association: Association,
  model: ConceptualModel,
  tables: TableByEntityId,
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
): void {
  const [first, second] = association.participations;
  if (!first || !second) {
    pushIssue({
      severity: 'error',
      code: 'MALFORMED_ONE_TO_ONE_ASSOCIATION',
      message: `L'association « ${association.name} » n'a pas pu être classée comme 1,1 malgré sa détection initiale.`,
      sourceIds: [association.id],
    });
    return;
  }

  let holder: Participation;
  let referenced: Participation;
  if (first.cardinality.min === 0 && second.cardinality.min === 1) {
    holder = first;
    referenced = second;
  } else if (second.cardinality.min === 0 && first.cardinality.min === 1) {
    holder = second;
    referenced = first;
  } else {
    holder = first;
    referenced = second;
    pushIssue({
      severity: 'warning',
      code: 'ONE_TO_ONE_AMBIGUOUS_SIDE_SELECTED',
      message: `L'association 1,1 « ${association.name} » est symétrique (${first.cardinality.min === 0 ? '0,1—0,1' : '1,1—1,1'}) : la première participation du modèle a été choisie comme porteuse de la clé étrangère de manière stable.`,
      sourceIds: [association.id],
    });
  }

  const holderTable = tables.get(holder.entityId);
  const referencedTable = tables.get(referenced.entityId);
  const referencedEntity = model.entities.find((e) => e.id === referenced.entityId);
  if (!holderTable || !referencedTable || !referencedEntity) {
    pushIssue({
      severity: 'error',
      code: 'PARTICIPATION_UNKNOWN_ENTITY_DURING_TRANSFORM',
      message: `Une participation de l'association « ${association.name} » référence une entité introuvable ; l'association a été ignorée lors de la génération du MLD.`,
      sourceIds: [association.id],
    });
    return;
  }

  const prefix = referenced.role?.trim() || entityTableBaseName(referencedEntity);
  const { columns: fkColumns, columnIds } = migratePrimaryKeyColumns(
    holderTable.id,
    referencedTable,
    prefix,
    holder.id,
    registry,
    pushIssue,
    [association.id, holder.id],
  );
  const nullable = holder.cardinality.min === 0;
  for (const column of fkColumns) column.nullable = nullable;
  holderTable.columns.push(...fkColumns);

  const foreignKey: ForeignKey = {
    id: `fk:${holderTable.id}:${holder.id}`,
    name: reserveConstraintNameWithIssue(
      registry,
      pushIssue,
      `fk_${holderTable.name}_${referencedTable.name}`,
      [association.id],
    ),
    columnIds,
    referencedTableId: referencedTable.id,
    referencedColumnIds: referencedTable.primaryKey,
    nullable,
    unique: true,
    sourceAssociationId: association.id,
  };
  holderTable.foreignKeys.push(foreignKey);

  const columnNames = fkColumns.map((column) => column.name);
  holderTable.uniqueConstraints.push({
    id: `uq:${holderTable.id}:association:${association.id}`,
    name: reserveConstraintNameWithIssue(
      registry,
      pushIssue,
      `uq_${holderTable.name}_${columnNames.join('_')}`,
      [association.id],
    ),
    columnIds,
  });

  migrateAssociationAttributes(association, holderTable, registry, pushIssue);
}

/**
 * Association N,N (binaire, deux participations à max=N) ou n-aire (plus de
 * deux participations) : table associative générique portant une clé
 * étrangère par participation et une clé primaire composée de l'ensemble de
 * ces clés étrangères.
 */
export function buildJunctionTable(
  association: Association,
  model: ConceptualModel,
  tables: TableByEntityId,
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
): LogicalTable | undefined {
  if (association.participations.length < 2) {
    pushIssue({
      severity: 'error',
      code: 'ASSOCIATION_TOO_FEW_PARTICIPATIONS_DURING_TRANSFORM',
      message: `L'association « ${association.name} » a moins de deux participations ; elle a été ignorée lors de la génération du MLD.`,
      sourceIds: [association.id],
    });
    return undefined;
  }

  const tableId = `t:assoc:${association.id}`;
  const tableName = reserveTableNameWithIssue(
    registry,
    pushIssue,
    associationTableBaseName(association),
    [association.id],
  );

  const columns: LogicalTable['columns'] = [];
  const foreignKeys: ForeignKey[] = [];
  const primaryKey: string[] = [];

  for (const participation of association.participations) {
    const referencedTable = tables.get(participation.entityId);
    const referencedEntity = model.entities.find((e) => e.id === participation.entityId);
    if (!referencedTable || !referencedEntity) {
      pushIssue({
        severity: 'error',
        code: 'PARTICIPATION_UNKNOWN_ENTITY_DURING_TRANSFORM',
        message: `Une participation de l'association « ${association.name} » référence une entité introuvable ; elle a été ignorée lors de la génération du MLD.`,
        sourceIds: [association.id, participation.id],
      });
      continue;
    }

    const prefix = participation.role?.trim() || entityTableBaseName(referencedEntity);
    const { columns: fkColumns, columnIds } = migratePrimaryKeyColumns(
      tableId,
      referencedTable,
      prefix,
      participation.id,
      registry,
      pushIssue,
      [association.id, participation.id],
    );
    // Les colonnes de références d'une table associative sont non nullables
    // par défaut : une ligne de jonction n'existe que pour relier des
    // occurrences bien définies des deux côtés.
    for (const column of fkColumns) column.nullable = false;
    columns.push(...fkColumns);
    primaryKey.push(...columnIds);

    foreignKeys.push({
      id: `fk:${tableId}:${participation.id}`,
      name: reserveConstraintNameWithIssue(
        registry,
        pushIssue,
        `fk_${tableName}_${referencedTable.name}`,
        [association.id, participation.id],
      ),
      columnIds,
      referencedTableId: referencedTable.id,
      referencedColumnIds: referencedTable.primaryKey,
      nullable: false,
      unique: false,
      sourceAssociationId: association.id,
    });
  }

  const table: LogicalTable = {
    id: tableId,
    name: tableName,
    sourceIds: [association.id],
    description: association.description,
    columns,
    primaryKey,
    foreignKeys,
    uniqueConstraints: [],
  };

  migrateAssociationAttributes(association, table, registry, pushIssue);

  if (association.participations.length > 2) {
    pushIssue({
      severity: 'info',
      code: 'NARY_ASSOCIATION_JUNCTION_TABLE_CREATED',
      message: `L'association n-aire « ${association.name} » (${association.participations.length} participations) a été transformée en une table associative générique ; une optimisation tenant compte des cardinalités spécifiques pourra être ajoutée ultérieurement.`,
      sourceIds: [association.id],
    });
  }

  return table;
}

/** Ajoute les attributs propres d'une association comme colonnes d'une table, dans leur ordre du MCD. */
function migrateAssociationAttributes(
  association: Association,
  table: LogicalTable,
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
): void {
  for (const attribute of association.attributes) {
    table.columns.push({
      id: `c:${table.id}:assocattr:${association.id}:${attribute.id}`,
      name: reserveColumnNameWithIssue(registry, pushIssue, table.id, attribute.name, [
        association.id,
        attribute.id,
      ]),
      dataType: attribute.dataType,
      nullable: !attribute.required,
      sourceId: attribute.id,
      origin: 'association-attribute',
      description: attribute.description,
    });
  }
}
