/**
 * Types de données conceptuels de Modrise.
 *
 * Un type conceptuel décrit la nature d'un attribut du MCD indépendamment
 * de tout dialecte SQL. La conversion vers un type physique est de la
 * responsabilité des dialectes SQL (`src/core/sql`).
 */

export type ConceptualDataType =
  | { kind: 'integer' }
  | { kind: 'bigint' }
  | { kind: 'decimal'; precision: number; scale: number }
  | { kind: 'varchar'; length: number }
  | { kind: 'text' }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'datetime' }
  | { kind: 'uuid' };

export type ConceptualDataTypeKind = ConceptualDataType['kind'];

export const DATA_TYPE_KINDS: readonly ConceptualDataTypeKind[] = [
  'integer',
  'bigint',
  'decimal',
  'varchar',
  'text',
  'boolean',
  'date',
  'datetime',
  'uuid',
];

const DATA_TYPE_LABELS: Record<ConceptualDataTypeKind, string> = {
  integer: 'Entier',
  bigint: 'Entier long',
  decimal: 'Décimal',
  varchar: 'Chaîne',
  text: 'Texte',
  boolean: 'Booléen',
  date: 'Date',
  datetime: 'Date et heure',
  uuid: 'UUID',
};

/** Libellé lisible d'un genre de type (pour les listes déroulantes). */
export function dataTypeKindLabel(kind: ConceptualDataTypeKind): string {
  return DATA_TYPE_LABELS[kind];
}

/**
 * Représentation courte d'un type, telle qu'affichée dans le diagramme.
 * Exemples : `integer`, `varchar(100)`, `decimal(10,2)`.
 */
export function formatDataType(type: ConceptualDataType): string {
  switch (type.kind) {
    case 'decimal':
      return `decimal(${type.precision},${type.scale})`;
    case 'varchar':
      return `varchar(${type.length})`;
    default:
      return type.kind;
  }
}

export interface DataTypeIssue {
  code: 'varchar-invalid-length' | 'decimal-invalid-precision' | 'decimal-invalid-scale';
  message: string;
}

/**
 * Valide les options d'un type conceptuel (longueur, précision, échelle).
 * Retourne la liste des problèmes ; une liste vide signifie que le type est valide.
 */
export function validateDataType(type: ConceptualDataType): DataTypeIssue[] {
  const issues: DataTypeIssue[] = [];
  if (type.kind === 'varchar') {
    if (!Number.isInteger(type.length) || type.length <= 0) {
      issues.push({
        code: 'varchar-invalid-length',
        message: `La longueur d'un varchar doit être un entier strictement positif (reçu : ${type.length}).`,
      });
    }
  }
  if (type.kind === 'decimal') {
    if (!Number.isInteger(type.precision) || type.precision <= 0) {
      issues.push({
        code: 'decimal-invalid-precision',
        message: `La précision d'un décimal doit être un entier strictement positif (reçu : ${type.precision}).`,
      });
    }
    if (!Number.isInteger(type.scale) || type.scale < 0) {
      issues.push({
        code: 'decimal-invalid-scale',
        message: `L'échelle d'un décimal doit être un entier positif ou nul (reçu : ${type.scale}).`,
      });
    } else if (Number.isInteger(type.precision) && type.scale > type.precision) {
      issues.push({
        code: 'decimal-invalid-scale',
        message: `L'échelle (${type.scale}) ne peut pas dépasser la précision (${type.precision}).`,
      });
    }
  }
  return issues;
}

/** Type par défaut proposé pour un genre donné (valeurs sûres). */
export function defaultDataType(kind: ConceptualDataTypeKind): ConceptualDataType {
  switch (kind) {
    case 'decimal':
      return { kind: 'decimal', precision: 10, scale: 2 };
    case 'varchar':
      return { kind: 'varchar', length: 255 };
    default:
      return { kind };
  }
}
