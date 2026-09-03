/**
 * Fabrique commune aux projets d'exemple livrés avec Modrise.
 *
 * Deux exigences se rencontrent ici, et elles tirent dans des sens opposés.
 *
 * D'un côté, les fichiers `examples/*.merise.json` sont livrés : ils doivent
 * être **reproductibles**, sinon on ne peut pas vérifier qu'ils correspondent
 * encore au modèle décrit dans le code, et ils dérivent en silence. De
 * l'autre, charger un exemple depuis l'application crée un vrai projet, qui
 * doit avoir son propre identifiant et ses propres dates — sinon deux
 * chargements successifs écraseraient la même entrée IndexedDB.
 *
 * D'où la séparation : la **structure** (entités, attributs, identifiants,
 * associations, positions) est toujours déterministe, dérivée du contenu même
 * de la spécification ; seuls l'identité du projet et ses horodatages varient,
 * sauf en mode `frozen` utilisé pour l'export et les tests.
 *
 * Conséquence pratique : un exemple se décrit ici par des **noms**, jamais par
 * des identifiants recopiés à la main. Rattacher une participation à une
 * entité, c'est écrire `entity: 'CLIENT'` ; le reste est calculé.
 */
import type {
  Association,
  Attribute,
  Cardinality,
  Entity,
  Identifier,
  Participation,
} from '../conceptual-model/types';
import type { DiagramNode } from '../diagram/types';
import type { ModriseProject } from '../project/types';
import { createProject } from '../project/types';

export interface ExampleAttributeSpec {
  name: string;
  dataType: Attribute['dataType'];
  required?: boolean;
  unique?: boolean;
  description?: string;
}

export interface ExampleIdentifierSpec {
  /** Nom affiché de l'identifiant alternatif (le primaire n'en porte pas). */
  name: string;
  /** Attributs le composant, par nom, dans l'ordre. */
  attributes: string[];
}

export interface ExampleEntitySpec {
  name: string;
  description?: string;
  attributes: ExampleAttributeSpec[];
  /** Attributs (par nom) composant l'identifiant primaire — simple ou composé. */
  primaryKey: string[];
  /** Identifiants alternatifs éventuels. */
  alternateKeys?: ExampleIdentifierSpec[];
  position: { x: number; y: number };
}

export interface ExampleParticipationSpec {
  /** Nom de l'entité participante. */
  entity: string;
  role?: string;
  cardinality: Cardinality;
}

export interface ExampleAssociationSpec {
  name: string;
  description?: string;
  attributes?: ExampleAttributeSpec[];
  participations: ExampleParticipationSpec[];
  position: { x: number; y: number };
}

export interface ExampleSpec {
  /** Clé courte et stable : sert de préfixe aux identifiants et de nom de fichier. */
  key: string;
  name: string;
  description: string;
  entities: ExampleEntitySpec[];
  associations: ExampleAssociationSpec[];
}

export interface BuildExampleOptions {
  /**
   * Fige aussi l'identité du projet et ses horodatages. Réservé à l'export des
   * fichiers livrés et aux tests : un exemple chargé dans l'application doit
   * au contraire recevoir une identité neuve.
   */
  frozen?: boolean;
}

/** Horodatage des fichiers d'exemple livrés. Arbitraire, mais fixe. */
const FROZEN_TIMESTAMP = '2026-01-01T00:00:00.000Z';

/**
 * Identifiant stable dérivé d'un chemin logique (`hotel/entity/CLIENT`).
 *
 * Le format reste un UUID — le contrat public du format dit que les `id` sont
 * des UUID opaques, et on ne va pas le rompre pour la commodité d'un exemple.
 * La version 8 est celle réservée aux UUID construits sur mesure : la déclarer
 * est plus honnête que de se faire passer pour un v4 tiré au hasard.
 *
 * Le hachage n'a pas besoin d'être cryptographique — il doit seulement être
 * pur, stable dans le temps et sans collision sur quelques dizaines de chemins
 * courts, ce qu'un test vérifie sur l'ensemble des exemples livrés.
 */
export function deterministicId(path: string): string {
  const hex = [0, 1, 2, 3].map((round) => fnv1a(`${String(round)}:${path}`)).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `8${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

/** FNV-1a 32 bits, rendu sur 8 caractères hexadécimaux. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    // Multiplication par 16777619 en arithmétique 32 bits non signée.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildExample(spec: ExampleSpec, options: BuildExampleOptions = {}): ModriseProject {
  const id = (...parts: string[]): string => deterministicId([spec.key, ...parts].join('/'));

  const entities = spec.entities.map((entitySpec) => buildEntity(spec.key, entitySpec, id));
  const entityIdsByName = new Map(
    spec.entities.map((entitySpec, index) => {
      const entity = entities[index];
      if (!entity) throw new Error(`Entité manquante à l'index ${String(index)}.`);
      return [entitySpec.name, entity.id];
    }),
  );

  const associations = spec.associations.map((associationSpec) =>
    buildAssociation(associationSpec, entityIdsByName, id),
  );

  const nodes: DiagramNode[] = [
    ...spec.entities.map((entitySpec, index) =>
      buildNode(
        id('node', 'entity', entitySpec.name),
        entities[index],
        'entity',
        entitySpec.position,
      ),
    ),
    ...spec.associations.map((associationSpec, index) =>
      buildNode(
        id('node', 'association', associationSpec.name),
        associations[index],
        'association',
        associationSpec.position,
      ),
    ),
  ];

  const project = createProject({ name: spec.name, description: spec.description });
  project.conceptualModel.entities = entities;
  project.conceptualModel.associations = associations;
  project.diagram.nodes = nodes;

  if (options.frozen) {
    project.id = id('project');
    project.createdAt = FROZEN_TIMESTAMP;
    project.updatedAt = FROZEN_TIMESTAMP;
  }

  return project;
}

function buildEntity(
  key: string,
  spec: ExampleEntitySpec,
  id: (...parts: string[]) => string,
): Entity {
  const attributes: Attribute[] = spec.attributes.map((attribute) => ({
    id: id('attribute', spec.name, attribute.name),
    name: attribute.name,
    dataType: attribute.dataType,
    required: attribute.required ?? false,
    unique: attribute.unique ?? false,
    description: attribute.description,
  }));

  const attributeIdByName = new Map(
    spec.attributes.map((attribute, index) => {
      const built = attributes[index];
      if (!built) throw new Error(`Attribut manquant à l'index ${String(index)}.`);
      return [attribute.name, built.id];
    }),
  );

  const resolve = (names: string[], owner: string): string[] =>
    names.map((name) => {
      const attributeId = attributeIdByName.get(name);
      if (!attributeId) {
        throw new Error(
          `Exemple « ${key} » : l'identifiant « ${owner} » de ${spec.name} référence un attribut inconnu « ${name} ».`,
        );
      }
      return attributeId;
    });

  const identifiers: Identifier[] = [
    {
      id: id('identifier', spec.name, 'primaire'),
      attributeIds: resolve(spec.primaryKey, 'primaire'),
      primary: true,
    },
    ...(spec.alternateKeys ?? []).map((alternate) => ({
      id: id('identifier', spec.name, alternate.name),
      name: alternate.name,
      attributeIds: resolve(alternate.attributes, alternate.name),
      primary: false,
    })),
  ];

  return {
    id: id('entity', spec.name),
    name: spec.name,
    description: spec.description,
    attributes,
    identifiers,
  };
}

function buildAssociation(
  spec: ExampleAssociationSpec,
  entityIdsByName: ReadonlyMap<string, string>,
  id: (...parts: string[]) => string,
): Association {
  const participations: Participation[] = spec.participations.map((participation, index) => {
    const entityId = entityIdsByName.get(participation.entity);
    if (!entityId) {
      throw new Error(
        `L'association ${spec.name} référence une entité inconnue « ${participation.entity} ».`,
      );
    }
    // L'index fait partie du chemin : une association réflexive relie deux fois
    // la même entité, et ses deux participations ne peuvent pas partager un id.
    return {
      id: id('participation', spec.name, String(index)),
      entityId,
      role: participation.role,
      cardinality: participation.cardinality,
    };
  });

  return {
    id: id('association', spec.name),
    name: spec.name,
    description: spec.description,
    attributes: (spec.attributes ?? []).map((attribute) => ({
      id: id('attribute', spec.name, attribute.name),
      name: attribute.name,
      dataType: attribute.dataType,
      required: attribute.required ?? false,
      unique: attribute.unique ?? false,
      description: attribute.description,
    })),
    participations,
  };
}

function buildNode(
  nodeId: string,
  model: { id: string } | undefined,
  nodeType: 'entity' | 'association',
  position: { x: number; y: number },
): DiagramNode {
  if (!model) throw new Error('Nœud sans modèle associé.');
  return { id: nodeId, modelId: model.id, nodeType, position };
}
