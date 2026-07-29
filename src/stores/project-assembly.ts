/**
 * Assemblage de l'état des stores en un `ModriseProject` complet
 * (utilisé par l'autosauvegarde et l'export).
 */
import type { ModriseProject } from '@/core/project/types';
import { selectPersistedDiagram, useDiagramStore } from './diagram-store';
import { useProjectStore } from './project-store';

export function assembleCurrentProject(): ModriseProject {
  const project = useProjectStore.getState();
  const diagram = selectPersistedDiagram(useDiagramStore.getState());
  return {
    id: project.id,
    formatVersion: project.formatVersion,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    conceptualModel: project.conceptualModel,
    settings: project.settings,
    diagram,
  };
}

/** Charge un projet complet dans les deux stores. */
export function loadProjectIntoStores(project: ModriseProject): void {
  useProjectStore.getState().loadProject(project);
  useDiagramStore.getState().loadDiagram(project.diagram);
}
