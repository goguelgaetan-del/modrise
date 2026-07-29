/**
 * Modèle conceptuel de données (MCD) Merise.
 *
 * Ces types sont la source de vérité métier de Modrise. Ils ne dépendent
 * d'aucune bibliothèque d'interface (ni React, ni React Flow, ni Zustand)
 * afin de pouvoir être réutilisés dans une CLI, une API ou une application
 * desktop.
 */
import type { ConceptualDataType } from './data-types';

export interface ConceptualModel {
  entities: Entity[];
  associations: Association[];
}

export interface Entity {
  id: string;
  name: string;
  description?: string;
  attributes: Attribute[];
  identifiers: Identifier[];
}

export interface Attribute {
  id: string;
  name: string;
  dataType: ConceptualDataType;
  required: boolean;
  unique: boolean;
  description?: string;
}

/**
 * Identifiant d'entité : simple ou composé, primaire ou alternatif.
 * Une entité valide possède exactement un identifiant `primary`.
 */
export interface Identifier {
  id: string;
  name?: string;
  attributeIds: string[];
  primary: boolean;
}

export interface Association {
  id: string;
  name: string;
  description?: string;
  attributes: Attribute[];
  participations: Participation[];
}

/**
 * Participation d'une entité à une association.
 * Une association réflexive comporte plusieurs participations vers la même
 * entité, distinguées par leur `role`.
 */
export interface Participation {
  id: string;
  entityId: string;
  role?: string;
  cardinality: Cardinality;
}

export interface Cardinality {
  min: 0 | 1;
  max: 1 | 'N';
}

export const CARDINALITIES: readonly Cardinality[] = [
  { min: 0, max: 1 },
  { min: 1, max: 1 },
  { min: 0, max: 'N' },
  { min: 1, max: 'N' },
];

export function formatCardinality(cardinality: Cardinality): string {
  return `${cardinality.min},${cardinality.max}`;
}

export function parseCardinality(value: string): Cardinality | undefined {
  return CARDINALITIES.find((c) => formatCardinality(c) === value);
}
