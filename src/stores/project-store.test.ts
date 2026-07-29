import { beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '@/core/project/types';
import { isPrimaryAttribute } from '@/core/conceptual-model/operations';
import { useProjectStore } from './project-store';

function store() {
  return useProjectStore.getState();
}

beforeEach(() => {
  store().loadProject(createProject());
});

describe('projectStore — entités', () => {
  it('crée une entité dans le modèle conceptuel', () => {
    const entity = store().addEntity();
    expect(store().conceptualModel.entities.map((e) => e.id)).toContain(entity.id);
  });

  it("modifie le nom d'une entité", () => {
    const entity = store().addEntity();
    store().updateEntity(entity.id, { name: 'CLIENT' });
    expect(store().conceptualModel.entities[0]?.name).toBe('CLIENT');
  });

  it('met à jour updatedAt à chaque modification', () => {
    const before = store().updatedAt;
    store().addEntity();
    expect(store().updatedAt >= before).toBe(true);
  });
});

describe('projectStore — attributs et identifiants', () => {
  it('ajoute un attribut à une entité', () => {
    const entity = store().addEntity();
    store().addAttribute(entity.id);
    expect(store().conceptualModel.entities[0]?.attributes).toHaveLength(2);
  });

  it("retire l'attribut supprimé des identifiants (pas de référence pendante)", () => {
    const entity = store().addEntity();
    const idAttribute = entity.attributes[0];
    if (!idAttribute) throw new Error('attribut attendu');
    store().removeAttribute(entity.id, idAttribute.id);
    const updated = store().conceptualModel.entities[0];
    expect(updated?.attributes).toHaveLength(0);
    expect(updated?.identifiers[0]?.attributeIds).toEqual([]);
  });

  it("bascule l'appartenance à l'identifiant primaire (identifiant composé)", () => {
    const entity = store().addEntity();
    store().addAttribute(entity.id);
    const second = store().conceptualModel.entities[0]?.attributes[1];
    if (!second) throw new Error('attribut attendu');
    store().toggleAttributeInPrimaryIdentifier(entity.id, second.id);
    const updated = store().conceptualModel.entities[0];
    if (!updated) throw new Error('entité attendue');
    expect(isPrimaryAttribute(updated, second.id)).toBe(true);
    expect(updated.identifiers[0]?.attributeIds).toHaveLength(2);
  });

  it("réordonne les attributs d'une entité", () => {
    const entity = store().addEntity();
    store().addAttribute(entity.id);
    const names = () => store().conceptualModel.entities[0]?.attributes.map((a) => a.name);
    const [first, second] = store().conceptualModel.entities[0]?.attributes ?? [];
    if (!first || !second) throw new Error('attributs attendus');
    store().moveAttribute(entity.id, second.id, 'up');
    expect(names()).toEqual([second.name, first.name]);
  });
});

describe('projectStore — associations et participations', () => {
  it('crée une association et des participations', () => {
    const entity = store().addEntity();
    const association = store().addAssociation();
    store().addParticipation(association.id, entity.id);
    expect(store().conceptualModel.associations[0]?.participations).toHaveLength(1);
  });

  it('modifie cardinalité et rôle d’une participation', () => {
    const entity = store().addEntity();
    const association = store().addAssociation();
    store().addParticipation(association.id, entity.id);
    const participation = store().conceptualModel.associations[0]?.participations[0];
    if (!participation) throw new Error('participation attendue');
    store().updateParticipation(association.id, participation.id, {
      cardinality: { min: 1, max: 1 },
      role: 'manager',
    });
    const updated = store().conceptualModel.associations[0]?.participations[0];
    expect(updated?.cardinality).toEqual({ min: 1, max: 1 });
    expect(updated?.role).toBe('manager');
  });

  it('ignore une participation vers une entité inexistante', () => {
    const association = store().addAssociation();
    store().addParticipation(association.id, 'entite-fantome');
    expect(store().conceptualModel.associations[0]?.participations).toHaveLength(0);
  });
});

describe('projectStore — suppression protégée', () => {
  it('refuse de supprimer silencieusement une entité référencée', () => {
    const entity = store().addEntity();
    const association = store().addAssociation();
    store().addParticipation(association.id, entity.id);

    const { blockedBy } = store().removeEntity(entity.id, false);
    expect(blockedBy.map((a) => a.id)).toEqual([association.id]);
    expect(store().conceptualModel.entities).toHaveLength(1);
  });

  it('supprime en cascade les participations quand la suppression est forcée', () => {
    const entity = store().addEntity();
    const association = store().addAssociation();
    store().addParticipation(association.id, entity.id);

    const { blockedBy } = store().removeEntity(entity.id, true);
    expect(blockedBy).toEqual([]);
    expect(store().conceptualModel.entities).toHaveLength(0);
    expect(store().conceptualModel.associations[0]?.participations).toHaveLength(0);
  });

  it('supprime une entité non référencée sans confirmation', () => {
    const entity = store().addEntity();
    const { blockedBy } = store().removeEntity(entity.id, false);
    expect(blockedBy).toEqual([]);
    expect(store().conceptualModel.entities).toHaveLength(0);
  });
});
