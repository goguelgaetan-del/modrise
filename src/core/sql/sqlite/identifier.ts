/**
 * Échappement des identifiants SQLite : doubles guillemets, sémantique
 * strictement identique à PostgreSQL. Réutilise l'utilitaire neutre partagé
 * (`quoteIdentifierWithDelimiter`) plutôt que d'importer depuis le dialecte
 * PostgreSQL, pour ne pas coupler artificiellement les deux dialectes.
 */
import { quoteIdentifierWithDelimiter } from '../shared/quoting';

export function quoteSqliteIdentifier(identifier: string): string {
  return quoteIdentifierWithDelimiter(identifier, '"');
}
