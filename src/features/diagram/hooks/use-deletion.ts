/**
 * Suppression des nœuds sélectionnés avec garde-fou : une entité référencée
 * par des associations n'est jamais supprimée silencieusement — une
 * confirmation listant les associations impactées est demandée.
 */
import { useCallback, useState } from 'react';
import { associationsReferencingEntity } from '@/core/conceptual-model/operations';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';

export interface PendingDeletion {
  entityIds: string[];
  associationIds: string[];
  /** Noms des entités référencées et des associations impactées. */
  blockedEntityNames: string[];
  impactedAssociationNames: string[];
}

export interface DeletionApi {
  /** Demande la suppression de la sélection courante. */
  requestDeleteSelection: () => void;
  /** Suppression en attente de confirmation, s'il y en a une. */
  pendingDeletion: PendingDeletion | null;
  confirmPendingDeletion: () => void;
  cancelPendingDeletion: () => void;
}

function executeDeletion(entityIds: string[], associationIds: string[]): void {
  const projectStore = useProjectStore.getState();
  const diagramStore = useDiagramStore.getState();
  for (const associationId of associationIds) {
    projectStore.removeAssociation(associationId);
  }
  for (const entityId of entityIds) {
    projectStore.removeEntity(entityId, true);
  }
  diagramStore.removeNodesForModel([...entityIds, ...associationIds]);
  diagramStore.setSelection([]);
}

export function useDeletion(): DeletionApi {
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const requestDeleteSelection = useCallback(() => {
    const { nodes, selectedNodeIds } = useDiagramStore.getState();
    const { conceptualModel } = useProjectStore.getState();
    const selectedNodes = nodes.filter((node) => selectedNodeIds.includes(node.id));
    if (selectedNodes.length === 0) return;

    const entityIds = selectedNodes
      .filter((node) => node.nodeType === 'entity')
      .map((node) => node.modelId);
    const associationIds = selectedNodes
      .filter((node) => node.nodeType === 'association')
      .map((node) => node.modelId);

    const deletedAssociations = new Set(associationIds);
    const blockedEntityNames: string[] = [];
    const impactedAssociations = new Map<string, string>();
    for (const entityId of entityIds) {
      const referencing = associationsReferencingEntity(conceptualModel, entityId);
      const blocking = referencing.filter(
        (association) => !deletedAssociations.has(association.id),
      );
      if (blocking.length > 0) {
        const entity = conceptualModel.entities.find((e) => e.id === entityId);
        blockedEntityNames.push(entity?.name ?? entityId);
        for (const association of blocking) {
          impactedAssociations.set(association.id, association.name);
        }
      }
    }

    if (blockedEntityNames.length > 0) {
      setPendingDeletion({
        entityIds,
        associationIds,
        blockedEntityNames,
        impactedAssociationNames: [...impactedAssociations.values()],
      });
      return;
    }
    executeDeletion(entityIds, associationIds);
  }, []);

  const confirmPendingDeletion = useCallback(() => {
    if (!pendingDeletion) return;
    executeDeletion(pendingDeletion.entityIds, pendingDeletion.associationIds);
    setPendingDeletion(null);
  }, [pendingDeletion]);

  const cancelPendingDeletion = useCallback(() => setPendingDeletion(null), []);

  return { requestDeleteSelection, pendingDeletion, confirmPendingDeletion, cancelPendingDeletion };
}
