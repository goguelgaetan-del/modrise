import { describe, expect, it } from 'vitest';
import type { ConceptualModel } from '@/core/conceptual-model/types';
import type { DiagramNode } from '@/core/diagram/types';
import {
  createAssociation,
  createEntity,
  createParticipation,
} from '@/core/conceptual-model/factories';
import {
  applyDragPreviewToEdges,
  applyDragPreviewToNodes,
  toReactFlowEdges,
  toReactFlowNodes,
} from './to-react-flow';

const noErrors = new Set<string>();

function buildModel() {
  const client = createEntity({ name: 'CLIENT' });
  const produit = createEntity({ name: 'PRODUIT' });
  const acheter = createAssociation({ name: 'ACHETER' });
  acheter.participations = [
    createParticipation({ entityId: client.id, cardinality: { min: 0, max: 'N' } }),
    createParticipation({ entityId: produit.id, cardinality: { min: 1, max: 1 } }),
  ];
  const model: ConceptualModel = { entities: [client, produit], associations: [acheter] };
  const nodes: DiagramNode[] = [
    { id: 'n-client', modelId: client.id, nodeType: 'entity', position: { x: 0, y: 0 } },
    { id: 'n-produit', modelId: produit.id, nodeType: 'entity', position: { x: 600, y: 0 } },
    { id: 'n-acheter', modelId: acheter.id, nodeType: 'association', position: { x: 300, y: 0 } },
  ];
  return { model, nodes };
}

describe('superposition des positions d’un déplacement en cours', () => {
  it('retourne le tableau d’origine sans déplacement actif', () => {
    const { model, nodes } = buildModel();
    const rfNodes = toReactFlowNodes(nodes, model, [], [], noErrors);
    expect(applyDragPreviewToNodes(rfNodes, null)).toBe(rfNodes);
    expect(applyDragPreviewToNodes(rfNodes, {})).toBe(rfNodes);
  });

  it('retourne le tableau d’origine si la position est inchangée', () => {
    const { model, nodes } = buildModel();
    const rfNodes = toReactFlowNodes(nodes, model, [], [], noErrors);
    expect(applyDragPreviewToNodes(rfNodes, { 'n-client': { x: 0, y: 0 } })).toBe(rfNodes);
  });

  it('ne remplace que le nœud déplacé et préserve l’identité des autres', () => {
    const { model, nodes } = buildModel();
    const rfNodes = toReactFlowNodes(nodes, model, [], [], noErrors);
    const next = applyDragPreviewToNodes(rfNodes, { 'n-client': { x: 42, y: 24 } });

    expect(next).not.toBe(rfNodes);
    expect(next[0]!.position).toEqual({ x: 42, y: 24 });
    expect(next[1]).toBe(rfNodes[1]);
    expect(next[2]).toBe(rfNodes[2]);
    // Les données métier ne sont pas reconstruites : le `memo` du nœud tient.
    expect(next[0]!.data).toBe(rfNodes[0]!.data);
  });

  it('ne recalcule que les arêtes touchées par le déplacement', () => {
    const { model, nodes } = buildModel();
    const rfEdges = toReactFlowEdges(nodes, model, noErrors);
    expect(rfEdges).toHaveLength(2);

    // CLIENT passe à droite de l'association : son arête change de côté de
    // raccordement, celle de PRODUIT n'a aucune raison de bouger.
    const next = applyDragPreviewToEdges(rfEdges, nodes, { 'n-client': { x: 1200, y: 0 } });
    const clientEdge = next.find((edge) => edge.source === 'n-client')!;
    const produitEdge = next.find((edge) => edge.source === 'n-produit')!;

    expect(clientEdge.sourceHandle).not.toBe(rfEdges[0]!.sourceHandle);
    expect(produitEdge).toBe(rfEdges.find((edge) => edge.source === 'n-produit'));
  });

  it('retourne les arêtes d’origine si aucune n’est touchée', () => {
    const { model, nodes } = buildModel();
    const rfEdges = toReactFlowEdges(nodes, model, noErrors);
    expect(applyDragPreviewToEdges(rfEdges, nodes, null)).toBe(rfEdges);
    expect(applyDragPreviewToEdges(rfEdges, nodes, { 'n-inconnu': { x: 9, y: 9 } })).toBe(rfEdges);
  });

  it('garde l’arête identique si le côté de raccordement ne change pas', () => {
    const { model, nodes } = buildModel();
    const rfEdges = toReactFlowEdges(nodes, model, noErrors);
    // Petit déplacement vertical : CLIENT reste à gauche de l'association.
    const next = applyDragPreviewToEdges(rfEdges, nodes, { 'n-client': { x: 0, y: 10 } });
    expect(next).toBe(rfEdges);
  });
});
