/** Échappe une chaîne pour une valeur littérale SQL entre apostrophes (`'` → `''`). */
export function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
