/**
 * Repository des projets : seul point d'accès à IndexedDB pour les projets.
 *
 * Les documents lus depuis la base sont traités comme non fiables et
 * repassent par le pipeline de sérialisation (migration + validation Zod).
 */
import type { ModriseProject } from '@/core/project/types';
import { parseProjectFile, serializeProject } from '@/core/serialization/file-format';
import { database, LAST_OPENED_PROJECT_KEY } from './database';
import type { ProjectRecord } from './database';

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export async function saveProject(project: ModriseProject): Promise<void> {
  const record: ProjectRecord = {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    data: JSON.parse(serializeProject(project)),
  };
  await database.projects.put(record);
}

export async function loadProject(projectId: string): Promise<ModriseProject | undefined> {
  const record = await database.projects.get(projectId);
  if (!record) return undefined;
  return parseProjectFile(JSON.stringify(record.data));
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const records = await database.projects.orderBy('updatedAt').reverse().toArray();
  return records.map(({ id, name, updatedAt }) => ({ id, name, updatedAt }));
}

export async function deleteProject(projectId: string): Promise<void> {
  await database.projects.delete(projectId);
}

export async function setLastOpenedProjectId(projectId: string): Promise<void> {
  await database.settings.put({ key: LAST_OPENED_PROJECT_KEY, value: projectId });
}

export async function getLastOpenedProjectId(): Promise<string | undefined> {
  const record = await database.settings.get(LAST_OPENED_PROJECT_KEY);
  return record?.value;
}

/** Charge le dernier projet ouvert, ou le plus récemment modifié. */
export async function loadLastProject(): Promise<ModriseProject | undefined> {
  const lastId = await getLastOpenedProjectId();
  if (lastId) {
    const project = await loadProject(lastId).catch(() => undefined);
    if (project) return project;
  }
  const summaries = await listProjects();
  const mostRecent = summaries[0];
  if (!mostRecent) return undefined;
  return loadProject(mostRecent.id).catch(() => undefined);
}
