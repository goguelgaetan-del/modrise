/**
 * Moteur de validation du modèle conceptuel.
 *
 * Indépendant de l'interface : prend un `ConceptualModel`, retourne des
 * `ValidationIssue`. Chaque règle est identifiée par un code stable de
 * `VALIDATION_CODES` et testée indépendamment.
 */
import { validateDataType } from '../conceptual-model/data-types';
import type {
  Association,
  ConceptualModel,
  Entity,
  Participation,
} from '../conceptual-model/types';
import { isSqlReservedWord, toDatabaseIdentifier } from '../sql/naming';
import type { NamingConvention } from '../sql/naming';
import { DEFAULT_NAMING_CONVENTION } from '../sql/naming';
import type { ValidationIssue } from './types';
import { VALIDATION_CODES as CODES } from './types';

const MAX_NAME_LENGTH = 64;

export interface ValidateOptions {
  namingConvention?: NamingConvention;
}

export function validateConceptualModel(
  model: ConceptualModel,
  options: ValidateOptions = {},
): ValidationIssue[] {
  const convention = options.namingConvention ?? DEFAULT_NAMING_CONVENTION;
  const issues: ValidationIssue[] = [];
  let sequence = 0;
  const push = (issue: Omit<ValidationIssue, 'id'>) => {
    sequence += 1;
    issues.push({ id: `issue-${sequence}`, ...issue });
  };

  const entityIds = new Set(model.entities.map((entity) => entity.id));

  checkDuplicateEntityNames(model, push);
  for (const entity of model.entities) {
    checkEntity(entity, push);
  }
  for (const association of model.associations) {
    checkAssociation(association, model, entityIds, push);
  }
  checkNamingWarnings(model, convention, push);

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error');
}

type Push = (issue: Omit<ValidationIssue, 'id'>) => void;

function checkDuplicateEntityNames(model: ConceptualModel, push: Push): void {
  const byName = new Map<string, Entity[]>();
  for (const entity of model.entities) {
    const key = entity.name.trim().toLowerCase();
    if (key.length === 0) continue;
    byName.set(key, [...(byName.get(key) ?? []), entity]);
  }
  for (const entities of byName.values()) {
    if (entities.length > 1) {
      for (const entity of entities) {
        push({
          severity: 'error',
          code: CODES.duplicateEntityName,
          message: `Le nom d'entité « ${entity.name} » est utilisé ${entities.length} fois.`,
          targetType: 'entity',
          targetId: entity.id,
        });
      }
    }
  }
}

function checkEntity(entity: Entity, push: Push): void {
  if (entity.name.trim().length === 0) {
    push({
      severity: 'error',
      code: CODES.entityWithoutName,
      message: 'Une entité ne possède pas de nom.',
      targetType: 'entity',
      targetId: entity.id,
    });
  }

  const primaryIdentifiers = entity.identifiers.filter((identifier) => identifier.primary);
  if (primaryIdentifiers.length === 0) {
    push({
      severity: 'error',
      code: CODES.entityWithoutPrimaryIdentifier,
      message: `L'entité « ${entity.name} » n'a pas d'identifiant primaire.`,
      targetType: 'entity',
      targetId: entity.id,
    });
  } else if (primaryIdentifiers.length > 1) {
    push({
      severity: 'error',
      code: CODES.multiplePrimaryIdentifiers,
      message: `L'entité « ${entity.name} » a ${primaryIdentifiers.length} identifiants marqués comme primaires.`,
      targetType: 'entity',
      targetId: entity.id,
    });
  }

  const attributeIds = new Set(entity.attributes.map((attribute) => attribute.id));
  for (const identifier of entity.identifiers) {
    if (identifier.attributeIds.length === 0) {
      push({
        severity: 'error',
        code: CODES.emptyIdentifier,
        message: `Un identifiant de l'entité « ${entity.name} » ne référence aucun attribut.`,
        targetType: 'identifier',
        targetId: identifier.id,
      });
    }
    for (const attributeId of identifier.attributeIds) {
      if (!attributeIds.has(attributeId)) {
        push({
          severity: 'error',
          code: CODES.identifierUnknownAttribute,
          message: `Un identifiant de l'entité « ${entity.name} » référence un attribut inexistant.`,
          targetType: 'identifier',
          targetId: identifier.id,
        });
      }
    }
  }

  checkAttributes(entity.attributes, 'entity', entity.name, push);

  const identifierAttributeIds = new Set(
    entity.identifiers.flatMap((identifier) => identifier.attributeIds),
  );
  const ownAttributes = entity.attributes.filter(
    (attribute) => !identifierAttributeIds.has(attribute.id),
  );
  if (entity.attributes.length > 0 && ownAttributes.length === 0) {
    push({
      severity: 'warning',
      code: CODES.entityWithoutOwnAttributes,
      message: `L'entité « ${entity.name} » n'a aucun attribut en dehors de son identifiant.`,
      targetType: 'entity',
      targetId: entity.id,
    });
  }
}

function checkAttributes(
  attributes: Entity['attributes'],
  ownerType: 'entity' | 'association',
  ownerName: string,
  push: Push,
): void {
  const ownerLabel = ownerType === 'entity' ? `l'entité` : `l'association`;
  const byName = new Map<string, number>();
  for (const attribute of attributes) {
    const key = attribute.name.trim().toLowerCase();
    if (key.length > 0) {
      byName.set(key, (byName.get(key) ?? 0) + 1);
    }
  }
  for (const attribute of attributes) {
    if (attribute.name.trim().length === 0) {
      push({
        severity: 'error',
        code: CODES.attributeWithoutName,
        message: `Un attribut de ${ownerLabel} « ${ownerName} » ne possède pas de nom.`,
        targetType: 'attribute',
        targetId: attribute.id,
      });
    } else if ((byName.get(attribute.name.trim().toLowerCase()) ?? 0) > 1) {
      push({
        severity: 'error',
        code: CODES.duplicateAttributeName,
        message: `L'attribut « ${attribute.name} » est dupliqué dans ${ownerLabel} « ${ownerName} ».`,
        targetType: 'attribute',
        targetId: attribute.id,
      });
    }

    for (const typeIssue of validateDataType(attribute.dataType)) {
      const code =
        typeIssue.code === 'varchar-invalid-length'
          ? CODES.invalidVarcharLength
          : typeIssue.code === 'decimal-invalid-precision'
            ? CODES.invalidDecimalPrecision
            : CODES.invalidDecimalScale;
      push({
        severity: 'error',
        code,
        message: `Attribut « ${attribute.name} » (${ownerLabel} « ${ownerName} ») : ${typeIssue.message}`,
        targetType: 'attribute',
        targetId: attribute.id,
      });
    }
  }
}

function isValidCardinality(participation: Participation): boolean {
  const { min, max } = participation.cardinality;
  return (min === 0 || min === 1) && (max === 1 || max === 'N');
}

function checkAssociation(
  association: Association,
  model: ConceptualModel,
  entityIds: Set<string>,
  push: Push,
): void {
  if (association.name.trim().length === 0) {
    push({
      severity: 'error',
      code: CODES.associationWithoutName,
      message: 'Une association ne possède pas de nom.',
      targetType: 'association',
      targetId: association.id,
    });
  }

  if (association.participations.length < 2) {
    push({
      severity: 'error',
      code: CODES.associationTooFewParticipations,
      message: `L'association « ${association.name} » doit relier au moins deux participations (${association.participations.length} actuellement).`,
      targetType: 'association',
      targetId: association.id,
    });
  }

  for (const participation of association.participations) {
    if (!entityIds.has(participation.entityId)) {
      push({
        severity: 'error',
        code: CODES.participationUnknownEntity,
        message: `Une participation de l'association « ${association.name} » référence une entité inexistante.`,
        targetType: 'participation',
        targetId: participation.id,
      });
    }
    if (!isValidCardinality(participation)) {
      push({
        severity: 'error',
        code: CODES.invalidCardinality,
        message: `Une participation de l'association « ${association.name} » a une cardinalité invalide.`,
        targetType: 'participation',
        targetId: participation.id,
      });
    }
  }

  checkAttributes(association.attributes, 'association', association.name, push);
  checkReflexiveRoles(association, push);
  checkAmbiguousOneToOne(association, model, push);
}

/** Association réflexive : les rôles doivent distinguer les participations. */
function checkReflexiveRoles(association: Association, push: Push): void {
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
      push({
        severity: 'warning',
        code: CODES.reflexiveAssociationWithoutRoles,
        message: `L'association réflexive « ${association.name} » devrait porter des rôles distincts sur chaque participation (nécessaires pour nommer les futures colonnes).`,
        targetType: 'association',
        targetId: association.id,
      });
    }
  }
}

/**
 * Association binaire dont les deux côtés ont une cardinalité max de 1 et la
 * même obligation : le côté porteur de la clé étrangère sera choisi
 * arbitrairement lors de la transformation.
 */
function checkAmbiguousOneToOne(
  association: Association,
  _model: ConceptualModel,
  push: Push,
): void {
  if (association.participations.length !== 2) return;
  const [a, b] = association.participations;
  if (!a || !b) return;
  if (
    a.cardinality.max === 1 &&
    b.cardinality.max === 1 &&
    a.cardinality.min === b.cardinality.min
  ) {
    push({
      severity: 'warning',
      code: CODES.ambiguousOneToOne,
      message: `L'association 1,1 « ${association.name} » est symétrique : le côté qui portera la clé étrangère sera choisi selon une règle stable, vérifiez que c'est le bon.`,
      targetType: 'association',
      targetId: association.id,
    });
  }
}

/** Avertissements liés aux noms : convention SQL, mots réservés, longueur, collisions. */
function checkNamingWarnings(
  model: ConceptualModel,
  convention: NamingConvention,
  push: Push,
): void {
  interface NamedObject {
    name: string;
    targetType: 'entity' | 'association';
    targetId: string;
  }
  const namedObjects: NamedObject[] = [
    ...model.entities.map((entity) => ({
      name: entity.name,
      targetType: 'entity' as const,
      targetId: entity.id,
    })),
    ...model.associations.map((association) => ({
      name: association.name,
      targetType: 'association' as const,
      targetId: association.id,
    })),
  ];

  const generatedNames = new Map<string, NamedObject[]>();
  for (const object of namedObjects) {
    const trimmed = object.name.trim();
    if (trimmed.length === 0) continue;

    if (trimmed.length > MAX_NAME_LENGTH) {
      push({
        severity: 'warning',
        code: CODES.nameTooLong,
        message: `Le nom « ${trimmed.slice(0, 30)}… » dépasse ${MAX_NAME_LENGTH} caractères.`,
        targetType: object.targetType,
        targetId: object.targetId,
      });
    }

    if (isSqlReservedWord(trimmed)) {
      push({
        severity: 'warning',
        code: CODES.sqlReservedWord,
        message: `Le nom « ${trimmed} » est probablement un mot réservé SQL ; il sera échappé ou suffixé à la génération.`,
        targetType: object.targetType,
        targetId: object.targetId,
      });
    } else if (/[^a-zA-Z0-9_]/.test(trimmed)) {
      push({
        severity: 'warning',
        code: CODES.nameNotSqlFriendly,
        message: `Le nom « ${trimmed} » contient des caractères qui seront transformés pour produire un identifiant SQL (« ${toDatabaseIdentifier(trimmed, convention)} »).`,
        targetType: object.targetType,
        targetId: object.targetId,
      });
    }

    const generated = toDatabaseIdentifier(trimmed, convention).toLowerCase();
    generatedNames.set(generated, [...(generatedNames.get(generated) ?? []), object]);
  }

  for (const objects of generatedNames.values()) {
    // Ne signale la collision que si elle provient d'objets aux noms distincts :
    // les doublons stricts sont déjà couverts par duplicate-entity-name.
    const distinctNames = new Set(objects.map((o) => o.name.trim().toLowerCase()));
    if (objects.length > 1 && distinctNames.size > 1) {
      for (const object of objects) {
        push({
          severity: 'warning',
          code: CODES.sqlNameCollision,
          message: `Le nom « ${object.name} » produit le même identifiant SQL que ${objects.length - 1} autre(s) élément(s).`,
          targetType: object.targetType,
          targetId: object.targetId,
        });
      }
    }
  }
}
