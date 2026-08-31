/**
 * Projet d'exemple « Boutique en ligne ».
 *
 * Choisi pour couvrir ce que l'exemple « Gestion d'hôtel » ne montre pas :
 *
 * - une **association réflexive avec rôles** (une catégorie en regroupe
 *   d'autres) ;
 * - des **identifiants alternatifs** (l'e-mail d'un client, la référence d'un
 *   produit : uniques, mais pas la clé primaire) ;
 * - une **association N,N porteuse d'attributs** dont la table de jonction
 *   reçoit une clé primaire composée (CONTENIR) ;
 * - plusieurs relations 1,N convergeant vers la même entité (ADRESSE est à la
 *   fois possédée par un client et destinataire de commandes).
 */
import { buildExample } from './define-example';
import type { BuildExampleOptions, ExampleSpec } from './define-example';
import type { ModriseProject } from '../project/types';

export const ecommerceExampleSpec: ExampleSpec = {
  key: 'ecommerce',
  name: 'Boutique en ligne',
  description:
    "Projet d'exemple : catalogue, panier et commandes. Montre une association réflexive, des identifiants alternatifs et une association N,N porteuse d'attributs.",
  entities: [
    {
      name: 'CATEGORIE',
      description: 'Rubrique du catalogue, éventuellement rattachée à une rubrique parente.',
      position: { x: 80, y: 60 },
      primaryKey: ['id_categorie'],
      alternateKeys: [{ name: 'slug_unique', attributes: ['slug'] }],
      attributes: [
        { name: 'id_categorie', dataType: { kind: 'integer' }, required: true },
        { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
        {
          name: 'slug',
          dataType: { kind: 'varchar', length: 120 },
          required: true,
          unique: true,
          description: "Identifiant lisible utilisé dans l'URL.",
        },
      ],
    },
    {
      name: 'PRODUIT',
      position: { x: 80, y: 420 },
      primaryKey: ['id_produit'],
      alternateKeys: [{ name: 'reference_unique', attributes: ['reference'] }],
      attributes: [
        { name: 'id_produit', dataType: { kind: 'integer' }, required: true },
        {
          name: 'reference',
          dataType: { kind: 'varchar', length: 40 },
          required: true,
          unique: true,
          description: 'Référence catalogue, unique mais non utilisée comme clé primaire.',
        },
        { name: 'libelle', dataType: { kind: 'varchar', length: 200 }, required: true },
        { name: 'description', dataType: { kind: 'text' } },
        { name: 'prix_ht', dataType: { kind: 'decimal', precision: 10, scale: 2 }, required: true },
        { name: 'poids_kg', dataType: { kind: 'decimal', precision: 6, scale: 3 } },
        { name: 'actif', dataType: { kind: 'boolean' }, required: true },
      ],
    },
    {
      name: 'CLIENT',
      position: { x: 760, y: 60 },
      primaryKey: ['id_client'],
      alternateKeys: [{ name: 'courriel_unique', attributes: ['courriel'] }],
      attributes: [
        { name: 'id_client', dataType: { kind: 'integer' }, required: true },
        {
          name: 'courriel',
          dataType: { kind: 'varchar', length: 255 },
          required: true,
          unique: true,
        },
        { name: 'nom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'prenom', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'date_inscription', dataType: { kind: 'datetime' }, required: true },
      ],
    },
    {
      name: 'COMMANDE',
      position: { x: 760, y: 420 },
      primaryKey: ['id_commande'],
      attributes: [
        { name: 'id_commande', dataType: { kind: 'integer' }, required: true },
        {
          name: 'numero',
          dataType: { kind: 'varchar', length: 20 },
          required: true,
          unique: true,
        },
        { name: 'date_commande', dataType: { kind: 'datetime' }, required: true },
        { name: 'statut', dataType: { kind: 'varchar', length: 20 }, required: true },
      ],
    },
    {
      name: 'ADRESSE',
      position: { x: 1180, y: 240 },
      primaryKey: ['id_adresse'],
      attributes: [
        { name: 'id_adresse', dataType: { kind: 'integer' }, required: true },
        { name: 'libelle', dataType: { kind: 'varchar', length: 120 }, required: true },
        { name: 'rue', dataType: { kind: 'varchar', length: 200 }, required: true },
        { name: 'code_postal', dataType: { kind: 'varchar', length: 10 }, required: true },
        { name: 'ville', dataType: { kind: 'varchar', length: 100 }, required: true },
        { name: 'pays', dataType: { kind: 'varchar', length: 100 }, required: true },
      ],
    },
  ],
  associations: [
    {
      // Réflexive : une catégorie regroupe 0..N sous-catégories et appartient
      // à 0 ou 1 catégorie parente. Les rôles sont obligatoires pour lever
      // l'ambiguïté — sans eux, Modrise émettrait un avertissement.
      name: 'REGROUPER',
      position: { x: 420, y: 40 },
      participations: [
        { entity: 'CATEGORIE', role: 'catégorie parente', cardinality: { min: 0, max: 'N' } },
        { entity: 'CATEGORIE', role: 'sous-catégorie', cardinality: { min: 0, max: 1 } },
      ],
    },
    {
      // 1,N : un produit appartient à exactement une catégorie.
      name: 'CLASSER',
      position: { x: 80, y: 240 },
      participations: [
        { entity: 'PRODUIT', cardinality: { min: 1, max: 1 } },
        { entity: 'CATEGORIE', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      // N,N porteuse d'attributs : c'est la ligne de commande. La table de
      // jonction produite par le MLD a une clé primaire composée
      // (commande, produit) et porte quantite + prix_unitaire.
      name: 'CONTENIR',
      position: { x: 420, y: 480 },
      attributes: [
        { name: 'quantite', dataType: { kind: 'integer' }, required: true },
        {
          name: 'prix_unitaire',
          dataType: { kind: 'decimal', precision: 10, scale: 2 },
          required: true,
          description: 'Prix au moment de la commande, figé même si le tarif change ensuite.',
        },
      ],
      participations: [
        { entity: 'COMMANDE', cardinality: { min: 1, max: 'N' } },
        { entity: 'PRODUIT', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      // 1,N : une commande est passée par exactement un client.
      name: 'PASSER',
      position: { x: 760, y: 240 },
      participations: [
        { entity: 'COMMANDE', cardinality: { min: 1, max: 1 } },
        { entity: 'CLIENT', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      name: 'POSSEDER',
      position: { x: 1180, y: 60 },
      participations: [
        { entity: 'ADRESSE', cardinality: { min: 1, max: 1 } },
        { entity: 'CLIENT', cardinality: { min: 0, max: 'N' } },
      ],
    },
    {
      name: 'LIVRER_A',
      position: { x: 1180, y: 460 },
      participations: [
        { entity: 'COMMANDE', cardinality: { min: 1, max: 1 } },
        { entity: 'ADRESSE', cardinality: { min: 0, max: 'N' } },
      ],
    },
  ],
};

export function createEcommerceExampleProject(options?: BuildExampleOptions): ModriseProject {
  return buildExample(ecommerceExampleSpec, options);
}
