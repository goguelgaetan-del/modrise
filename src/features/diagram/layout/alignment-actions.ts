/**
 * Actions d'alignement et de distribution de la sélection courante — relient
 * la géométrie pure (`src/core/diagram/align.ts`) aux stores et à
 * l'historique. Chaque action produit au plus une seule entrée d'historique.
 */
import type { AlignDirection, DistributeDirection } from '@/core/diagram/align';
import { computeAlignment, computeDistribution } from '@/core/diagram/align';
import { withHistory } from '@/features/history/with-history';
import { useDiagramStore } from '@/stores/diagram-store';

function selectedNodes() {
  const { nodes, selectedNodeIds } = useDiagramStore.getState();
  const selected = new Set(selectedNodeIds);
  return nodes.filter((node) => selected.has(node.id));
}

export function alignSelection(direction: AlignDirection): void {
  const positions = computeAlignment(selectedNodes(), direction);
  if (positions.size === 0) return;
  withHistory('Aligner la sélection', () => {
    const { moveNode } = useDiagramStore.getState();
    for (const [nodeId, position] of positions) {
      moveNode(nodeId, position);
    }
  });
}

export function distributeSelection(direction: DistributeDirection): void {
  const positions = computeDistribution(selectedNodes(), direction);
  if (positions.size === 0) return;
  withHistory('Distribuer la sélection', () => {
    const { moveNode } = useDiagramStore.getState();
    for (const [nodeId, position] of positions) {
      moveNode(nodeId, position);
    }
  });
}
