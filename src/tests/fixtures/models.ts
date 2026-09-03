/**
 * Fixtures de modèles conceptuels pour les tests (validation et
 * transformation MCD → MLD).
 */
import {
  createAssociation,
  createAttribute,
  createEntity,
  createParticipation,
} from '@/core/conceptual-model/factories';
import type { ConceptualModel } from '@/core/conceptual-model/types';
import type { DiagramComment, DiagramModel, DiagramNode } from '@/core/diagram/types';

/** CLIENT (0,N) — EFFECTUER — (1,1) COMMANDE : relation 1,N classique. */
export function oneToManyModel(): ConceptualModel {
  const client = createEntity({ name: 'CLIENT' });
  const commande = createEntity({ name: 'COMMANDE' });
  const effectuer = createAssociation({ name: 'EFFECTUER' });
  effectuer.participations = [
    createParticipation({ entityId: client.id, cardinality: { min: 0, max: 'N' } }),
    createParticipation({ entityId: commande.id, cardinality: { min: 1, max: 1 } }),
  ];
  return { entities: [client, commande], associations: [effectuer] };
}

/**
 * CLIENT (id composé code+version) (0,N) — EFFECTUER — (1,1) COMMANDE :
 * relation 1,N où le côté référencé a un identifiant composé.
 */
export function oneToManyCompositeKeyModel(): ConceptualModel {
  const client = createEntity({ name: 'CLIENT' });
  const codeAttribute = createAttribute({
    name: 'code',
    dataType: { kind: 'varchar', length: 10 },
    required: true,
  });
  const versionAttribute = createAttribute({
    name: 'version',
    dataType: { kind: 'integer' },
    required: true,
  });
  client.attributes.push(codeAttribute, versionAttribute);
  const primary = client.identifiers[0];
  // Remplace l'identifiant "id" par défaut par la clé composée (code, version).
  if (primary) primary.attributeIds = [codeAttribute.id, versionAttribute.id];

  const commande = createEntity({ name: 'COMMANDE' });
  const effectuer = createAssociation({ name: 'EFFECTUER' });
  effectuer.participations = [
    createParticipation({ entityId: client.id, cardinality: { min: 0, max: 'N' } }),
    createParticipation({ entityId: commande.id, cardinality: { min: 1, max: 1 } }),
  ];
  return { entities: [client, commande], associations: [effectuer] };
}

/** COMMANDE (1,N) — CONTENIR — (0,N) PRODUIT avec attribut porté : relation N,N. */
export function manyToManyModel(): ConceptualModel {
  const commande = createEntity({ name: 'COMMANDE' });
  const produit = createEntity({ name: 'PRODUIT' });
  const contenir = createAssociation({ name: 'CONTENIR' });
  contenir.attributes = [
    createAttribute({ name: 'quantite', dataType: { kind: 'integer' }, required: true }),
  ];
  contenir.participations = [
    createParticipation({ entityId: commande.id, cardinality: { min: 1, max: 'N' } }),
    createParticipation({ entityId: produit.id, cardinality: { min: 0, max: 'N' } }),
  ];
  return { entities: [commande, produit], associations: [contenir] };
}

/** PERSONNE (1,1) — POSSEDER — (0,1) PASSEPORT : relation 1,1 asymétrique. */
export function oneToOneModel(): ConceptualModel {
  const personne = createEntity({ name: 'PERSONNE' });
  const passeport = createEntity({ name: 'PASSEPORT' });
  const posseder = createAssociation({ name: 'POSSEDER' });
  posseder.participations = [
    createParticipation({ entityId: personne.id, cardinality: { min: 1, max: 1 } }),
    createParticipation({ entityId: passeport.id, cardinality: { min: 0, max: 1 } }),
  ];
  return { entities: [personne, passeport], associations: [posseder] };
}

/** PERSONNE (1,1) — MARIER — (1,1) PERSONNE : 1,1 symétrique obligatoire des deux côtés. */
export function oneToOneRequiredRequiredModel(): ConceptualModel {
  const conjointA = createEntity({ name: 'EPOUX' });
  const conjointB = createEntity({ name: 'EPOUSE' });
  const marier = createAssociation({ name: 'MARIER' });
  marier.participations = [
    createParticipation({ entityId: conjointA.id, cardinality: { min: 1, max: 1 } }),
    createParticipation({ entityId: conjointB.id, cardinality: { min: 1, max: 1 } }),
  ];
  return { entities: [conjointA, conjointB], associations: [marier] };
}

/** VEHICULE (0,1) — GARER — (0,1) PLACE_PARKING : 1,1 symétrique optionnelle des deux côtés. */
export function oneToOneOptionalOptionalModel(): ConceptualModel {
  const vehicule = createEntity({ name: 'VEHICULE' });
  const place = createEntity({ name: 'PLACE_PARKING' });
  const garer = createAssociation({ name: 'GARER' });
  garer.participations = [
    createParticipation({ entityId: vehicule.id, cardinality: { min: 0, max: 1 } }),
    createParticipation({ entityId: place.id, cardinality: { min: 0, max: 1 } }),
  ];
  return { entities: [vehicule, place], associations: [garer] };
}

/**
 * EMPLOYE — ENCADRER (réflexive 1,N) : un manager encadre 0..N subordonnés,
 * un subordonné est encadré par 0 ou 1 manager.
 */
export function reflexiveModel(): ConceptualModel {
  const employe = createEntity({ name: 'EMPLOYE' });
  const encadrer = createAssociation({ name: 'ENCADRER' });
  encadrer.participations = [
    createParticipation({
      entityId: employe.id,
      role: 'manager',
      cardinality: { min: 0, max: 'N' },
    }),
    createParticipation({
      entityId: employe.id,
      role: 'subordonne',
      cardinality: { min: 0, max: 1 },
    }),
  ];
  return { entities: [employe], associations: [encadrer] };
}

/**
 * EMPLOYE — COLLABORER (réflexive N,N) : un employé collabore avec 0..N
 * collègues, symétriquement.
 */
export function reflexiveManyToManyModel(): ConceptualModel {
  const employe = createEntity({ name: 'EMPLOYE' });
  const collaborer = createAssociation({ name: 'COLLABORER' });
  collaborer.participations = [
    createParticipation({
      entityId: employe.id,
      role: 'initiateur',
      cardinality: { min: 0, max: 'N' },
    }),
    createParticipation({
      entityId: employe.id,
      role: 'collegue',
      cardinality: { min: 0, max: 'N' },
    }),
  ];
  return { entities: [employe], associations: [collaborer] };
}

/** ENSEIGNANT / MATIERE / CLASSE — ENSEIGNER : association ternaire. */
export function nAryModel(): ConceptualModel {
  const enseignant = createEntity({ name: 'ENSEIGNANT' });
  const matiere = createEntity({ name: 'MATIERE' });
  const classe = createEntity({ name: 'CLASSE' });
  const enseigner = createAssociation({ name: 'ENSEIGNER' });
  enseigner.participations = [
    createParticipation({ entityId: enseignant.id, cardinality: { min: 1, max: 'N' } }),
    createParticipation({ entityId: matiere.id, cardinality: { min: 0, max: 'N' } }),
    createParticipation({ entityId: classe.id, cardinality: { min: 0, max: 'N' } }),
  ];
  return { entities: [enseignant, matiere, classe], associations: [enseigner] };
}

/** LIGNE_COMMANDE avec identifiant primaire composé de deux attributs. */
export function compositeIdentifierModel(): ConceptualModel {
  const ligne = createEntity({ name: 'LIGNE_COMMANDE' });
  const noLigne = createAttribute({
    name: 'no_ligne',
    dataType: { kind: 'integer' },
    required: true,
  });
  ligne.attributes.push(noLigne);
  const primary = ligne.identifiers[0];
  if (primary) primary.attributeIds.push(noLigne.id);
  return { entities: [ligne], associations: [] };
}

/**
 * Deux entités dont les noms se normalisent vers le même identifiant SQL
 * (« date début » / « date-debut »), pour tester la résolution de collision.
 */
export function nameCollisionModel(): ConceptualModel {
  const first = createEntity({ name: 'date début' });
  const second = createEntity({ name: 'date-debut' });
  return { entities: [first, second], associations: [] };
}

/** Modèle volontairement incohérent : cumul d'erreurs de validation. */
export function invalidModel(): ConceptualModel {
  const sansIdentifiant = createEntity({ name: 'SANS_ID' });
  sansIdentifiant.identifiers = [];
  const doublonA = createEntity({ name: 'DOUBLON' });
  const doublonB = createEntity({ name: 'DOUBLON' });
  const associationVide = createAssociation({ name: '' });
  return {
    entities: [sansIdentifiant, doublonA, doublonB],
    associations: [associationVide],
  };
}

export interface LargeModelOptions {
  entityCount?: number;
  associationCount?: number;
  attributesPerEntity?: number;
}

/**
 * Grand modèle valide et déterministe (mêmes ids/noms à chaque appel), pour
 * les tests et vérifications de performance sur un modèle de grande taille
 * (v0.5, voir docs/performance.md) — une centaine d'entités, une
 * cinquantaine d'associations de plus, plusieurs centaines d'attributs.
 * Chaque association relie deux entités distinctes choisies de façon
 * déterministe (pas de dépendance à `Math.random`), avec une cardinalité
 * 1,N classique — suffisant pour exercer la validation, la transformation
 * MCD → MLD et la génération SQL sans configuration particulière.
 */
export function largeModel(options: LargeModelOptions = {}): ConceptualModel {
  const entityCount = options.entityCount ?? 100;
  const associationCount = options.associationCount ?? 150;
  const attributesPerEntity = options.attributesPerEntity ?? 5;

  const entities = Array.from({ length: entityCount }, (_, index) => {
    const entity = createEntity({ name: `ENTITE_${index}` });
    for (let a = 0; a < attributesPerEntity; a += 1) {
      entity.attributes.push(
        createAttribute({ name: `attribut_${a}`, dataType: { kind: 'varchar', length: 100 } }),
      );
    }
    return entity;
  });

  const associations = Array.from({ length: associationCount }, (_, index) => {
    const from = entities[index % entityCount]!;
    const to = entities[(index + 1) % entityCount]!;
    const association = createAssociation({ name: `ASSOCIATION_${index}` });
    association.participations = [
      createParticipation({ entityId: from.id, cardinality: { min: 0, max: 'N' } }),
      createParticipation({ entityId: to.id, cardinality: { min: 1, max: 1 } }),
    ];
    return association;
  });

  return { entities, associations };
}

export interface LargeDiagramOptions {
  /** Nombre de colonnes de la grille de placement initial. */
  columns?: number;
  /** Pas horizontal/vertical entre deux nœuds, en pixels. */
  spacing?: number;
  /** Nombre de commentaires graphiques ajoutés au diagramme. */
  commentCount?: number;
}

/**
 * Diagramme déterministe correspondant à un `largeModel()` : un nœud par
 * entité et par association, disposés en grille, plus quelques commentaires
 * graphiques. Sert aux mesures de performance du glisser-déposer (v0.5.1,
 * voir docs/canvas-performance.md) : environ 250 nœuds et plusieurs
 * centaines d'arêtes de participation.
 */
export function largeDiagram(
  model: ConceptualModel,
  options: LargeDiagramOptions = {},
): DiagramModel {
  const columns = options.columns ?? 16;
  const spacing = options.spacing ?? 320;
  const commentCount = options.commentCount ?? 4;

  const nodes: DiagramNode[] = [];
  const comments: DiagramComment[] = [];
  let index = 0;
  const place = () => {
    const position = {
      x: (index % columns) * spacing,
      y: Math.floor(index / columns) * spacing,
    };
    index += 1;
    return position;
  };

  for (const entity of model.entities) {
    nodes.push({
      id: `node-entity-${entity.id}`,
      modelId: entity.id,
      nodeType: 'entity',
      position: place(),
    });
  }
  for (const association of model.associations) {
    nodes.push({
      id: `node-association-${association.id}`,
      modelId: association.id,
      nodeType: 'association',
      position: place(),
    });
  }
  for (let c = 0; c < commentCount; c += 1) {
    const commentId = `comment-${c}`;
    comments.push({ id: commentId, text: `Commentaire ${c}` });
    nodes.push({
      id: `node-comment-${commentId}`,
      modelId: commentId,
      nodeType: 'comment',
      position: place(),
    });
  }

  return { nodes, viewport: { x: 0, y: 0, zoom: 1 }, comments };
}
