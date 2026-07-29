/**
 * Import / export de projets au format `.merise.json`.
 * Le parsing et la validation sont délégués au noyau (`core/serialization`).
 */
import type { ModriseProject } from '@/core/project/types';
import {
  parseProjectFile,
  PROJECT_FILE_EXTENSION,
  serializeProject,
} from '@/core/serialization/file-format';
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

/** Lit et valide un fichier importé ; lève `FileFormatError` en cas de problème. */
export async function readProjectFile(file: File): Promise<ModriseProject> {
  const content = await file.text();
  return parseProjectFile(content);
}
