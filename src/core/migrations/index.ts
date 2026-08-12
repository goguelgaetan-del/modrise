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

interface LegacyDiagram {
  diagram?: { comments?: unknown; nodes?: unknown };
}

/**
 * v1 → v2 : introduction des commentaires graphiques (`diagram.comments`).
 * Un fichier v1 n'a jamais ce champ : on lui ajoute une liste vide, qui
 * n'affecte ni le modèle conceptuel ni les positions existantes.
 */
const addDiagramComments: ProjectMigration = {
  fromVersion: 1,
  toVersion: 2,
  migrate: (data) => {
    const project = data as LegacyDiagram;
    if (!project.diagram || Array.isArray(project.diagram.comments)) {
      return data;
    }
    return {
      ...(data as object),
      diagram: { ...project.diagram, comments: [] },
    };
  },
};

/**
 * v2 → v3 : introduction du verrouillage de nœuds (`DiagramNode.locked`).
 * Un fichier v2 n'a jamais ce champ sur ses nœuds : on l'ajoute à `false`
 * (aucun nœud verrouillé), sans toucher au reste.
 */
const addNodeLocked: ProjectMigration = {
  fromVersion: 2,
  toVersion: 3,
  migrate: (data) => {
    const project = data as LegacyDiagram;
    if (!project.diagram || !Array.isArray(project.diagram.nodes)) {
      return data;
    }
    return {
      ...(data as object),
      diagram: {
        ...project.diagram,
        nodes: project.diagram.nodes.map((node) =>
          typeof node === 'object' && node !== null && !('locked' in node)
            ? { ...node, locked: false }
            : node,
        ),
      },
    };
  },
};

/** Registre ordonné des migrations. */
export const MIGRATIONS: readonly ProjectMigration[] = [addDiagramComments, addNodeLocked];

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
