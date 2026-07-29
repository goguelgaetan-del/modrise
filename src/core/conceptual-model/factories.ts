/**
 * Fabriques d'objets du modèle conceptuel, avec des valeurs par défaut sûres.
 */
import { createId } from '../id';
import { defaultDataType } from './data-types';
import type {
  Association,
  Attribute,
  Cardinality,
  ConceptualModel,
  Entity,
  Identifier,
  Participation,
} from './types';

export function createConceptualModel(): ConceptualModel {
  return { entities: [], associations: [] };
}

export interface CreateEntityOptions {
  name?: string;
  description?: string;
}

/**
 * Crée une entité avec un attribut identifiant par défaut (`id`, integer),
 * marqué comme identifiant primaire — une entité Merise doit toujours en
 * posséder un.
 */
export function createEntity(options: CreateEntityOptions = {}): Entity {
  const idAttribute = createAttribute({ name: 'id', required: true });
  return {
    id: createId(),
    name: options.name ?? 'NOUVELLE_ENTITE',
    description: options.description,
    attributes: [idAttribute],
    identifiers: [
      {
        id: createId(),
        attributeIds: [idAttribute.id],
        primary: true,
      },
    ],
  };
}

export interface CreateAttributeOptions {
  name?: string;
  dataType?: Attribute['dataType'];
  required?: boolean;
  unique?: boolean;
  description?: string;
}

export function createAttribute(options: CreateAttributeOptions = {}): Attribute {
  return {
    id: createId(),
    name: options.name ?? 'attribut',
    dataType: options.dataType ?? defaultDataType('varchar'),
    required: options.required ?? false,
    unique: options.unique ?? false,
    description: options.description,
  };
}

export interface CreateIdentifierOptions {
  name?: string;
  attributeIds?: string[];
  primary?: boolean;
}

export function createIdentifier(options: CreateIdentifierOptions = {}): Identifier {
  return {
    id: createId(),
    name: options.name,
    attributeIds: options.attributeIds ?? [],
    primary: options.primary ?? false,
  };
}

export interface CreateAssociationOptions {
  name?: string;
  description?: string;
  participations?: Participation[];
}

export function createAssociation(options: CreateAssociationOptions = {}): Association {
  return {
    id: createId(),
    name: options.name ?? 'NOUVELLE_ASSOCIATION',
    description: options.description,
    attributes: [],
    participations: options.participations ?? [],
  };
}

export interface CreateParticipationOptions {
  entityId: string;
  role?: string;
  cardinality?: Cardinality;
}

export function createParticipation(options: CreateParticipationOptions): Participation {
  return {
    id: createId(),
    entityId: options.entityId,
    role: options.role,
    // 0,N est la cardinalité la moins contraignante : elle n'introduit
    // aucune obligation tant que l'utilisateur n'a pas précisé son intention.
    cardinality: options.cardinality ?? { min: 0, max: 'N' },
  };
}
