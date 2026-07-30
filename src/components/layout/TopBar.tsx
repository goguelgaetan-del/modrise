/**
 * Barre supérieure : identité, projet, fichiers (nouveau/import/export),
 * sauvegarde, historique (prévu), vue et thème.
 */
import { useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  Database,
  Download,
  FilePlus2,
  Focus,
  FolderOpen,
  Image,
  Moon,
  Redo2,
  Save,
  Settings,
  Sun,
  Undo2,
} from 'lucide-react';
import { FileFormatError } from '@/core/serialization/file-format';
import { saveNow, withAutosaveSuspended } from '@/persistence/autosave';
import { downloadProjectFile, readProjectFile } from '@/features/projects/import-export';
import { loadNewProject as loadNewProjectShared } from '@/features/projects/new-project';
import { downloadDiagramSvg } from '@/features/diagram/export/export-svg';
import { downloadDiagramPng } from '@/features/diagram/export/export-png';
import { undo, redo } from '@/features/history/with-history';
import { assembleCurrentProject, loadProjectIntoStores } from '@/stores/project-assembly';
import { useDiagramStore } from '@/stores/diagram-store';
import { useHistoryStore } from '@/stores/history-store';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import type { SaveStatus } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Modifications non enregistrées',
  saving: 'Enregistrement…',
  saved: 'Enregistré localement',
  error: 'Erreur d’enregistrement',
};

export function TopBar() {
  const projectName = useProjectStore((state) => state.name);
  const renameProject = useProjectStore((state) => state.renameProject);
  const saveStatus = useUiStore((state) => state.saveStatus);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const notify = useUiStore((state) => state.notify);
  const canUndo = useHistoryStore((state) => state.canUndo);
  const canRedo = useHistoryStore((state) => state.canRedo);
  const undoLabel = useHistoryStore((state) => state.undoLabel);
  const redoLabel = useHistoryStore((state) => state.redoLabel);
  const zoom = useDiagramStore((state) => state.viewport.zoom);
  const { fitView } = useReactFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNewProject = async (kind: 'empty' | 'hotel') => {
    await loadNewProjectShared(kind);
    requestAnimationFrame(() => void fitView({ padding: 0.2 }));
  };

  const onExportPng = async () => {
    try {
      await downloadDiagramPng(projectName);
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Export PNG impossible.');
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const { project, warnings } = await readProjectFile(file);
      await withAutosaveSuspended(() => {
        loadProjectIntoStores(project);
      });
      useHistoryStore.getState().clear();
      await saveNow();
      notify('info', `Projet « ${project.name} » importé.`);
      for (const warning of warnings) {
        notify('info', warning);
      }
      requestAnimationFrame(() => void fitView({ padding: 0.2 }));
    } catch (error) {
      notify(
        'error',
        error instanceof FileFormatError
          ? `Import impossible : ${error.message}`
          : 'Import impossible : erreur inattendue à la lecture du fichier.',
      );
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <div className="flex items-center gap-2">
        <Database aria-hidden className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold tracking-tight">Modrise</span>
      </div>
      <Separator orientation="vertical" className="!h-6" />
      <Input
        value={projectName}
        onChange={(event) => renameProject(event.target.value)}
        aria-label="Nom du projet"
        className="h-8 w-56 border-transparent font-medium shadow-none hover:border-input"
        data-testid="project-name-input"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <FilePlus2 aria-hidden />
            Nouveau
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => void loadNewProject('empty')}>
            Projet vide
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void loadNewProject('hotel')}>
            Exemple : Gestion d'hôtel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
        <FolderOpen aria-hidden />
        Importer
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        data-testid="import-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onImportFile(file);
          event.target.value = '';
        }}
      />

      <Button
        size="sm"
        variant="ghost"
        onClick={() => downloadProjectFile(assembleCurrentProject())}
        data-testid="export-button"
      >
        <Download aria-hidden />
        Exporter
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" aria-label="Exporter en image">
            <Image aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => downloadDiagramSvg(projectName)}
            data-testid="export-svg"
          >
            Exporter en SVG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void onExportPng()} data-testid="export-png">
            Exporter en PNG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="!h-6" />

      <Button size="sm" variant="ghost" onClick={() => void saveNow()} aria-label="Enregistrer">
        <Save aria-hidden />
      </Button>
      <span
        role="status"
        data-testid="save-status"
        className={cn(
          'min-w-0 truncate text-xs text-muted-foreground',
          saveStatus === 'error' && 'text-destructive',
        )}
      >
        {SAVE_STATUS_LABELS[saveStatus]}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Annuler (Ctrl+Z)"
                disabled={!canUndo}
                onClick={undo}
              >
                <Undo2 aria-hidden />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{undoLabel ? `Annuler « ${undoLabel} »` : 'Annuler (Ctrl+Z)'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Rétablir (Ctrl+Shift+Z)"
                disabled={!canRedo}
                onClick={redo}
              >
                <Redo2 aria-hidden />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {redoLabel ? `Rétablir « ${redoLabel} »` : 'Rétablir (Ctrl+Shift+Z)'}
          </TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="!h-6" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Centrer le diagramme (F)"
              onClick={() => void fitView({ padding: 0.2, duration: 300 })}
            >
              <Focus aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Centrer le diagramme (F)</TooltipContent>
        </Tooltip>
        <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
        </Button>
        <PlannedButton label="Paramètres" disabled>
          <Settings aria-hidden />
        </PlannedButton>
      </div>
    </header>
  );
}

/** Bouton désactivé pour une fonctionnalité honnêtement annoncée comme à venir. */
function PlannedButton({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button size="icon-sm" variant="ghost" aria-label={label} disabled={disabled}>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label} — Fonctionnalité prévue dans une prochaine version</TooltipContent>
    </Tooltip>
  );
}
