/**
 * Registre des projets d'exemple livrés.
 *
 * Une seule source de vérité pour trois consommateurs qui, sinon, divergent :
 * le menu « Nouveau » de l'application, les fichiers `examples/*.merise.json`
 * livrés dans le dépôt, et les tests qui vérifient que les deux correspondent.
 */
import type { BuildExampleOptions } from './define-example';
import type { ModriseProject } from '../project/types';
import { createHotelExampleProject } from './hotel';
import { createEcommerceExampleProject } from './ecommerce';
import { createLibraryExampleProject } from './library';

export type ExampleKey = 'hotel' | 'ecommerce' | 'bibliotheque';

export interface DeliveredExample {
  key: ExampleKey;
  /** Libellé de l'entrée de menu, sans le préfixe « Exemple : ». */
  label: string;
  /** Une phrase : ce que l'exemple montre de plus que les autres. */
  highlight: string;
  /** Nom du fichier livré dans `examples/`. */
  fileName: string;
  create: (options?: BuildExampleOptions) => ModriseProject;
}

export const DELIVERED_EXAMPLES: readonly DeliveredExample[] = [
  {
    key: 'hotel',
    label: "Gestion d'hôtel",
    highlight: 'Le plus court : une relation 1,N et une association N,N porteuse d’un attribut.',
    fileName: 'gestion-hotel.merise.json',
    create: createHotelExampleProject,
  },
  {
    key: 'ecommerce',
    label: 'Boutique en ligne',
    highlight:
      'Association réflexive avec rôles, identifiants alternatifs, ligne de commande en N,N.',
    fileName: 'boutique-en-ligne.merise.json',
    create: createEcommerceExampleProject,
  },
  {
    key: 'bibliotheque',
    label: 'Bibliothèque',
    highlight: 'Association ternaire et identifiant primaire composé propagé en clé étrangère.',
    fileName: 'bibliotheque.merise.json',
    create: createLibraryExampleProject,
  },
];

export function getDeliveredExample(key: ExampleKey): DeliveredExample {
  const example = DELIVERED_EXAMPLES.find((candidate) => candidate.key === key);
  if (!example) throw new Error(`Exemple inconnu : « ${key} ».`);
  return example;
}
