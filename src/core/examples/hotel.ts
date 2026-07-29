/**
 * Projet d'exemple « Gestion d'hôtel ».
 *
 * Démontre : identifiants primaires, plusieurs types de données, une
 * relation 1,N (CHAMBRE — CONCERNER — RESERVATION) et une association
 * porteuse d'attributs prêtes pour la future génération MLD/SQL.
 */
import { createAttribute, createEntity, createParticipation } from '../conceptual-model/factories';
import type { Association, Entity } from '../conceptual-model/types';
import type { ModriseProject } from '../project/types';
import { createProject } from '../project/types';
import { createId } from '../id';

export function createHotelExampleProject(): ModriseProject {
  const project = createProject({
    name: "Gestion d'hôtel",
    description: "Projet d'exemple : clients, chambres et réservations.",
  });

  const client = buildEntity('CLIENT', [
    { name: 'id_client', dataType: { kind: 'integer' }, identifier: true },
    { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
    { name: 'prenom', dataType: { kind: 'varchar', length: 100 }, required: true },
    { name: 'email', dataType: { kind: 'varchar', length: 255 }, unique: true },
    { name: 'telephone', dataType: { kind: 'varchar', length: 20 } },
  ]);

  const chambre = buildEntity('CHAMBRE', [
    { name: 'id_chambre', dataType: { kind: 'integer' }, identifier: true },
    { name: 'numero', dataType: { kind: 'varchar', length: 10 }, required: true, unique: true },
    { name: 'type', dataType: { kind: 'varchar', length: 50 }, required: true },
    { name: 'etage', dataType: { kind: 'integer' } },
    { name: 'prix_nuit', dataType: { kind: 'decimal', precision: 8, scale: 2 }, required: true },
  ]);

  const reservation = buildEntity('RESERVATION', [
    { name: 'id_reservation', dataType: { kind: 'integer' }, identifier: true },
    { name: 'date_arrivee', dataType: { kind: 'date' }, required: true },
    { name: 'date_depart', dataType: { kind: 'date' }, required: true },
    { name: 'nombre_personnes', dataType: { kind: 'integer' }, required: true },
    { name: 'statut', dataType: { kind: 'varchar', length: 20 }, required: true },
  ]);

  // Un client effectue 0..N réservations ; une réservation est effectuée
  // par exactement un client (relation 1,N).
  const effectuer: Association = {
    id: createId(),
    name: 'EFFECTUER',
    attributes: [],
    participations: [
      createParticipation({ entityId: client.id, cardinality: { min: 0, max: 'N' } }),
      createParticipation({ entityId: reservation.id, cardinality: { min: 1, max: 1 } }),
    ],
  };

  // Une réservation concerne 1..N chambres ; une chambre est concernée par
  // 0..N réservations. Association N,N porteuse d'un attribut.
  const concerner: Association = {
    id: createId(),
    name: 'CONCERNER',
    attributes: [
      createAttribute({
        name: 'prix_convenu',
        dataType: { kind: 'decimal', precision: 8, scale: 2 },
      }),
    ],
    participations: [
      createParticipation({ entityId: reservation.id, cardinality: { min: 1, max: 'N' } }),
      createParticipation({ entityId: chambre.id, cardinality: { min: 0, max: 'N' } }),
    ],
  };

  project.conceptualModel.entities = [client, chambre, reservation];
  project.conceptualModel.associations = [effectuer, concerner];

  project.diagram.nodes = [
    node(client.id, 'entity', 80, 80),
    node(chambre.id, 'entity', 80, 420),
    node(reservation.id, 'entity', 620, 240),
    node(effectuer.id, 'association', 380, 130),
    node(concerner.id, 'association', 380, 380),
  ];

  return project;
}

interface AttributeSpec {
  name: string;
  dataType: Entity['attributes'][number]['dataType'];
  required?: boolean;
  unique?: boolean;
  identifier?: boolean;
}

function buildEntity(name: string, specs: AttributeSpec[]): Entity {
  const entity = createEntity({ name });
  entity.attributes = specs.map((spec) =>
    createAttribute({
      name: spec.name,
      dataType: spec.dataType,
      required: spec.required ?? spec.identifier ?? false,
      unique: spec.unique ?? false,
    }),
  );
  const identifierAttributes = entity.attributes.filter(
    (_, index) => specs[index]?.identifier ?? false,
  );
  entity.identifiers = [
    {
      id: createId(),
      attributeIds: identifierAttributes.map((attribute) => attribute.id),
      primary: true,
    },
  ];
  return entity;
}

function node(
  modelId: string,
  nodeType: 'entity' | 'association',
  x: number,
  y: number,
): ModriseProject['diagram']['nodes'][number] {
  return { id: createId(), modelId, nodeType, position: { x, y } };
}
