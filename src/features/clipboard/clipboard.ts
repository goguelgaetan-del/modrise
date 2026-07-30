/**
 * Logique pure du presse-papiers : construction depuis une sélection, puis
 * remappage complet des identifiants pour le collage ou la duplication.
 * Aucune dépendance à React, Zustand ou React Flow — testable isolément.
 */
import { createId } from '@/core/id';
import type { Association, ConceptualModel, Entity, Participation } from '@/core/conceptual-model/types';
import type { DiagramComment, DiagramNode } from '@/core/diagram/types';
import type { EditorClipboard } from './types';

/**
 * Construit un presse-papiers à partir des nœuds sélectionnés.
 *
 * Une association n'est copiée que si au moins deux de ses participations
 * pointent vers des entités elles-mêmes présentes dans la sélection ; sinon
 * elle deviendrait invalide (moins de deux participations) et n'est pas
 * copiée. Retourne `undefined` si rien de copiable n'est sélectionné.
 */
export function buildClipboard(
  model: ConceptualModel,
  diagramNodes: DiagramNode[],
  diagramComments: DiagramComment[],
  selectedNodeIds: string[],
): EditorClipboard | undefined {
  const selectedIds = new Set(selectedNodeIds);
  const selectedNodes = diagramNodes.filter((node) => selectedIds.has(node.id));
  if (selectedNodes.length === 0) return undefined;

  const entityIds = new Set(
    selectedNodes.filter((node) => node.nodeType === 'entity').map((node) => node.modelId),
  );
  const commentIds = new Set(
    selectedNodes.filter((node) => node.nodeType === 'comment').map((node) => node.modelId),
  );
  const selectedAssociationIds = new Set(
    selectedNodes.filter((node) => node.nodeType === 'association').map((node) => node.modelId),
  );

  const entities = model.entities.filter((entity) => entityIds.has(entity.id));

  const copiedAssociationIds = new Set<string>();
  const associations: Association[] = [];
  for (const association of model.associations) {
    if (!selectedAssociationIds.has(association.id)) continue;
    const validParticipations = association.participations.filter((p) => entityIds.has(p.entityId));
    if (validParticipations.length < 2) continue; // deviendrait invalide : on ne la copie pas
    associations.push({ ...association, participations: validParticipations });
    copiedAssociationIds.add(association.id);
  }

  const comments = diagramComments.filter((comment) => commentIds.has(comment.id));

  const nodes = selectedNodes.filter((node) => {
    if (node.nodeType === 'entity') return entityIds.has(node.modelId);
    if (node.nodeType === 'comment') return commentIds.has(node.modelId);
    if (node.nodeType === 'association') return copiedAssociationIds.has(node.modelId);
    return false;
  });

  if (entities.length === 0 && associations.length === 0 && comments.length === 0) {
    return undefined;
  }

  return { entities, associations, comments, nodes };
}

/**
 * Remappe entièrement un presse-papiers pour un collage : nouveaux ids pour
 * chaque entité, attribut, identifiant, association, attribut d'association,
 * participation, commentaire et nœud graphique — jamais de référence
 * partagée avec l'original. Les positions des nœuds sont décalées de
 * `offset`.
 */
export function remapForPaste(
  clipboard: EditorClipboard,
  offset: { x: number; y: number },
): { entities: Entity[]; associations: Association[]; comments: DiagramComment[]; nodes: DiagramNode[] } {
  const idMap = new Map<string, string>();

  const entities = clipboard.entities.map((entity) => cloneEntity(entity, idMap));
  const associations = clipboard.associations.map((association) => cloneAssociation(association, idMap));
  const comments = clipboard.comments.map((comment) => {
    const newId = createId();
    idMap.set(comment.id, newId);
    return { id: newId, text: comment.text };
  });

  const nodes: DiagramNode[] = [];
  for (const node of clipboard.nodes) {
    const newModelId = idMap.get(node.modelId);
    if (!newModelId) continue; // défensif : ne devrait pas arriver, cf. buildClipboard
    nodes.push({
      id: createId(),
      modelId: newModelId,
      nodeType: node.nodeType,
      position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
      width: node.width,
      height: node.height,
    });
  }

  return { entities, associations, comments, nodes };
}

function cloneEntity(entity: Entity, idMap: Map<string, string>): Entity {
  const newEntityId = createId();
  idMap.set(entity.id, newEntityId);
  const attributeIdMap = new Map<string, string>();
  const attributes = entity.attributes.map((attribute) => {
    const newAttributeId = createId();
    attributeIdMap.set(attribute.id, newAttributeId);
    return { ...attribute, id: newAttributeId };
  });
  const identifiers = entity.identifiers.map((identifier) => ({
    ...identifier,
    id: createId(),
    attributeIds: identifier.attributeIds.map((id) => attributeIdMap.get(id) ?? id),
  }));
  return { ...entity, id: newEntityId, attributes, identifiers };
}

function cloneAssociation(association: Association, idMap: Map<string, string>): Association {
  const newAssociationId = createId();
  const attributes = association.attributes.map((attribute) => ({ ...attribute, id: createId() }));
  const participations: Participation[] = [];
  for (const participation of association.participations) {
    const newEntityId = idMap.get(participation.entityId);
    if (!newEntityId) continue; // défensif : cf. buildClipboard, ne devrait pas arriver
    participations.push({ ...participation, id: createId(), entityId: newEntityId });
  }
  idMap.set(association.id, newAssociationId);
  return { ...association, id: newAssociationId, attributes, participations };
}
