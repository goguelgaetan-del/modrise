/**
 * Génération d'identifiants uniques pour tous les objets du modèle.
 *
 * Centralisé ici pour que le moteur métier ne dépende d'aucune API
 * spécifique au navigateur non standard (utilisable en CLI, tests, etc.).
 */
export function createId(): string {
  return globalThis.crypto.randomUUID();
}
