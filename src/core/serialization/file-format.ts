/**
 * Format de fichier `.merise.json`.
 *
 * Import : lecture sans confiance → parse JSON → migration éventuelle →
 * validation Zod → chargement. Toute erreur produit un `FileFormatError`
 * avec un message compréhensible.
 */
import { z } from 'zod';
import { conceptualModelSchema } from '../conceptual-model/schemas';
import { diagramModelSchema } from '../diagram/schemas';
import { applyMigrations, MigrationError } from '../migrations';
import type { ModriseProject } from '../project/types';
import { CURRENT_FORMAT_VERSION } from '../project/types';
import { NAMING_CONVENTIONS } from '../sql/naming';
import { SQL_DIALECT_IDS } from '../sql/dialect';

export const PROJECT_FILE_EXTENSION = '.merise.json';

const DEFAULT_SQL_DIALECT_ID = 'postgresql';

const projectSettingsSchema = z.object({
  // Un dialecte inconnu (fichier ancien, ou provenant d'une version future)
  // ne doit jamais faire échouer l'import : il retombe silencieusement sur
  // PostgreSQL ici ; `parseProjectFileWithWarnings` détecte ce repli et le
  // signale à l'appelant plutôt que de le passer sous silence.
  sqlDialect: z.enum(SQL_DIALECT_IDS).catch(DEFAULT_SQL_DIALECT_ID),
  namingConvention: z.enum(NAMING_CONVENTIONS),
  gridEnabled: z.boolean(),
  snapToGrid: z.boolean(),
});

export const projectFileSchema = z.object({
  formatVersion: z.number().int().positive(),
  project: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
  conceptualModel: conceptualModelSchema,
  diagram: diagramModelSchema,
  settings: projectSettingsSchema,
});

export type ProjectFile = z.infer<typeof projectFileSchema>;

export class FileFormatError extends Error {}

/**
 * Limite de taille d'un fichier importable, en octets.
 *
 * Elle existe pour transformer un cas pathologique en message clair plutôt
 * qu'en onglet figé : `File.text()` charge tout le contenu en mémoire d'un
 * coup, et `JSON.parse` en construit ensuite une seconde représentation.
 *
 * Le chiffre est calibré, pas arbitraire. Le projet d'exemple pèse 8 Kio
 * sérialisé, et le plus grand modèle que Modrise revendique (100 entités,
 * 150 associations, 250 nœuds — voir docs/performance.md) pèse 356 Kio.
 * 16 Mio laisse donc une marge d'environ 46× au-dessus de ce plafond
 * documenté, tout en restant très en dessous de ce qui bloquerait un
 * navigateur.
 */
export const MAX_PROJECT_FILE_BYTES = 16 * 1024 * 1024;

/** Formate une taille en octets pour un message destiné à un humain. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Kio`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mio`;
}

/**
 * Vérifie qu'un fichier est importable **avant** d'en lire le contenu.
 *
 * Règle métier pure : elle ne dépend ni du DOM ni de `File`, seulement d'un
 * nombre d'octets. La couche navigateur (`features/projects`) l'appelle avec
 * `file.size`, qui est connu sans avoir rien lu.
 */
export function assertImportableSize(byteSize: number): void {
  if (byteSize === 0) {
    throw new FileFormatError('Ce fichier est vide.');
  }
  if (byteSize > MAX_PROJECT_FILE_BYTES) {
    throw new FileFormatError(
      `Ce fichier fait ${formatFileSize(byteSize)}, au-delà de la limite d'import de ${formatFileSize(MAX_PROJECT_FILE_BYTES)}. Il ne ressemble pas à un projet Modrise.`,
    );
  }
}

export function serializeProject(project: ModriseProject): string {
  const file: ProjectFile = {
    formatVersion: project.formatVersion,
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    conceptualModel: project.conceptualModel,
    diagram: project.diagram,
    settings: project.settings,
  };
  return JSON.stringify(file, null, 2);
}

export function projectFileToProject(file: ProjectFile): ModriseProject {
  return {
    id: file.project.id,
    formatVersion: file.formatVersion,
    name: file.project.name,
    description: file.project.description,
    createdAt: file.project.createdAt,
    updatedAt: file.project.updatedAt,
    conceptualModel: file.conceptualModel,
    diagram: file.diagram,
    settings: file.settings,
  };
}

export interface ParsedProjectFile {
  project: ModriseProject;
  /** Champs invalides silencieusement remplacés par une valeur par défaut sûre. */
  warnings: string[];
}

/**
 * Parse le contenu d'un fichier `.merise.json` non fiable.
 * Lève `FileFormatError` avec un message actionnable en cas de problème.
 */
export function parseProjectFile(content: string): ModriseProject {
  return parseProjectFileWithWarnings(content).project;
}

/**
 * Identique à `parseProjectFile`, mais signale en plus les champs invalides
 * qui ont été remplacés par une valeur par défaut plutôt que de faire
 * échouer l'import (ex. un dialecte SQL inconnu, provenant d'un fichier
 * ancien ou d'une version future de Modrise).
 */
export function parseProjectFileWithWarnings(content: string): ParsedProjectFile {
  // Un fichier vide est un cas assez courant (téléchargement interrompu,
  // fichier créé mais jamais écrit) pour mériter mieux que « JSON invalide ».
  if (content.trim().length === 0) {
    throw new FileFormatError('Ce fichier est vide.');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new FileFormatError('Ce fichier ne contient pas de JSON valide.');
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new FileFormatError('Ce fichier ne ressemble pas à un projet Modrise.');
  }

  const version = (raw as { formatVersion?: unknown }).formatVersion;
  if (typeof version !== 'number') {
    throw new FileFormatError(
      'Ce fichier ne déclare pas de version de format (champ « formatVersion »).',
    );
  }

  let migrated: unknown;
  try {
    migrated = applyMigrations(raw, version);
  } catch (error) {
    if (error instanceof MigrationError) {
      throw new FileFormatError(error.message);
    }
    throw error;
  }

  const result = projectFileSchema.safeParse(migrated);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.join('.') || 'racine';
    throw new FileFormatError(
      `Le fichier n'est pas un projet Modrise valide (champ « ${path} » : ${firstIssue?.message ?? 'invalide'}).`,
    );
  }

  const warnings: string[] = [];
  const rawSqlDialect = (migrated as { settings?: { sqlDialect?: unknown } })?.settings?.sqlDialect;
  if (
    typeof rawSqlDialect === 'string' &&
    !(SQL_DIALECT_IDS as readonly string[]).includes(rawSqlDialect)
  ) {
    warnings.push(
      `Le dialecte SQL « ${rawSqlDialect} » de ce fichier est inconnu ; PostgreSQL a été utilisé par défaut.`,
    );
  }

  const project = projectFileToProject(result.data);
  return { project: { ...project, formatVersion: CURRENT_FORMAT_VERSION }, warnings };
}
