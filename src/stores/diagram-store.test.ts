import { beforeEach, describe, expect, it } from 'vitest';
import { createDiagramModel } from '@/core/diagram/types';
import { selectPersistedDiagram, useDiagramStore } from './diagram-store';

function store() {
  return useDiagramStore.getState();
}

beforeEach(() => {
  store().loadDiagram(createDiagramModel());
});

describe('diagramStore — nœuds et commentaires', () => {
  it('ajoute un nœud et retourne son id', () => {
    const id = store().addNode('model-1', 'entity', { x: 10, y: 20 });
    expect(store().nodes.map((n) => n.id)).toContain(id);
    expect(store().nodes.find((n) => n.id === id)?.position).toEqual({ x: 10, y: 20 });
  });

  it('ajoute un commentaire et son nœud associé', () => {
    const nodeId = store().addComment('Note', { x: 0, y: 0 });
    const node = store().nodes.find((n) => n.id === nodeId);
    expect(node?.nodeType).toBe('comment');
    const comment = store().comments.find((c) => c.id === node?.modelId);
    expect(comment?.text).toBe('Note');
  });

  it('met à jour le texte d’un commentaire existant', () => {
    const nodeId = store().addComment('Avant', { x: 0, y: 0 });
    const node = store().nodes.find((n) => n.id === nodeId)!;
    store().updateCommentText(node.modelId, 'Après');
    expect(store().comments.find((c) => c.id === node.modelId)?.text).toBe('Après');
  });

  it('removeNodesForModel retire le nœud, le commentaire et la sélection associés', () => {
    const nodeId = store().addComment('À supprimer', { x: 0, y: 0 });
    const node = store().nodes.find((n) => n.id === nodeId)!;
    store().setSelection([nodeId]);
    store().removeNodesForModel([node.modelId]);
    expect(store().nodes.find((n) => n.id === nodeId)).toBeUndefined();
    expect(store().comments.find((c) => c.id === node.modelId)).toBeUndefined();
    expect(store().selectedNodeIds).not.toContain(nodeId);
  });
});

describe('diagramStore — déplacement et verrouillage', () => {
  it('déplace un nœud non verrouillé', () => {
    const id = store().addNode('model-1', 'entity', { x: 0, y: 0 });
    store().moveNode(id, { x: 100, y: 50 });
    expect(store().nodes.find((n) => n.id === id)?.position).toEqual({ x: 100, y: 50 });
  });

  it('ne déplace jamais un nœud verrouillé, quelle que soit l’origine de l’appel', () => {
    const id = store().addNode('model-1', 'entity', { x: 0, y: 0 });
    store().setNodeLocked(id, true);
    store().moveNode(id, { x: 999, y: 999 });
    expect(store().nodes.find((n) => n.id === id)?.position).toEqual({ x: 0, y: 0 });
  });

  it('un nœud redevient déplaçable après déverrouillage', () => {
    const id = store().addNode('model-1', 'entity', { x: 0, y: 0 });
    store().setNodeLocked(id, true);
    store().setNodeLocked(id, false);
    store().moveNode(id, { x: 5, y: 5 });
    expect(store().nodes.find((n) => n.id === id)?.position).toEqual({ x: 5, y: 5 });
  });

  it('setNodeSize met à jour width/height sans toucher au verrouillage', () => {
    const id = store().addNode('model-1', 'entity', { x: 0, y: 0 });
    store().setNodeLocked(id, true);
    store().setNodeSize(id, 220, 140);
    const node = store().nodes.find((n) => n.id === id);
    expect(node).toMatchObject({ width: 220, height: 140, locked: true });
  });
});

describe('diagramStore — sélection, viewport et collage', () => {
  it('setSelection remplace la sélection courante', () => {
    store().setSelection(['a', 'b']);
    expect(store().selectedNodeIds).toEqual(['a', 'b']);
  });

  it('setViewport met à jour le viewport', () => {
    store().setViewport({ x: 10, y: 20, zoom: 1.5 });
    expect(store().viewport).toEqual({ x: 10, y: 20, zoom: 1.5 });
  });

  it('pasteNodesAndComments ajoute des nœuds/commentaires déjà formés', () => {
    store().pasteNodesAndComments(
      [{ id: 'n1', modelId: 'm1', nodeType: 'entity', position: { x: 1, y: 1 } }],
      [{ id: 'c1', text: 'Collé' }],
    );
    expect(store().nodes.some((n) => n.id === 'n1')).toBe(true);
    expect(store().comments.some((c) => c.id === 'c1')).toBe(true);
  });
});

describe('selectPersistedDiagram', () => {
  it('exclut la sélection (état d’interface, non persisté)', () => {
    store().setSelection(['x']);
    const persisted = selectPersistedDiagram(store());
    expect(persisted).not.toHaveProperty('selectedNodeIds');
    expect(persisted).toEqual({ nodes: store().nodes, viewport: store().viewport, comments: store().comments });
  });
});
