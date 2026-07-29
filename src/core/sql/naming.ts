/**
 * Conversion des noms conceptuels en identifiants de base de données.
 *
 * Les noms du MCD (libres : accents, espaces…) restent distincts des noms
 * physiques générés ; cette fonction est le seul point de conversion.
 */
import { SQL_RESERVED_WORDS } from './reserved-words';

export type NamingConvention = 'snake_case' | 'camelCase' | 'PascalCase' | 'UPPER_SNAKE_CASE';

export const NAMING_CONVENTIONS: readonly NamingConvention[] = [
  'snake_case',
  'camelCase',
  'PascalCase',
  'UPPER_SNAKE_CASE',
];

export const DEFAULT_NAMING_CONVENTION: NamingConvention = 'snake_case';

/** Découpe un nom libre en mots : accents supprimés, séparateurs et casse détectés. */
function splitWords(value: string): string[] {
  const withoutAccents = value.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return withoutAccents
    .replace(/['’]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
}

/**
 * Convertit un nom libre du MCD en identifiant de base de données.
 *
 * Gère : accents, espaces, apostrophes, tirets, caractères spéciaux,
 * noms vides (repli sur `unnamed`), préfixes numériques (préfixe `_`)
 * et mots réservés SQL (suffixe `_`).
 *
 * La résolution des doublons entre plusieurs identifiants générés est de la
 * responsabilité de l'appelant (voir `deduplicateIdentifiers`).
 */
export function toDatabaseIdentifier(value: string, convention: NamingConvention): string {
  const words = splitWords(value);
  if (words.length === 0) {
    return 'unnamed';
  }

  let identifier: string;
  switch (convention) {
    case 'snake_case':
      identifier = words.join('_');
      break;
    case 'UPPER_SNAKE_CASE':
      identifier = words.join('_').toUpperCase();
      break;
    case 'camelCase':
      identifier = words.map((word, index) => (index === 0 ? word : capitalize(word))).join('');
      break;
    case 'PascalCase':
      identifier = words.map(capitalize).join('');
      break;
  }

  if (/^[0-9]/.test(identifier)) {
    identifier = `_${identifier}`;
  }
  if (isSqlReservedWord(identifier)) {
    identifier = `${identifier}_`;
  }
  return identifier;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function isSqlReservedWord(value: string): boolean {
  return SQL_RESERVED_WORDS.has(value.toLowerCase());
}

/**
 * Rend une liste d'identifiants générés unique en suffixant `_2`, `_3`…
 * aux collisions (comparaison insensible à la casse, ordre stable).
 */
export function deduplicateIdentifiers(identifiers: string[]): string[] {
  const seen = new Map<string, number>();
  return identifiers.map((identifier) => {
    const key = identifier.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    return count === 0 ? identifier : `${identifier}_${count + 1}`;
  });
}
