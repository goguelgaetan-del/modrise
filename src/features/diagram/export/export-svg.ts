/**
 * Export SVG du diagramme entier (entités, associations, cardinalités,
 * rôles, commentaires, liens, texte) : document vectoriel autonome, cadré
 * sur le contenu du diagramme indépendamment du viewport affiché à l'écran.
 */
import { computeDiagramBounds } from '@/core/diagram/bounds';
import { renderDiagramToSvg } from '@/core/export/to-svg';
import { slugify } from '@/lib/slugify';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';

const BOUNDS_MARGIN_PX = 60;

export function diagramExportFileName(projectName: string, extension: string): string {
  return `${slugify(projectName, 'projet')}.mcd.${extension}`;
}

export function downloadDiagramSvg(projectName: string): void {
  const { conceptualModel } = useProjectStore.getState();
  const { nodes, comments } = useDiagramStore.getState();
  const bounds = computeDiagramBounds(nodes, BOUNDS_MARGIN_PX);
  const svg = renderDiagramToSvg(conceptualModel, nodes, comments, bounds);

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = diagramExportFileName(projectName, 'svg');
  anchor.click();
  URL.revokeObjectURL(url);
}
