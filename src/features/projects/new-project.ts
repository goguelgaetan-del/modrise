/**
 * Chargement d'un nouveau projet (vide ou exemple) dans les stores, partagé
 * entre la TopBar et le raccourci clavier Ctrl/Cmd+N : suspend l'autosave le
 * temps du chargement, vide l'historique (annuler/rétablir ne doit jamais
 * traverser un changement de projet) puis force une sauvegarde immédiate.
 */
import { createProject } from '@/core/project/types';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { saveNow, withAutosaveSuspended } from '@/persistence/autosave';
import { loadProjectIntoStores } from '@/stores/project-assembly';
import { useHistoryStore } from '@/stores/history-store';

export async function loadNewProject(kind: 'empty' | 'hotel'): Promise<void> {
  await withAutosaveSuspended(() => {
    loadProjectIntoStores(kind === 'hotel' ? createHotelExampleProject() : createProject());
  });
  useHistoryStore.getState().clear();
  await saveNow();
}
