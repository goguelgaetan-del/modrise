/**
 * Nommage du modèle logique : réservation déterministe des noms de tables,
 * colonnes et contraintes, avec détection de collision.
 *
 * Centralisé ici pour ne pas disperser les règles de nommage dans les
 * différents transformateurs (entités, 1,N, 1,1, associatives).
 */
import type { Association, Entity } from '../conceptual-model/types';
import type { NamingConvention } from '../sql/naming';
import { toDatabaseIdentifier } from '../sql/naming';
import type { LogicalTransformationIssue } from '../logical-model/types';

/** Limite conservatrice, alignée sur la contrainte la plus stricte des dialectes visés (PostgreSQL : 63). */
const MAX_CONSTRAINT_NAME_LENGTH = 63;
/** Marge laissée pour qu'un éventuel suffixe de désambiguïsation (`_2`, `_3`…) tienne dans la limite. */
const CONSTRAINT_TRUNCATION_LENGTH = 55;

export interface NameReservation {
  name: string;
  /** `true` si le nom demandé était déjà pris et qu'un suffixe a été ajouté. */
  collided: boolean;
}

/**
 * Réserve un nom dans un espace de noms donné (insensible à la casse) :
 * renvoie le nom tel quel s'il est libre, sinon lui ajoute un suffixe
 * numérique stable (`_2`, `_3`…) jusqu'à trouver un nom disponible.
 */
function reserveIn(scope: Set<string>, normalizedBaseName: string): NameReservation {
  const baseKey = normalizedBaseName.toLowerCase();
  if (!scope.has(baseKey)) {
    scope.add(baseKey);
    return { name: normalizedBaseName, collided: false };
  }
  let suffix = 2;
  let candidate: string;
  let candidateKey: string;
  do {
    candidate = `${normalizedBaseName}_${suffix}`;
    candidateKey = candidate.toLowerCase();
    suffix += 1;
  } while (scope.has(candidateKey));
  scope.add(candidateKey);
  return { name: candidate, collided: true };
}

/**
 * Registre de nommage local à une transformation (jamais partagé entre deux
 * appels de `transformToLogicalModel`, pour garantir un résultat pur).
 */
export class LogicalNameRegistry {
  private readonly convention: NamingConvention;
  private readonly tableNames = new Set<string>();
  private readonly columnNamesByTable = new Map<string, Set<string>>();
  private readonly constraintNames = new Set<string>();

  constructor(convention: NamingConvention) {
    this.convention = convention;
  }

  reserveTableName(baseName: string): NameReservation {
    return reserveIn(this.tableNames, toDatabaseIdentifier(baseName, this.convention));
  }

  reserveColumnName(tableId: string, baseName: string): NameReservation {
    let scope = this.columnNamesByTable.get(tableId);
    if (!scope) {
      scope = new Set<string>();
      this.columnNamesByTable.set(tableId, scope);
    }
    return reserveIn(scope, toDatabaseIdentifier(baseName, this.convention));
  }

  reserveConstraintName(baseName: string): NameReservation {
    const normalized = toDatabaseIdentifier(baseName, this.convention).slice(
      0,
      CONSTRAINT_TRUNCATION_LENGTH,
    );
    return reserveIn(this.constraintNames, normalized);
  }
}

export function entityTableBaseName(entity: Entity): string {
  return entity.name;
}

export function associationTableBaseName(association: Association): string {
  return association.name;
}

/** Nom de base d'une colonne migrée : `<préfixe>_<colonne référencée>`. */
export function foreignKeyColumnBaseName(prefix: string, referencedColumnName: string): string {
  return `${prefix}_${referencedColumnName}`;
}

type PushIssue = (issue: Omit<LogicalTransformationIssue, 'id'>) => void;

/** Réserve un nom de table et signale une collision éventuelle via `pushIssue`. */
export function reserveTableNameWithIssue(
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
  baseName: string,
  sourceIds: string[],
): string {
  const { name, collided } = registry.reserveTableName(baseName);
  if (collided) {
    pushIssue({
      severity: 'warning',
      code: 'SQL_NAME_COLLISION_RESOLVED',
      message: `Le nom de table généré à partir de « ${baseName} » entrait en collision avec une autre table ; « ${name} » a été utilisé à la place.`,
      sourceIds,
    });
  }
  return name;
}

export function reserveColumnNameWithIssue(
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
  tableId: string,
  baseName: string,
  sourceIds: string[],
): string {
  const { name, collided } = registry.reserveColumnName(tableId, baseName);
  if (collided) {
    pushIssue({
      severity: 'warning',
      code: 'SQL_NAME_COLLISION_RESOLVED',
      message: `Le nom de colonne généré à partir de « ${baseName} » entrait en collision avec une autre colonne de la même table ; « ${name} » a été utilisé à la place.`,
      sourceIds,
    });
  }
  return name;
}

export function reserveConstraintNameWithIssue(
  registry: LogicalNameRegistry,
  pushIssue: PushIssue,
  baseName: string,
  sourceIds: string[],
): string {
  const { name, collided } = registry.reserveConstraintName(baseName);
  if (collided) {
    pushIssue({
      severity: 'warning',
      code: 'SQL_NAME_COLLISION_RESOLVED',
      message: `Le nom de contrainte généré à partir de « ${baseName} » entrait en collision avec une autre contrainte ; « ${name} » a été utilisé à la place.`,
      sourceIds,
    });
  }
  if (baseName.length > MAX_CONSTRAINT_NAME_LENGTH) {
    pushIssue({
      severity: 'info',
      code: 'CONSTRAINT_NAME_TRUNCATED',
      message: `Le nom de contrainte généré à partir de « ${baseName} » dépassait ${MAX_CONSTRAINT_NAME_LENGTH} caractères et a été raccourci en « ${name} ».`,
      sourceIds,
    });
  }
  return name;
}
