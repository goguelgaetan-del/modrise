/**
 * Sauvegarde automatique avec debounce.
 *
 * S'abonne aux stores projet et diagramme ; toute modification passe le
 * statut à « Modifications non enregistrées » puis déclenche, après un délai
 * de calme, une écriture IndexedDB. Une erreur d'écriture est signalée dans
 * la barre supérieure sans faire planter l'application.
 */
import { assembleCurrentProject } from '@/stores/project-assembly';
import { selectPersistedDiagram, useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import { saveProject, setLastOpenedProjectId } from './project-repository';

export const AUTOSAVE_DEBOUNCE_MS = 800;

let suspended = false;

/**
 * Suspend l'autosauvegarde le temps d'un chargement de projet, pour ne pas
 * réécrire immédiatement ce qui vient d'être lu.
 */
export async function withAutosaveSuspended(action: () => void | Promise<void>): Promise<void> {
  suspended = true;
  try {
    await action();
  } finally {
    suspended = false;
  }
}

async function persistNow(): Promise<void> {
  const ui = useUiStore.getState();
  ui.setSaveStatus('saving');
  try {
    const project = assembleCurrentProject();
    await saveProject(project);
    await setLastOpenedProjectId(project.id);
    useUiStore.getState().setSaveStatus('saved');
  } catch (error) {
    console.error('Échec de la sauvegarde locale :', error);
    useUiStore.getState().setSaveStatus('error');
  }
}

/**
 * Démarre l'autosauvegarde. Retourne une fonction d'arrêt (utile aux tests
 * et au démontage en StrictMode).
 */
export function startAutosave(debounceMs: number = AUTOSAVE_DEBOUNCE_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (suspended) return;
    useUiStore.getState().setSaveStatus('dirty');
    clearTimeout(timer);
    timer = setTimeout(() => {
      void persistNow();
    }, debounceMs);
  };

  const unsubscribeProject = useProjectStore.subscribe(schedule);
  // Seule la partie persistée du diagramme (positions, viewport) déclenche
  // une sauvegarde ; la sélection est ignorée.
  const unsubscribeDiagram = useDiagramStore.subscribe(selectPersistedDiagram, schedule, {
    equalityFn: (a, b) => a.nodes === b.nodes && a.viewport === b.viewport,
  });

  return () => {
    clearTimeout(timer);
    unsubscribeProject();
    unsubscribeDiagram();
  };
}

/** Force une sauvegarde immédiate (Ctrl+S). */
export function saveNow(): Promise<void> {
  return persistNow();
}
