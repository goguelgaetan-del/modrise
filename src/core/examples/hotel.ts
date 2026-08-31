/**
 * Projet d'exemple « Gestion d'hôtel ».
 *
 * Démontre : identifiants primaires, plusieurs types de données, une
 * relation 1,N (CLIENT — EFFECTUER — RESERVATION) et une association N,N
 * porteuse d'un attribut (RESERVATION — CONCERNER — CHAMBRE).
 *
 * C'est l'exemple chargé par défaut au premier démarrage : il reste
 * volontairement le plus petit des trois. Pour un modèle plus riche, voir
 * [ecommerce.ts](ecommerce.ts) et [library.ts](library.ts).
 */
import { buildExample } from './define-example';
import type { ExampleSpec } from './define-example';
import type { ModriseProject } from '../project/types';
import type { BuildExampleOptions } from './define-example';

export const hotelExampleSpec: ExampleSpec = {
  key: 'hotel',
  name: "Gestion d'hôtel",
  description: "Projet d'exemple : clients, chambres et réservations.",
  entities: [
    {
      name: 'CLIENT',
      position: { x: 80, y: 80 },
      primaryKey: ['id_client'],
      attributes: [
        { name: 'id_client', dataType: { kind: 'integer' }, required: true },
        { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'prenom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'email', dataType: { kind: 'varchar', length: 255 }, unique: true },
        { name: 'telephone', dataType: { kind: 'varchar', length: 20 } },
      ],
    },
    {
      name: 'CHAMBRE',
      position: { x: 80, y: 420 },
      primaryKey: ['id_chambre'],
      attributes: [
        { name: 'id_chambre', dataType: { kind: 'integer' }, required: true },
        { name: 'numero', dataType: { kind: 'varchar', length: 10 }, required: true, unique: true },
        { name: 'type', dataType: { kind: 'varchar', length: 50 }, required: true },
        { name: 'etage', dataType: { kind: 'integer' } },
        {
          name: 'prix_nuit',
          dataType: { kind: 'decimal', precision: 8, scale: 2 },
          required: true,
        },
      ],
    },
    {
      name: 'RESERVATION',
      position: { x: 620, y: 240 },
      primaryKey: ['id_reservation'],
      attributes: [
        { name: 'id_reservation', dataType: { kind: 'integer' }, required: true },
        { name: 'date_arrivee', dataType: { kind: 'date' }, required: true },
        { name: 'date_depart', dataType: { kind: 'date' }, required: true },
        { name: 'nombre_personnes', dataType: { kind: 'integer' }, required: true },
        { name: 'statut', dataType: { kind: 'varchar', length: 20 }, required: true },
      ],
    },
  ],
  associations: [
    {
      // Un client effectue 0..N réservations ; une réservation est effectuée
      // par exactement un client (relation 1,N).
      name: 'EFFECTUER',
      position: { x: 380, y: 130 },
      participations: [
        { entity: 'CLIENT', cardinality: { min: 0, max: 'N' } },
        { entity: 'RESERVATION', cardinality: { min: 1, max: 1 } },
      ],
    },
    {
      // Une réservation concerne 1..N chambres ; une chambre est concernée par
      // 0..N réservations. Association N,N porteuse d'un attribut.
      name: 'CONCERNER',
      position: { x: 380, y: 380 },
      attributes: [{ name: 'prix_convenu', dataType: { kind: 'decimal', precision: 8, scale: 2 } }],
      participations: [
        { entity: 'RESERVATION', cardinality: { min: 1, max: 'N' } },
        { entity: 'CHAMBRE', cardinality: { min: 0, max: 'N' } },
      ],
    },
  ],
};

export function createHotelExampleProject(options?: BuildExampleOptions): ModriseProject {
  return buildExample(hotelExampleSpec, options);
}
