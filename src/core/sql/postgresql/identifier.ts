/**
 * Échappement des identifiants PostgreSQL.
 *
 * PostgreSQL délimite les identifiants avec des doubles guillemets ; tout
 * double guillemet interne doit être doublé. Appliqué systématiquement,
 * même sur des noms déjà normalisés par `src/core/sql/naming.ts`, pour
 * garantir la validité du script et éviter toute collision avec un mot
 * réservé PostgreSQL.
 */
export function quotePostgreSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
