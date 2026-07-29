/**
 * Base locale IndexedDB (Dexie).
 *
 * Deux tables :
 * - `projects` : un enregistrement par projet, contenant le document projet
 *   complet (`data`) plus quelques champs indexés pour les listes ;
 * - `settings` : paires clé/valeur applicatives (dernier projet ouvert…).
 */
import Dexie from 'dexie';
import type { EntityTable } from 'dexie';

export interface ProjectRecord {
  id: string;
  name: string;
  updatedAt: string;
  /** Document projet complet, non typé : validé par Zod au chargement. */
  data: unknown;
}

export interface SettingRecord {
  key: string;
  value: string;
}

export const LAST_OPENED_PROJECT_KEY = 'lastOpenedProjectId';

export class ModriseDatabase extends Dexie {
  projects!: EntityTable<ProjectRecord, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;

  constructor() {
    super('modrise');
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      settings: 'key',
    });
  }
}

export const database = new ModriseDatabase();
