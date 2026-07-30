/**
 * Fonctions pures d'interrogation et de manipulation du modèle conceptuel.
 *
 * Les stores Zustand appellent ces fonctions ; la logique métier reste ainsi
 * testable sans interface.
 */
import type { Association, ConceptualModel, Entity, Identifier } from './types';

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

/** Identifiants alternatifs (non primaires) d'une entité. */
export function alternateIdentifiers(entity: Entity): Identifier[] {
  return entity.identifiers.filter((identifier) => !identifier.primary);
}

/**
 * Indique si un attribut appartient à au moins un identifiant alternatif
 * (utilisé pour distinguer visuellement clé primaire / clé alternative /
 * simple unicité — ce sont trois statuts différents).
 */
export function isAlternateIdentifierAttribute(entity: Entity, attributeId: string): boolean {
  return alternateIdentifiers(entity).some((identifier) => identifier.attributeIds.includes(attributeId));
}

/** Crée un identifiant alternatif vide et l'ajoute à l'entité ; le retourne. */
export function addAlternateIdentifier(entity: Entity, createIdentifierId: () => string): Identifier {
  const identifier: Identifier = { id: createIdentifierId(), attributeIds: [], primary: false };
  entity.identifiers.push(identifier);
  return identifier;
}

/** Renomme un identifiant (primaire ou alternatif) ; un nom vide redevient « sans nom ». */
export function renameIdentifier(entity: Entity, identifierId: string, name: string): void {
  const identifier = entity.identifiers.find((i) => i.id === identifierId);
  if (!identifier) return;
  const trimmed = name.trim();
  identifier.name = trimmed || undefined;
}

/**
 * Supprime un identifiant alternatif. Un identifiant primaire n'est jamais
 * supprimé directement : il faut d'abord promouvoir un autre identifiant
 * (voir `promoteIdentifierToPrimary`), qui le convertit lui-même en
 * alternatif — une entité doit toujours posséder exactement un identifiant
 * primaire.
 */
export function removeIdentifier(entity: Entity, identifierId: string): void {
  const identifier = entity.identifiers.find((i) => i.id === identifierId);
  if (!identifier || identifier.primary) return;
  entity.identifiers = entity.identifiers.filter((i) => i.id !== identifierId);
}

/** Ajoute un attribut à un identifiant, sauf s'il y figure déjà. */
export function addAttributeToIdentifier(entity: Entity, identifierId: string, attributeId: string): void {
  const identifier = entity.identifiers.find((i) => i.id === identifierId);
  if (!identifier || identifier.attributeIds.includes(attributeId)) return;
  identifier.attributeIds.push(attributeId);
}

/** Retire un attribut d'un identifiant. */
export function removeAttributeFromIdentifier(
  entity: Entity,
  identifierId: string,
  attributeId: string,
): void {
  const identifier = entity.identifiers.find((i) => i.id === identifierId);
  if (!identifier) return;
  identifier.attributeIds = identifier.attributeIds.filter((id) => id !== attributeId);
}

/** Déplace un attribut d'un identifiant vers le haut ou le bas (ordre stable). */
export function moveIdentifierAttribute(
  entity: Entity,
  identifierId: string,
  attributeId: string,
  direction: 'up' | 'down',
): void {
  const identifier = entity.identifiers.find((i) => i.id === identifierId);
  if (!identifier) return;
  const index = identifier.attributeIds.indexOf(attributeId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= identifier.attributeIds.length) return;
  const [id] = identifier.attributeIds.splice(index, 1);
  if (!id) return;
  identifier.attributeIds.splice(target, 0, id);
}

/**
 * Promeut un identifiant alternatif en identifiant primaire. L'ancien
 * identifiant primaire devient automatiquement alternatif : une entité
 * possède toujours exactement un identifiant primaire.
 */
export function promoteIdentifierToPrimary(entity: Entity, identifierId: string): void {
  const target = entity.identifiers.find((i) => i.id === identifierId);
  if (!target || target.primary) return;
  for (const identifier of entity.identifiers) {
    identifier.primary = identifier.id === identifierId;
  }
}
