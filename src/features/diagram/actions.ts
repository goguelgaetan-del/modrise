/**
 * Actions de création d'éléments graphiques, partagées par la barre latérale
 * et le menu contextuel : chacune ajoute l'objet métier (si applicable), son
 * nœud graphique, historise l'opération en une seule entrée, puis
 * sélectionne le nouvel élément.
 */
import { withHistory } from '@/features/history/with-history';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';

export function createEntityAt(position: { x: number; y: number }): string {
  let nodeId = '';
  withHistory('Ajouter une entité', () => {
    const entity = useProjectStore.getState().addEntity();
    nodeId = useDiagramStore.getState().addNode(entity.id, 'entity', position);
  });
  useDiagramStore.getState().setSelection([nodeId]);
  return nodeId;
}

export function createAssociationAt(position: { x: number; y: number }): string {
  let nodeId = '';
  withHistory('Ajouter une association', () => {
    const association = useProjectStore.getState().addAssociation();
    nodeId = useDiagramStore.getState().addNode(association.id, 'association', position);
  });
  useDiagramStore.getState().setSelection([nodeId]);
  return nodeId;
}

export function createCommentAt(position: { x: number; y: number }): string {
  let nodeId = '';
  withHistory('Ajouter un commentaire', () => {
    nodeId = useDiagramStore.getState().addComment('', position);
  });
  useDiagramStore.getState().setSelection([nodeId]);
  return nodeId;
}
