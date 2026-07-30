/**
 * État vide du canvas : affiché tant qu'aucun nœud n'existe, disparaît dès
 * qu'un élément graphique est ajouté (le parent ne le rend que si
 * `diagramNodes.length === 0`).
 */
import { useReactFlow } from '@xyflow/react';
import { FolderOpen, Sparkles, Square, Upload } from 'lucide-react';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { saveNow, withAutosaveSuspended } from '@/persistence/autosave';
import { loadProjectIntoStores } from '@/stores/project-assembly';
import { useHistoryStore } from '@/stores/history-store';
import { createEntityAt } from '@/features/diagram/actions';
import { Button } from '@/components/ui/button';

export function EmptyCanvasState() {
  const { screenToFlowPosition, fitView } = useReactFlow();

  const onAddEntity = () => {
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2.5 });
    createEntityAt(position);
  };

  const onOpenExample = async () => {
    await withAutosaveSuspended(() => {
      loadProjectIntoStores(createHotelExampleProject());
    });
    useHistoryStore.getState().clear();
    await saveNow();
    requestAnimationFrame(() => void fitView({ padding: 0.2 }));
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center">
        <Sparkles aria-hidden className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Commencez votre MCD</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajoutez une entité ou ouvrez un projet d'exemple.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={onAddEntity}>
            <Square aria-hidden />
            Ajouter une entité
          </Button>
          <Button size="sm" variant="outline" onClick={() => void onOpenExample()}>
            <FolderOpen aria-hidden />
            Ouvrir Gestion d'hôtel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              document.querySelector<HTMLInputElement>('[data-testid="import-file-input"]')?.click()
            }
          >
            <Upload aria-hidden />
            Importer un projet
          </Button>
        </div>
      </div>
    </div>
  );
}
