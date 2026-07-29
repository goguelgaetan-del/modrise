/**
 * Échappement des identifiants MySQL/MariaDB : accents graves, avec
 * doublement de tout accent grave interne (`nom\`archive` → `` `nom``archive` ``).
 */
import { quoteIdentifierWithDelimiter } from '../shared/quoting';

export function quoteMySqlIdentifier(identifier: string): string {
  return quoteIdentifierWithDelimiter(identifier, '`');
}
