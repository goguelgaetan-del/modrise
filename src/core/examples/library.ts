/**
 * Projet d'exemple « Bibliothèque ».
 *
 * Complète les deux autres sur les cas Merise qu'ils ne montrent pas :
 *
 * - une **association n-aire** (ternaire) : un emprunt met en jeu un
 *   exemplaire, un adhérent et le bibliothécaire qui l'a enregistré ;
 * - un **identifiant primaire composé** naturel : un rayon est identifié par
 *   le couple (salle, numéro), et cette clé composée se propage jusqu'à la
 *   clé étrangère de EXEMPLAIRE ;
 * - une **association N,N sans attribut** (ECRIRE) à côté d'une N,N qui en
 *   porte (RESERVER) ;
 * - la distinction œuvre / exemplaire physique, classique en Merise.
 */
import { buildExample } from './define-example';
import type { BuildExampleOptions, ExampleSpec } from './define-example';
import type { ModriseProject } from '../project/types';

export const libraryExampleSpec: ExampleSpec = {
  key: 'bibliotheque',
  name: 'Bibliothèque',
  description:
    "Projet d'exemple : œuvres, exemplaires physiques, emprunts et réservations. Montre une association ternaire et un identifiant primaire composé.",
  entities: [
    {
      name: 'AUTEUR',
      position: { x: 80, y: 80 },
      primaryKey: ['id_auteur'],
      attributes: [
        { name: 'id_auteur', dataType: { kind: 'integer' }, required: true },
        { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'prenom', dataType: { kind: 'varchar', length: 100 } },
        { name: 'annee_naissance', dataType: { kind: 'integer' } },
      ],
    },
    {
      name: 'LIVRE',
      description: "L'œuvre, indépendamment du nombre d'exemplaires détenus.",
      position: { x: 760, y: 80 },
      primaryKey: ['id_livre'],
      alternateKeys: [{ name: 'isbn_unique', attributes: ['isbn'] }],
      attributes: [
        { name: 'id_livre', dataType: { kind: 'integer' }, required: true },
        { name: 'isbn', dataType: { kind: 'varchar', length: 17 }, required: true, unique: true },
        { name: 'titre', dataType: { kind: 'varchar', length: 200 }, required: true },
        { name: 'annee_publication', dataType: { kind: 'integer' } },
        { name: 'langue', dataType: { kind: 'varchar', length: 40 }, required: true },
      ],
    },
    {
      name: 'EXEMPLAIRE',
      description: 'Un livre physique posé sur une étagère ; c’est lui que l’on emprunte.',
      position: { x: 760, y: 560 },
      primaryKey: ['id_exemplaire'],
      alternateKeys: [{ name: 'code_barre_unique', attributes: ['code_barre'] }],
      attributes: [
        { name: 'id_exemplaire', dataType: { kind: 'integer' }, required: true },
        {
          name: 'code_barre',
          dataType: { kind: 'varchar', length: 20 },
          required: true,
          unique: true,
        },
        { name: 'etat', dataType: { kind: 'varchar', length: 20 }, required: true },
        { name: 'date_acquisition', dataType: { kind: 'date' }, required: true },
      ],
    },
    {
      name: 'RAYON',
      description: 'Emplacement physique, identifié par le couple (salle, numéro).',
      position: { x: 1400, y: 560 },
      // Identifiant primaire composé, et naturel : aucune de ces deux
      // colonnes ne suffit seule, et il ne s'agit pas d'une clé étrangère
      // déguisée.
      primaryKey: ['code_salle', 'numero_rayon'],
      attributes: [
        { name: 'code_salle', dataType: { kind: 'varchar', length: 10 }, required: true },
        { name: 'numero_rayon', dataType: { kind: 'integer' }, required: true },
        { name: 'theme', dataType: { kind: 'varchar', length: 100 }, required: true },
      ],
    },
    {
      name: 'ADHERENT',
      position: { x: 80, y: 560 },
      primaryKey: ['id_adherent'],
      alternateKeys: [{ name: 'numero_carte_unique', attributes: ['numero_carte'] }],
      attributes: [
        { name: 'id_adherent', dataType: { kind: 'integer' }, required: true },
        {
          name: 'numero_carte',
          dataType: { kind: 'varchar', length: 20 },
          required: true,
          unique: true,
        },
        { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'prenom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'date_adhesion', dataType: { kind: 'date' }, required: true },
        { name: 'courriel', dataType: { kind: 'varchar', length: 255 } },
      ],
    },
    {
      name: 'BIBLIOTHECAIRE',
      position: { x: 80, y: 900 },
      primaryKey: ['id_bibliothecaire'],
      attributes: [
        { name: 'id_bibliothecaire', dataType: { kind: 'integer' }, required: true },
        { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'prenom', dataType: { kind: 'varchar', length: 100 }, required: true },
      ],
    },
  ],
  associations: [
    {
      // N,N sans attribut : une œuvre peut avoir plusieurs auteurs, un auteur
      // plusieurs œuvres. La table de jonction ne porte que les deux clés.
      name: 'ECRIRE',
      position: { x: 420, y: 80 },
      participations: [
        { entity: 'AUTEUR', cardinality: { min: 0, max: 'N' } },
        { entity: 'LIVRE', cardinality: { min: 1, max: 'N' } },
      ],
    },
    {
      // 1,N : un exemplaire est toujours l'exemplaire d'exactement une œuvre.
      name: 'EXEMPLAIRE_DE',
      position: { x: 760, y: 320 },
      participations: [
        { entity: 'EXEMPLAIRE', cardinality: { min: 1, max: 1 } },
        { entity: 'LIVRE', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      // 1,N vers une entité à identifiant composé : la clé étrangère de
      // EXEMPLAIRE reprend les deux colonnes de RAYON.
      name: 'RANGER',
      position: { x: 1080, y: 560 },
      participations: [
        { entity: 'EXEMPLAIRE', cardinality: { min: 1, max: 1 } },
        { entity: 'RAYON', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      // Ternaire : un emprunt n'a de sens qu'avec ses trois dimensions. Le MLD
      // en fait une table de jonction à clé primaire composée des trois clés.
      name: 'EMPRUNTER',
      position: { x: 420, y: 560 },
      attributes: [
        { name: 'date_emprunt', dataType: { kind: 'date' }, required: true },
        { name: 'date_retour_prevue', dataType: { kind: 'date' }, required: true },
        {
          name: 'date_retour_effective',
          dataType: { kind: 'date' },
          description: 'Vide tant que le livre n’est pas revenu.',
        },
      ],
      participations: [
        { entity: 'EXEMPLAIRE', cardinality: { min: 0, max: 'N' } },
        { entity: 'ADHERENT', cardinality: { min: 0, max: 'N' } },
        { entity: 'BIBLIOTHECAIRE', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      // N,N binaire porteuse d'un attribut : on réserve une œuvre, pas un
      // exemplaire précis.
      name: 'RESERVER',
      position: { x: 420, y: 300 },
      attributes: [{ name: 'date_reservation', dataType: { kind: 'datetime' }, required: true }],
      participations: [
        { entity: 'ADHERENT', cardinality: { min: 0, max: 'N' } },
        { entity: 'LIVRE', cardinality: { min: 0, max: 'N' } },
      ],
    },
  ],
};

export function createLibraryExampleProject(options?: BuildExampleOptions): ModriseProject {
  return buildExample(libraryExampleSpec, options);
}
