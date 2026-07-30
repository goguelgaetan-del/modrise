import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { createConceptualModel } from '@/core/conceptual-model/factories';
import type { DiagramNode } from '@/core/diagram/types';
import { computeAutoLayout } from './auto-layout';

function node(id: string, modelId: string, nodeType: DiagramNode['nodeType']): DiagramNode {
  return { id, modelId, nodeType, position: { x: 0, y: 0 }, width: 200, height: 100 };
}

describe('computeAutoLayout', () => {
  it("positionne toutes les entités et associations d'un modèle connexe sans chevauchement évident", async () => {
    const project = createHotelExampleProject();
    const positions = await computeAutoLayout(
      project.diagram.nodes,
      project.conceptualModel,
      'horizontal',
    );
    expect(positions.size).toBe(project.diagram.nodes.length);

    const boxes = project.diagram.nodes.map((n) => {
      const pos = positions.get(n.id)!;
      return { x: pos.x, y: pos.y, width: n.width ?? 200, height: n.height ?? 100 };
    });
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap =
          a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('est déterministe : deux calculs sur le même modèle produisent les mêmes positions', async () => {
    const project = createHotelExampleProject();
    const first = await computeAutoLayout(project.diagram.nodes, project.conceptualModel, 'horizontal');
    const second = await computeAutoLayout(
      project.diagram.nodes,
      project.conceptualModel,
      'horizontal',
    );
    for (const [id, pos] of first) {
      expect(second.get(id)).toEqual(pos);
    }
  });

  it('respecte l’orientation demandée (horizontal étale en largeur, vertical en hauteur)', async () => {
    // Chaîne linéaire E1-A1-E2-A2-E3 : une seule branche par rang, pour que
    // l'orientation détermine sans ambiguïté l'axe dominant de l'étalement.
    const model = createConceptualModel();
    model.entities.push(
      { id: 'e1', name: 'A', description: '', attributes: [], identifiers: [] },
      { id: 'e2', name: 'B', description: '', attributes: [], identifiers: [] },
      { id: 'e3', name: 'C', description: '', attributes: [], identifiers: [] },
    );
    model.associations.push(
      {
        id: 'a1',
        name: 'REL1',
        description: '',
        attributes: [],
        participations: [
          { id: 'p1', entityId: 'e1', cardinality: { min: 0, max: 'N' } },
          { id: 'p2', entityId: 'e2', cardinality: { min: 0, max: 1 } },
        ],
      },
      {
        id: 'a2',
        name: 'REL2',
        description: '',
        attributes: [],
        participations: [
          { id: 'p3', entityId: 'e2', cardinality: { min: 0, max: 'N' } },
          { id: 'p4', entityId: 'e3', cardinality: { min: 0, max: 1 } },
        ],
      },
    );
    const nodes = [
      node('n1', 'e1', 'entity'),
      node('n2', 'a1', 'association'),
      node('n3', 'e2', 'entity'),
      node('n4', 'a2', 'association'),
      node('n5', 'e3', 'entity'),
    ];

    const horizontal = await computeAutoLayout(nodes, model, 'horizontal');
    const vertical = await computeAutoLayout(nodes, model, 'vertical');

    // e1/e2/e3 (n1/n3/n5) forment le même « rang » (aucune arête entre
    // entités) : en horizontal ils doivent s'aligner sur le même x (colonnes
    // par rang) ; en vertical, sur le même y (lignes par rang).
    const sameRankNodeIds = ['n1', 'n3', 'n5'];
    const axisValues = (
      positions: Map<string, { x: number; y: number }>,
      axis: 'x' | 'y',
    ): number[] => sameRankNodeIds.map((id) => positions.get(id)![axis]);

    const horizontalXs = new Set(axisValues(horizontal, 'x'));
    const horizontalYs = new Set(axisValues(horizontal, 'y'));
    expect(horizontalXs.size).toBe(1); // même rang => même x en LR
    expect(horizontalYs.size).toBeGreaterThan(1); // étalés verticalement

    const verticalXs = new Set(axisValues(vertical, 'x'));
    const verticalYs = new Set(axisValues(vertical, 'y'));
    expect(verticalYs.size).toBe(1); // même rang => même y en TB
    expect(verticalXs.size).toBeGreaterThan(1); // étalés horizontalement
  });

  it('place une association réflexive sans erreur (arête multiple vers le même nœud)', async () => {
    const model = createConceptualModel();
    model.entities.push({
      id: 'e1',
      name: 'EMPLOYE',
      description: '',
      attributes: [],
      identifiers: [],
    });
    model.associations.push({
      id: 'a1',
      name: 'ENCADRER',
      description: '',
      attributes: [],
      participations: [
        { id: 'p1', entityId: 'e1', cardinality: { min: 0, max: 'N' }, role: 'manager' },
        { id: 'p2', entityId: 'e1', cardinality: { min: 0, max: 1 }, role: 'subordonné' },
      ],
    });
    const nodes = [node('n1', 'e1', 'entity'), node('n2', 'a1', 'association')];

    const positions = await computeAutoLayout(nodes, model, 'horizontal');
    expect(positions.size).toBe(2);
  });

  it('place les entités de graphes non connexes sans chevauchement', async () => {
    const model = createConceptualModel();
    model.entities.push(
      { id: 'e1', name: 'A', description: '', attributes: [], identifiers: [] },
      { id: 'e2', name: 'B', description: '', attributes: [], identifiers: [] },
    );
    const nodes = [node('n1', 'e1', 'entity'), node('n2', 'e2', 'entity')];

    const positions = await computeAutoLayout(nodes, model, 'horizontal');
    const a = positions.get('n1')!;
    const b = positions.get('n2')!;
    expect(a).not.toEqual(b);
  });

  it('inclut les commentaires comme nœuds sans arête, sans faire échouer le calcul', async () => {
    const model = createConceptualModel();
    model.entities.push({ id: 'e1', name: 'A', description: '', attributes: [], identifiers: [] });
    const nodes = [node('n1', 'e1', 'entity'), node('n2', 'c1', 'comment')];

    const positions = await computeAutoLayout(nodes, model, 'horizontal');
    expect(positions.size).toBe(2);
  });

  it('exclut les nœuds indiqués (verrouillés) des positions calculées', async () => {
    const project = createHotelExampleProject();
    const excluded = new Set([project.diagram.nodes[0]!.id]);
    const positions = await computeAutoLayout(
      project.diagram.nodes,
      project.conceptualModel,
      'horizontal',
      excluded,
    );
    expect(positions.has(project.diagram.nodes[0]!.id)).toBe(false);
    expect(positions.size).toBe(project.diagram.nodes.length - 1);
  });
});
