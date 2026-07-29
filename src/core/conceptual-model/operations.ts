/**
 * Fonctions pures d'interrogation et de manipulation du modèle conceptuel.
 *
 * Les stores Zustand appellent ces fonctions ; la logique métier reste ainsi
 * testable sans interface.
 */
import type { Association, ConceptualModel, Entity } from './types';

export function findEntity(model: ConceptualModel, entityId: string): Entity | undefined {
  return model.entities.find((entity) => entity.id === entityId);
}

export function findAssociation(
  model: ConceptualModel,
  associationId: string,
): Association | undefined {
  return model.associations.find((association) => association.id === associationId);
}

/**
 * Associations dont au moins une participation référence l'entité donnée.
 * Utilisé pour empêcher la suppression silencieuse d'une entité référencée.
 */
export function associationsReferencingEntity(
  model: ConceptualModel,
  entityId: string,
): Association[] {
  return model.associations.filter((association) =>
    association.participations.some((participation) => participation.entityId === entityId),
  );
}

export function isEntityReferenced(model: ConceptualModel, entityId: string): boolean {
  return associationsReferencingEntity(model, entityId).length > 0;
}

/**
 * Retire un attribut d'une entité ainsi que toutes ses références dans les
 * identifiants de cette entité (jamais de référence pendante).
 */
export function removeAttributeFromEntity(entity: Entity, attributeId: string): void {
  entity.attributes = entity.attributes.filter((attribute) => attribute.id !== attributeId);
  for (const identifier of entity.identifiers) {
    identifier.attributeIds = identifier.attributeIds.filter((id) => id !== attributeId);
  }
}

/** L'identifiant primaire d'une entité, s'il existe. */
export function primaryIdentifier(entity: Entity): Entity['identifiers'][number] | undefined {
  return entity.identifiers.find((identifier) => identifier.primary);
}

/** Indique si un attribut appartient à l'identifiant primaire de son entité. */
export function isPrimaryAttribute(entity: Entity, attributeId: string): boolean {
  return primaryIdentifier(entity)?.attributeIds.includes(attributeId) ?? false;
}

/**
 * Ajoute ou retire un attribut de l'identifiant primaire.
 * Crée l'identifiant primaire s'il n'existe pas encore.
 */
export function togglePrimaryAttribute(
  entity: Entity,
  attributeId: string,
  createIdentifierId: () => string,
): void {
  let identifier = primaryIdentifier(entity);
  if (!identifier) {
    identifier = { id: createIdentifierId(), attributeIds: [], primary: true };
    entity.identifiers.push(identifier);
  }
  if (identifier.attributeIds.includes(attributeId)) {
    identifier.attributeIds = identifier.attributeIds.filter((id) => id !== attributeId);
  } else {
    identifier.attributeIds.push(attributeId);
  }
}
