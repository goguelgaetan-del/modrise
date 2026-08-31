/**
 * Chargement d'un nouveau projet (vide ou exemple) dans les stores, partagé
 * entre la TopBar, l'état vide du canvas et le raccourci clavier Ctrl/Cmd+N :
 * suspend l'autosave le temps du chargement, vide l'historique (annuler/
 * rétablir ne doit jamais traverser un changement de projet) puis force une
 * sauvegarde immédiate.
 */
import { createProject } from '@/core/project/types';
import { getDeliveredExample } from '@/core/examples';
import type { ExampleKey } from '@/core/examples';
import { saveNow, withAutosaveSuspended } from '@/persistence/autosave';
import { loadProjectIntoStores } from '@/stores/project-assembly';
import { useHistoryStore } from '@/stores/history-store';

export type NewProjectKind = 'empty' | ExampleKey;

export async function loadNewProject(kind: NewProjectKind): Promise<void> {
  await withAutosaveSuspended(() => {
    loadProjectIntoStores(kind === 'empty' ? createProject() : getDeliveredExample(kind).create());
  });
  useHistoryStore.getState().clear();
  await saveNow();
}
