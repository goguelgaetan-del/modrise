/**
 * Export PNG du diagramme entier : rasterise le même document SVG que
 * l'export vectoriel (`renderDiagramToSvg`) sur un canvas hors écran, en
 * haute résolution. Ne dépend d'aucune bibliothèque tierce ni du DOM React
 * Flow : capturer le DOM réel (essayé avec `html-to-image`) s'est avéré peu
 * fiable — chaque arête de participation vit dans son propre petit `<svg>`
 * stylé par des classes Tailwind, et ce style ne survit pas au clonage DOM,
 * ce qui faisait disparaître les liens sur l'image exportée. Rasteriser
 * notre propre rendu vectoriel garantit une fidélité parfaite avec le SVG.
 */
import { computeDiagramBounds } from '@/core/diagram/bounds';
import { renderDiagramToSvg } from '@/core/export/to-svg';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';
import { diagramExportFileName } from './export-svg';

const BOUNDS_MARGIN_PX = 60;
const PIXEL_RATIO = 2;

export class DiagramExportError extends Error {}

function rasterizeSvgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * PIXEL_RATIO;
      canvas.height = height * PIXEL_RATIO;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new DiagramExportError('Contexte canvas indisponible.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new DiagramExportError('Échec de génération du PNG.'));
      }, 'image/png');
    };
    image.onerror = () => reject(new DiagramExportError('Échec du chargement du rendu SVG.'));
    image.src = svgUrl;
  }).finally(() => URL.revokeObjectURL(svgUrl));
}

export async function downloadDiagramPng(projectName: string): Promise<void> {
  const { conceptualModel } = useProjectStore.getState();
  const { nodes, comments } = useDiagramStore.getState();
  const bounds = computeDiagramBounds(nodes, BOUNDS_MARGIN_PX);
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new DiagramExportError('Le diagramme est vide : rien à exporter.');
  }

  const svg = renderDiagramToSvg(conceptualModel, nodes, comments, bounds);
  const blob = await rasterizeSvgToPng(svg, bounds.width, bounds.height);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = diagramExportFileName(projectName, 'png');
  anchor.click();
  URL.revokeObjectURL(url);
}
