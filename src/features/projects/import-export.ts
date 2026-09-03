/**
 * Import / export de projets au format `.merise.json`.
 * Le parsing et la validation sont délégués au noyau (`core/serialization`).
 */
import type { ModriseProject } from '@/core/project/types';
import {
  assertImportableSize,
  FileFormatError,
  parseProjectFileWithWarnings,
  PROJECT_FILE_EXTENSION,
  serializeProject,
} from '@/core/serialization/file-format';
import type { ParsedProjectFile } from '@/core/serialization/file-format';
import { slugify } from '@/lib/slugify';

/** Nom de fichier proposé à l'export : nom du projet en minuscules + extension. */
export function exportFileName(projectName: string): string {
  return `${slugify(projectName, 'projet')}${PROJECT_FILE_EXTENSION}`;
}

export function downloadProjectFile(project: ModriseProject): void {
  const blob = new Blob([serializeProject(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = exportFileName(project.name);
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Lit et valide un fichier importé ; lève `FileFormatError` en cas de problème.
 * `warnings` signale les champs invalides silencieusement remplacés par une
 * valeur par défaut (ex. dialecte SQL inconnu → PostgreSQL).
 *
 * Trois barrières, dans cet ordre :
 *
 * 1. la taille, vérifiée **avant** toute lecture — `file.size` est connu sans
 *    rien charger, alors que `file.text()` matérialise tout en mémoire ;
 * 2. la lecture elle-même, qui peut échouer pour des raisons hors du format
 *    (fichier supprimé ou déplacé depuis la sélection, permission refusée,
 *    support amovible retiré) et doit devenir un message, jamais une promesse
 *    rejetée que l'appelant ne saurait pas nommer ;
 * 3. le format, délégué au noyau.
 */
export async function readProjectFile(file: File): Promise<ParsedProjectFile> {
  assertImportableSize(file.size);

  let content: string;
  try {
    content = await file.text();
  } catch {
    throw new FileFormatError(
      "Ce fichier n'a pas pu être lu. Vérifiez qu'il est toujours accessible, puis réessayez.",
    );
  }

  return parseProjectFileWithWarnings(content);
}
