import { describe, expect, it } from 'vitest';
import { createAttribute, createEntity } from './factories';
import {
  addAlternateIdentifier,
  addAttributeToIdentifier,
  alternateIdentifiers,
  isAlternateIdentifierAttribute,
  isPrimaryAttribute,
  moveIdentifierAttribute,
  primaryIdentifier,
  promoteIdentifierToPrimary,
  removeAttributeFromIdentifier,
  removeIdentifier,
  renameIdentifier,
} from './operations';

let sequence = 0;
function nextId(): string {
  sequence += 1;
  return `id-${sequence}`;
}

describe('identifiants alternatifs', () => {
  it('addAlternateIdentifier ajoute un identifiant non primaire vide', () => {
    const entity = createEntity({ name: 'CLIENT' });
    const identifier = addAlternateIdentifier(entity, nextId);
    expect(identifier.primary).toBe(false);
    expect(identifier.attributeIds).toEqual([]);
    expect(alternateIdentifiers(entity)).toHaveLength(1);
  });

  it('renameIdentifier renomme, un nom vide redevient « sans nom »', () => {
    const entity = createEntity({ name: 'CLIENT' });
    const identifier = addAlternateIdentifier(entity, nextId);
    renameIdentifier(entity, identifier.id, 'UQ_CLIENT_EMAIL');
    expect(identifier.name).toBe('UQ_CLIENT_EMAIL');
    renameIdentifier(entity, identifier.id, '   ');
    expect(identifier.name).toBeUndefined();
  });

  it('addAttributeToIdentifier ajoute sans dupliquer', () => {
    const entity = createEntity({ name: 'CLIENT' });
    const email = createAttribute({ name: 'email' });
    entity.attributes.push(email);
    const identifier = addAlternateIdentifier(entity, nextId);
    addAttributeToIdentifier(entity, identifier.id, email.id);
    addAttributeToIdentifier(entity, identifier.id, email.id);
    expect(identifier.attributeIds).toEqual([email.id]);
  });

  it('removeAttributeFromIdentifier retire un attribut', () => {
    const entity = createEntity({ name: 'CLIENT' });
    const email = createAttribute({ name: 'email' });
    entity.attributes.push(email);
    const identifier = addAlternateIdentifier(entity, nextId);
    addAttributeToIdentifier(entity, identifier.id, email.id);
    removeAttributeFromIdentifier(entity, identifier.id, email.id);
    expect(identifier.attributeIds).toEqual([]);
  });

  it('moveIdentifierAttribute réordonne, ne fait rien hors limites', () => {
    const entity = createEntity({ name: 'LIGNE' });
    const a = createAttribute({ name: 'a' });
    const b = createAttribute({ name: 'b' });
    entity.attributes.push(a, b);
    const identifier = addAlternateIdentifier(entity, nextId);
    addAttributeToIdentifier(entity, identifier.id, a.id);
    addAttributeToIdentifier(entity, identifier.id, b.id);

    moveIdentifierAttribute(entity, identifier.id, b.id, 'up');
    expect(identifier.attributeIds).toEqual([b.id, a.id]);

    moveIdentifierAttribute(entity, identifier.id, b.id, 'up');
    expect(identifier.attributeIds).toEqual([b.id, a.id]);

    moveIdentifierAttribute(entity, identifier.id, a.id, 'down');
    expect(identifier.attributeIds).toEqual([b.id, a.id]);
  });

  it('removeIdentifier supprime un alternatif mais jamais le primaire', () => {
    const entity = createEntity({ name: 'CLIENT' });
    const identifier = addAlternateIdentifier(entity, nextId);
    const primaryId = primaryIdentifier(entity)!.id;

    removeIdentifier(entity, primaryId);
    expect(primaryIdentifier(entity)).toBeDefined();

    removeIdentifier(entity, identifier.id);
    expect(alternateIdentifiers(entity)).toHaveLength(0);
  });

  it("promoteIdentifierToPrimary promeut l'alternatif et rétrograde l'ancien primaire", () => {
    const entity = createEntity({ name: 'CLIENT' });
    const oldPrimaryId = primaryIdentifier(entity)!.id;
    const email = createAttribute({ name: 'email' });
    entity.attributes.push(email);
    const alternate = addAlternateIdentifier(entity, nextId);
    addAttributeToIdentifier(entity, alternate.id, email.id);

    promoteIdentifierToPrimary(entity, alternate.id);

    expect(primaryIdentifier(entity)?.id).toBe(alternate.id);
    const oldPrimary = entity.identifiers.find((i) => i.id === oldPrimaryId);
    expect(oldPrimary?.primary).toBe(false);
    // Une seule et unique identifiant primaire à tout moment.
    expect(entity.identifiers.filter((i) => i.primary)).toHaveLength(1);
  });

  it('isAlternateIdentifierAttribute distingue clé primaire, clé alternative et attribut simple', () => {
    const entity = createEntity({ name: 'CLIENT' });
    const primaryAttributeId = primaryIdentifier(entity)!.attributeIds[0]!;
    const email = createAttribute({ name: 'email' });
    const telephone = createAttribute({ name: 'telephone' });
    entity.attributes.push(email, telephone);
    const alternate = addAlternateIdentifier(entity, nextId);
    addAttributeToIdentifier(entity, alternate.id, email.id);

    expect(isPrimaryAttribute(entity, primaryAttributeId)).toBe(true);
    expect(isAlternateIdentifierAttribute(entity, email.id)).toBe(true);
    expect(isAlternateIdentifierAttribute(entity, telephone.id)).toBe(false);
    expect(isPrimaryAttribute(entity, email.id)).toBe(false);
  });
});
