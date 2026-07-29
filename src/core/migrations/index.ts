/**
 * Migrations du format de fichier `.merise.json`.
 *
 * Chaque évolution incompatible du format incrémente `CURRENT_FORMAT_VERSION`
 * et ajoute une migration `n → n+1` dans `MIGRATIONS`. Les migrations
 * travaillent sur `unknown` : les données ne sont validées par Zod qu'après
 * avoir été amenées à la version courante.
 */
import { CURRENT_FORMAT_VERSION } from '../project/types';

export interface ProjectMigration {
  fromVersion: number;
  toVersion: number;
  migrate(data: unknown): unknown;
}

/** Registre ordonné des migrations. Vide tant que le format n'a qu'une version. */
export const MIGRATIONS: readonly ProjectMigration[] = [];

export class MigrationError extends Error {}

/**
 * Amène des données de fichier à la version courante du format.
 * Lève `MigrationError` si la version est inconnue ou trop récente.
 * `migrations` et `targetVersion` sont injectables pour tester le chaînage.
 */
export function applyMigrations(
  data: unknown,
  fromVersion: number,
  migrations: readonly ProjectMigration[] = MIGRATIONS,
  targetVersion: number = CURRENT_FORMAT_VERSION,
): unknown {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new MigrationError(`Version de format invalide : ${String(fromVersion)}.`);
  }
  if (fromVersion > targetVersion) {
    throw new MigrationError(
      `Ce fichier utilise la version ${fromVersion} du format, plus récente que celle supportée (${targetVersion}). Mettez Modrise à jour.`,
    );
  }
  let current = data;
  let version = fromVersion;
  while (version < targetVersion) {
    const migration = migrations.find((m) => m.fromVersion === version);
    if (!migration) {
      throw new MigrationError(
        `Aucune migration disponible depuis la version ${version} du format.`,
      );
    }
    current = migration.migrate(current);
    version = migration.toVersion;
  }
  return current;
}
