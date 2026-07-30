import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { createDiagramModel } from '@/core/diagram/types';
import { createConceptualModel } from '@/core/conceptual-model/factories';
import { computeDiagramBounds } from '@/core/diagram/bounds';
import { renderDiagramToSvg } from './to-svg';

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
});
