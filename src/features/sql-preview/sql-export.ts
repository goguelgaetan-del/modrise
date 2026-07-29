/** Export du script SQL généré : nom de fichier et téléchargement. */
import type { SqlDialectId } from '@/core/sql/dialect';
import { slugify } from '@/lib/slugify';

export function sqlFileName(projectName: string, dialectId: SqlDialectId): string {
  return `${slugify(projectName, 'projet')}.${dialectId}.sql`;
}

export function downloadSqlFile(projectName: string, dialectId: SqlDialectId, sql: string): void {
  const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = sqlFileName(projectName, dialectId);
  anchor.click();
  URL.revokeObjectURL(url);
}
