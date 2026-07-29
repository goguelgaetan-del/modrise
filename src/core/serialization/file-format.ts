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
