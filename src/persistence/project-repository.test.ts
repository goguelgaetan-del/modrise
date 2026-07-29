import { beforeEach, describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { database } from './database';
import {
  deleteProject,
  listProjects,
  loadLastProject,
  loadProject,
  saveProject,
  setLastOpenedProjectId,
} from './project-repository';

beforeEach(async () => {
  await database.projects.clear();
  await database.settings.clear();
});

describe('project-repository', () => {
  it('sauvegarde puis recharge un projet sans perte', async () => {
    const project = createHotelExampleProject();
    await saveProject(project);
    const loaded = await loadProject(project.id);
    expect(loaded).toEqual(project);
  });

  it('liste les projets par date de modification décroissante', async () => {
    const a = createHotelExampleProject();
    a.updatedAt = '2026-01-01T00:00:00.000Z';
    const b = createHotelExampleProject();
    b.updatedAt = '2026-06-01T00:00:00.000Z';
    await saveProject(a);
    await saveProject(b);
    const summaries = await listProjects();
    expect(summaries.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it('charge le dernier projet ouvert', async () => {
    const a = createHotelExampleProject();
    const b = createHotelExampleProject();
    await saveProject(a);
    await saveProject(b);
    await setLastOpenedProjectId(a.id);
    const last = await loadLastProject();
    expect(last?.id).toBe(a.id);
  });

  it('supprime un projet', async () => {
    const project = createHotelExampleProject();
    await saveProject(project);
    await deleteProject(project.id);
    expect(await loadProject(project.id)).toBeUndefined();
  });
});
