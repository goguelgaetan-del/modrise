/**
 * Échappement générique d'un identifiant délimité par un caractère répété
 * (double guillemet pour PostgreSQL/SQLite, accent grave pour MySQL) :
 * le délimiteur interne est doublé, comme l'exige chacun de ces moteurs.
 *
 * Chaque dialecte expose sa propre fonction nommée (`quotePostgreSqlIdentifier`,
 * `quoteMySqlIdentifier`, `quoteSqliteIdentifier`) qui appelle celle-ci avec
 * son délimiteur : les dialectes ne dépendent donc jamais les uns des autres,
 * seulement de cet utilitaire neutre.
 */
export function quoteIdentifierWithDelimiter(identifier: string, delimiter: string): string {
  return `${delimiter}${identifier.split(delimiter).join(delimiter + delimiter)}${delimiter}`;
}
