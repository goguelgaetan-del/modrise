import { describe, expect, it } from 'vitest';
import {
  createAssociation,
  createAttribute,
  createEntity,
  createIdentifier,
  createParticipation,
} from './factories';
import { validateDataType } from './data-types';

describe('createEntity', () => {
  it("crée une entité avec un identifiant primaire référençant l'attribut id", () => {
    const entity = createEntity({ name: 'CLIENT' });
    expect(entity.name).toBe('CLIENT');
    expect(entity.attributes).toHaveLength(1);
    expect(entity.identifiers).toHaveLength(1);
    const identifier = entity.identifiers[0];
    expect(identifier?.primary).toBe(true);
    expect(identifier?.attributeIds).toEqual([entity.attributes[0]?.id]);
  });

  it('génère des ids uniques', () => {
    const a = createEntity();
    const b = createEntity();
    expect(a.id).not.toBe(b.id);
  });
});

describe('createAttribute', () => {
  it('produit un type par défaut valide', () => {
    const attribute = createAttribute();
    expect(validateDataType(attribute.dataType)).toEqual([]);
  });
});

describe('createIdentifier', () => {
  it('supporte les identifiants composés', () => {
    const identifier = createIdentifier({ attributeIds: ['a1', 'a2'], primary: true });
    expect(identifier.attributeIds).toEqual(['a1', 'a2']);
    expect(identifier.primary).toBe(true);
  });
});

describe('createAssociation', () => {
  it('crée une association sans participation par défaut', () => {
    const association = createAssociation({ name: 'PASSER' });
    expect(association.name).toBe('PASSER');
    expect(association.participations).toEqual([]);
    expect(association.attributes).toEqual([]);
  });
});

describe('createParticipation', () => {
  it('utilise la cardinalité 0,N par défaut', () => {
    const participation = createParticipation({ entityId: 'e1' });
    expect(participation.cardinality).toEqual({ min: 0, max: 'N' });
  });
});
