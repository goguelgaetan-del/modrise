/**
 * Projet Modrise : agrégat racine regroupant le modèle conceptuel, le
 * diagramme et les paramètres.
 *
 * Note de structure : ce module ne figurait pas dans l'arborescence initiale
 * proposée ; il est justifié par le fait que `ModriseProject` est partagé par
 * la sérialisation, la persistance et les stores, sans appartenir en propre
 * au modèle conceptuel ni au diagramme.
 */
import type { ConceptualModel } from '../conceptual-model/types';
import { createConceptualModel } from '../conceptual-model/factories';
import type { DiagramModel } from '../diagram/types';
import { createDiagramModel } from '../diagram/types';
import type { NamingConvention } from '../sql/naming';
import { DEFAULT_NAMING_CONVENTION } from '../sql/naming';
import type { SqlDialectId } from '../sql/dialect';
import { createId } from '../id';

/** Version du format de fichier / de persistance. À incrémenter avec une migration. */
export const CURRENT_FORMAT_VERSION = 3;

export interface ModriseProject {
  id: string;
  formatVersion: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  conceptualModel: ConceptualModel;
  diagram: DiagramModel;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  sqlDialect: SqlDialectId;
  namingConvention: NamingConvention;
  gridEnabled: boolean;
  snapToGrid: boolean;
}

export function createDefaultSettings(): ProjectSettings {
  return {
    sqlDialect: 'postgresql',
    namingConvention: DEFAULT_NAMING_CONVENTION,
    gridEnabled: true,
    snapToGrid: true,
  };
}

export interface CreateProjectOptions {
  name?: string;
  description?: string;
}

export function createProject(options: CreateProjectOptions = {}): ModriseProject {
  const now = new Date().toISOString();
  return {
    id: createId(),
    formatVersion: CURRENT_FORMAT_VERSION,
    name: options.name ?? 'Projet sans titre',
    description: options.description,
    createdAt: now,
    updatedAt: now,
    conceptualModel: createConceptualModel(),
    diagram: createDiagramModel(),
    settings: createDefaultSettings(),
  };
}
