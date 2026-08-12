export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationTargetType =
  'project' | 'entity' | 'attribute' | 'identifier' | 'association' | 'participation';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  targetType: ValidationTargetType;
  targetId?: string;
}

/** Codes stables des règles de validation (référencés par les tests et l'UI). */
export const VALIDATION_CODES = {
  // Erreurs
  entityWithoutName: 'entity-without-name',
  duplicateEntityName: 'duplicate-entity-name',
  entityWithoutPrimaryIdentifier: 'entity-without-primary-identifier',
  multiplePrimaryIdentifiers: 'multiple-primary-identifiers',
  emptyIdentifier: 'empty-identifier',
  identifierUnknownAttribute: 'identifier-unknown-attribute',
  duplicateAttributeInIdentifier: 'duplicate-attribute-in-identifier',
  duplicateIdentifier: 'duplicate-identifier',
  duplicateIdentifierName: 'duplicate-identifier-name',
  attributeWithoutName: 'attribute-without-name',
  duplicateAttributeName: 'duplicate-attribute-name',
  associationWithoutName: 'association-without-name',
  associationTooFewParticipations: 'association-too-few-participations',
  participationUnknownEntity: 'participation-unknown-entity',
  invalidCardinality: 'invalid-cardinality',
  invalidVarcharLength: 'invalid-varchar-length',
  invalidDecimalPrecision: 'invalid-decimal-precision',
  invalidDecimalScale: 'invalid-decimal-scale',
  // Avertissements
  reflexiveAssociationWithoutRoles: 'reflexive-association-without-roles',
  nameNotSqlFriendly: 'name-not-sql-friendly',
  sqlReservedWord: 'sql-reserved-word',
  entityWithoutOwnAttributes: 'entity-without-own-attributes',
  nameTooLong: 'name-too-long',
  ambiguousOneToOne: 'ambiguous-one-to-one',
  sqlNameCollision: 'sql-name-collision',
} as const;
