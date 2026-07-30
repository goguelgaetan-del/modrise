import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { buildClipboard, remapForPaste } from './clipboard';

function setup() {
  const project = createHotelExampleProject();
  const { conceptualModel, diagram } = project;
  const client = conceptualModel.entities.find((e) => e.name === 'CLIENT')!;
  const chambre = conceptualModel.entities.find((e) => e.name === 'CHAMBRE')!;
  const reservation = conceptualModel.entities.find((e) => e.name === 'RESERVATION')!;
  const effectuer = conceptualModel.associations.find((a) => a.name === 'EFFECTUER')!;
  const nodeFor = (modelId: string) => diagram.nodes.find((n) => n.modelId === modelId)!;
  return { conceptualModel, diagram, client, chambre, reservation, effectuer, nodeFor };
}

describe('buildClipboard', () => {
  it("renvoie undefined si la sélection est vide ou ne contient rien de copiable", () => {
    const { conceptualModel, diagram } = setup();
    expect(buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [])).toBeUndefined();
  });

  it('copie une seule entité sans ses associations', () => {
    const { conceptualModel, diagram, client, nodeFor } = setup();
    const clipboard = buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [
      nodeFor(client.id).id,
    ]);
    expect(clipboard).toBeDefined();
    expect(clipboard!.entities).toHaveLength(1);
    expect(clipboard!.entities[0]!.id).toBe(client.id);
    expect(clipboard!.associations).toHaveLength(0);
  });

  it("ne copie pas une association si moins de deux de ses participations sont dans la sélection", () => {
    const { conceptualModel, diagram, client, effectuer, nodeFor } = setup();
    const clipboard = buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [
      nodeFor(client.id).id,
      nodeFor(effectuer.id).id,
    ]);
    expect(clipboard!.associations).toHaveLength(0);
  });

  it('copie une association quand au moins deux de ses participations sont sélectionnées', () => {
    const { conceptualModel, diagram, client, reservation, effectuer, nodeFor } = setup();
    const clipboard = buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [
      nodeFor(client.id).id,
      nodeFor(reservation.id).id,
      nodeFor(effectuer.id).id,
    ]);
    expect(clipboard!.associations).toHaveLength(1);
    expect(clipboard!.associations[0]!.participations).toHaveLength(2);
  });
});

describe('remapForPaste', () => {
  it('génère de tout nouveaux ids sans référence partagée avec l’original', () => {
    const { conceptualModel, diagram, client, reservation, effectuer, nodeFor } = setup();
    const clipboard = buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [
      nodeFor(client.id).id,
      nodeFor(reservation.id).id,
      nodeFor(effectuer.id).id,
    ])!;

    const pasted = remapForPaste(clipboard, { x: 40, y: 40 });

    // Nouveaux ids d'entités, jamais ceux d'origine.
    const originalEntityIds = new Set(clipboard.entities.map((e) => e.id));
    for (const entity of pasted.entities) {
      expect(originalEntityIds.has(entity.id)).toBe(false);
    }
    // Les participations de l'association collée pointent vers les entités collées, pas les originales.
    const pastedEntityIds = new Set(pasted.entities.map((e) => e.id));
    for (const participation of pasted.associations[0]!.participations) {
      expect(pastedEntityIds.has(participation.entityId)).toBe(true);
    }
    // Aucun objet (attribut, identifiant) n'est partagé par référence avec l'original.
    expect(pasted.entities[0]!.attributes).not.toBe(clipboard.entities[0]!.attributes);
    expect(pasted.entities[0]).not.toBe(clipboard.entities[0]);
  });

  it('décale les positions des nœuds du décalage fourni', () => {
    const { conceptualModel, diagram, client, nodeFor } = setup();
    const originalNode = nodeFor(client.id);
    const clipboard = buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [
      originalNode.id,
    ])!;

    const pasted = remapForPaste(clipboard, { x: 30, y: 50 });

    expect(pasted.nodes[0]!.position).toEqual({
      x: originalNode.position.x + 30,
      y: originalNode.position.y + 50,
    });
    expect(pasted.nodes[0]!.id).not.toBe(originalNode.id);
  });

  it('deux collages successifs produisent des ids différents à chaque fois', () => {
    const { conceptualModel, diagram, client, nodeFor } = setup();
    const clipboard = buildClipboard(conceptualModel, diagram.nodes, diagram.comments, [
      nodeFor(client.id).id,
    ])!;

    const first = remapForPaste(clipboard, { x: 40, y: 40 });
    const second = remapForPaste(clipboard, { x: 80, y: 80 });

    expect(first.entities[0]!.id).not.toBe(second.entities[0]!.id);
    expect(first.nodes[0]!.id).not.toBe(second.nodes[0]!.id);
  });
});
