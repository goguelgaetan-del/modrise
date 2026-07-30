import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { createDiagramModel } from '@/core/diagram/types';
import { createConceptualModel } from '@/core/conceptual-model/factories';
import { computeDiagramBounds } from '@/core/diagram/bounds';
import { renderDiagramToSvg } from './to-svg';

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

describe('renderDiagramToSvg', () => {
  it("inclut les noms d'entités, d'associations et les cardinalités du projet d'exemple", () => {
    const project = createHotelExampleProject();
    const bounds = computeDiagramBounds(project.diagram.nodes, 60);
    const svg = renderDiagramToSvg(
      project.conceptualModel,
      project.diagram.nodes,
      project.diagram.comments,
      bounds,
    );

    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    for (const entity of project.conceptualModel.entities) {
      expect(svg).toContain(`>${entity.name}<`);
    }
    for (const association of project.conceptualModel.associations) {
      expect(svg).toContain(`>${association.name}<`);
      for (const participation of association.participations) {
        const label = `${participation.cardinality.min},${participation.cardinality.max}`;
        expect(svg).toContain(label);
      }
    }
  });

  it('échappe les caractères spéciaux XML dans les noms et les commentaires', () => {
    const model = createConceptualModel();
    model.entities.push({
      id: 'e1',
      name: `A & B <C> "quote"`,
      description: '',
      attributes: [],
      identifiers: [],
    });
    const diagram = createDiagramModel();
    diagram.nodes.push({ id: 'n1', modelId: 'e1', nodeType: 'entity', position: { x: 0, y: 0 } });
    diagram.comments.push({ id: 'c1', text: 'Note <script>alert(1)</script> & "test"' });
    diagram.nodes.push({ id: 'n2', modelId: 'c1', nodeType: 'comment', position: { x: 300, y: 0 } });

    const bounds = computeDiagramBounds(diagram.nodes, 40);
    const svg = renderDiagramToSvg(model, diagram.nodes, diagram.comments, bounds);

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&amp;');
    expect(svg).toContain('&lt;C&gt;');
    expect(svg).toContain('&quot;quote&quot;');
  });

  it('produit un document valide pour un diagramme vide', () => {
    const model = createConceptualModel();
    const bounds = computeDiagramBounds([], 40);
    const svg = renderDiagramToSvg(model, [], [], bounds);

    expect(svg).toContain('<svg');
    expect(svg).toContain('Diagramme vide');
  });

  it('inclut le rôle d’une participation et le texte des commentaires', () => {
    const project = createHotelExampleProject();
    const association = project.conceptualModel.associations.find((a) => a.name === 'EFFECTUER')!;
    association.participations[0]!.role = 'client principal';
    project.diagram.comments.push({ id: 'c1', text: 'Ne pas oublier la contrainte de dates' });
    project.diagram.nodes.push({
      id: 'n-comment',
      modelId: 'c1',
      nodeType: 'comment',
      position: { x: 900, y: 900 },
    });

    const bounds = computeDiagramBounds(project.diagram.nodes, 60);
    const svg = renderDiagramToSvg(
      project.conceptualModel,
      project.diagram.nodes,
      project.diagram.comments,
      bounds,
    );

    expect(svg).toContain('client principal');
    // Le texte est découpé en lignes (retour à la ligne glouton) : on vérifie
    // sa présence par fragments plutôt que la phrase entière sur une ligne.
    expect(svg).toContain('Ne pas oublier la');
    expect(svg).toContain('contrainte de dates');
  });

  it(
    'ancre les arêtes et leurs étiquettes de cardinalité au bord des boîtes, jamais à leur ' +
      'centre (régression : une étiquette au centre peut tomber sous le rectangle opaque du nœud)',
    () => {
      const model = createConceptualModel();
      model.entities.push({ id: 'e1', name: 'ENTITE', description: '', attributes: [], identifiers: [] });
      model.associations.push({
        id: 'a1',
        name: 'ASSOCIATION',
        description: '',
        attributes: [],
        participations: [
          { id: 'p1', entityId: 'e1', cardinality: { min: 0, max: 'N' } },
          { id: 'p2', entityId: 'e2', cardinality: { min: 1, max: 1 } },
        ],
      });
      model.entities.push({ id: 'e2', name: 'AUTRE', description: '', attributes: [], identifiers: [] });

      const entityNode = {
        id: 'n1',
        modelId: 'e1',
        nodeType: 'entity' as const,
        position: { x: 0, y: 0 },
        width: 200,
        height: 100,
      };
      const otherEntityNode = {
        id: 'n3',
        modelId: 'e2',
        nodeType: 'entity' as const,
        position: { x: 500, y: 300 },
        width: 200,
        height: 100,
      };
      const associationNode = {
        id: 'n2',
        modelId: 'a1',
        nodeType: 'association' as const,
        position: { x: 400, y: 0 },
        width: 160,
        height: 60,
      };
      const diagramNodes = [entityNode, associationNode, otherEntityNode];
      const bounds = computeDiagramBounds(diagramNodes, 60);
      const svg = renderDiagramToSvg(model, diagramNodes, [], bounds);

      const entityRect = { x: entityNode.position.x, y: entityNode.position.y, width: 200, height: 100 };
      const associationRect = {
        x: associationNode.position.x,
        y: associationNode.position.y,
        width: 160,
        height: 60,
      };

      // Étiquette de cardinalité "0,N" : son rectangle de fond (juste avant le
      // texte dans le document) ne doit chevaucher ni la boîte entité ni la
      // boîte association — sans quoi elle serait invisible, cachée dessous.
      const labelIndex = svg.indexOf('>0,N<');
      const rectBefore = svg.lastIndexOf('<rect', labelIndex);
      const rectTag = svg.slice(rectBefore, svg.indexOf('/>', rectBefore) + 2);
      const x = Number(/x="([-\d.]+)"/.exec(rectTag)![1]);
      const y = Number(/y="([-\d.]+)"/.exec(rectTag)![1]);
      const width = Number(/width="([-\d.]+)"/.exec(rectTag)![1]);
      const height = Number(/height="([-\d.]+)"/.exec(rectTag)![1]);
      const labelRect = { x, y, width, height };

      expect(rectsOverlap(labelRect, entityRect)).toBe(false);
      expect(rectsOverlap(labelRect, associationRect)).toBe(false);
    },
  );

  it('gère des nœuds à coordonnées négatives sans produire de document incohérent', () => {
    const model = createConceptualModel();
    model.entities.push({ id: 'e1', name: 'ENTITE', description: '', attributes: [], identifiers: [] });
    const diagramNodes = [
      {
        id: 'n1',
        modelId: 'e1',
        nodeType: 'entity' as const,
        position: { x: -300, y: -150 },
        width: 200,
        height: 100,
      },
    ];
    const bounds = computeDiagramBounds(diagramNodes, 40);
    const svg = renderDiagramToSvg(model, diagramNodes, [], bounds);

    expect(bounds.x).toBeLessThan(0);
    expect(svg).toContain('viewBox="-340 -190 280 180"');
    expect(svg).toContain('>ENTITE<');
  });
});
