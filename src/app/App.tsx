/**
 * Racine de l'application : démarrage (chargement du dernier projet ou du
 * projet d'exemple), autosauvegarde, layout.
 */
import { useEffect } from 'react';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { startAutosave, withAutosaveSuspended } from '@/persistence/autosave';
import { startUnsavedChangesGuard } from '@/persistence/unsaved-changes-guard';
import { loadLastProject } from '@/persistence/project-repository';
import { loadProjectIntoStores } from '@/stores/project-assembly';
import { useUiStore } from '@/stores/ui-store';
import { AppLayout } from '@/components/layout/AppLayout';
import { loadStoredTheme } from '@/lib/theme';
import { Providers } from './providers';

async function bootstrap(): Promise<void> {
  loadStoredTheme();
  try {
    await withAutosaveSuspended(async () => {
      const lastProject = await loadLastProject();
      // Premier lancement : le projet d'exemple sert de point de départ.
      loadProjectIntoStores(lastProject ?? createHotelExampleProject());
    });
    useUiStore.getState().setSaveStatus('saved');
  } catch (error) {
    // IndexedDB indisponible ou corrompu : l'application reste utilisable
    // en mémoire, l'utilisateur est prévenu que rien n'est persisté.
    console.error('Échec du chargement local :', error);
    await withAutosaveSuspended(() => {
      loadProjectIntoStores(createHotelExampleProject());
    });
    useUiStore
      .getState()
      .notify('error', 'Stockage local indisponible : le projet ne sera pas enregistré.');
  }
}

export default function App() {
  useEffect(() => {
    let stopAutosave: (() => void) | undefined;
    let cancelled = false;
    const stopUnsavedChangesGuard = startUnsavedChangesGuard();
    void bootstrap().then(() => {
      if (!cancelled) {
        stopAutosave = startAutosave();
      }
    });
    return () => {
      cancelled = true;
      stopAutosave?.();
      stopUnsavedChangesGuard();
    };
  }, []);

  return (
    <Providers>
      <AppLayout />
    </Providers>
  );
}
