import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '../examples/hotel';
import {
  createAssociation,
  createAttribute,
  createEntity,
  createParticipation,
} from '../conceptual-model/factories';
import type { ConceptualModel } from '../conceptual-model/types';
import { validateConceptualModel } from './validate';
import { VALIDATION_CODES as CODES } from './types';

function emptyModel(): ConceptualModel {
  return { entities: [], associations: [] };
}

function codesOf(model: ConceptualModel): string[] {
  return validateConceptualModel(model).map((issue) => issue.code);
}

describe('validateConceptualModel — erreurs', () => {
  it('signale une entité sans nom', () => {
    const model = emptyModel();
    model.entities.push(createEntity({ name: '   ' }));
    expect(codesOf(model)).toContain(CODES.entityWithoutName);
  });

  it("signale un nom d'entité dupliqué", () => {
    const model = emptyModel();
    model.entities.push(createEntity({ name: 'CLIENT' }), createEntity({ name: 'client' }));
    const issues = validateConceptualModel(model).filter(
      (issue) => issue.code === CODES.duplicateEntityName,
    );
    expect(issues).toHaveLength(2);
  });

  it('signale une entité sans identifiant primaire', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    entity.identifiers = [];
    model.entities.push(entity);
    expect(codesOf(model)).toContain(CODES.entityWithoutPrimaryIdentifier);
  });

  it('signale plusieurs identifiants primaires', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    const attributeId = entity.attributes[0]?.id ?? '';
    entity.identifiers.push({ id: 'i2', attributeIds: [attributeId], primary: true });
    model.entities.push(entity);
    expect(codesOf(model)).toContain(CODES.multiplePrimaryIdentifiers);
  });

  it('signale un identifiant vide', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    entity.identifiers = [{ id: 'i1', attributeIds: [], primary: true }];
    model.entities.push(entity);
    expect(codesOf(model)).toContain(CODES.emptyIdentifier);
  });

  it('signale un identifiant référençant un attribut inexistant', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    entity.identifiers = [{ id: 'i1', attributeIds: ['inconnu'], primary: true }];
    model.entities.push(entity);
    expect(codesOf(model)).toContain(CODES.identifierUnknownAttribute);
  });

  it('signale un attribut référencé deux fois dans le même identifiant', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    const attributeId = entity.attributes[0]!.id;
    entity.identifiers[0]!.attributeIds = [attributeId, attributeId];
    model.entities.push(entity);
    expect(codesOf(model)).toContain(CODES.duplicateAttributeInIdentifier);
  });

  it('signale deux identifiants portant sur exactement les mêmes attributs', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    const attributeId = entity.attributes[0]!.id;
    entity.identifiers.push({ id: 'i2', attributeIds: [attributeId], primary: false });
    model.entities.push(entity);
    const issues = validateConceptualModel(model).filter(
      (issue) => issue.code === CODES.duplicateIdentifier,
    );
    expect(issues).toHaveLength(2);
  });

  it("signale deux identifiants alternatifs portant le même nom", () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    const email = createAttribute({ name: 'email' });
    const telephone = createAttribute({ name: 'telephone' });
    entity.attributes.push(email, telephone);
    entity.identifiers.push(
      { id: 'i2', name: 'UQ_CLIENT', attributeIds: [email.id], primary: false },
      { id: 'i3', name: 'uq_client', attributeIds: [telephone.id], primary: false },
    );
    model.entities.push(entity);
    const issues = validateConceptualModel(model).filter(
      (issue) => issue.code === CODES.duplicateIdentifierName,
    );
    expect(issues).toHaveLength(2);
  });

  it("n'exige pas de nom pour un identifiant alternatif", () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    const email = createAttribute({ name: 'email' });
    entity.attributes.push(email);
    entity.identifiers.push({ id: 'i2', attributeIds: [email.id], primary: false });
    model.entities.push(entity);
    const errors = validateConceptualModel(model).filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('accepte un identifiant composé valide', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'LIGNE_COMMANDE' });
    const second = createAttribute({ name: 'no_ligne', dataType: { kind: 'integer' } });
    entity.attributes.push(second);
    const primary = entity.identifiers[0];
    if (primary) primary.attributeIds.push(second.id);
    model.entities.push(entity);
    const errors = validateConceptualModel(model).filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('signale un attribut sans nom et un attribut dupliqué', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    entity.attributes.push(
      createAttribute({ name: '' }),
      createAttribute({ name: 'email' }),
      createAttribute({ name: 'EMAIL' }),
    );
    model.entities.push(entity);
    const codes = codesOf(model);
    expect(codes).toContain(CODES.attributeWithoutName);
    expect(codes).toContain(CODES.duplicateAttributeName);
  });

  it('signale une association sans nom et avec moins de deux participations', () => {
    const model = emptyModel();
    model.associations.push(createAssociation({ name: ' ' }));
    const codes = codesOf(model);
    expect(codes).toContain(CODES.associationWithoutName);
    expect(codes).toContain(CODES.associationTooFewParticipations);
  });

  it('signale une participation vers une entité inexistante', () => {
    const model = emptyModel();
    const association = createAssociation({ name: 'PASSER' });
    association.participations.push(
      createParticipation({ entityId: 'fantome' }),
      createParticipation({ entityId: 'fantome-2' }),
    );
    model.associations.push(association);
    expect(codesOf(model)).toContain(CODES.participationUnknownEntity);
  });

  it('signale un varchar sans longueur valide', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    entity.attributes.push(
      createAttribute({ name: 'nom', dataType: { kind: 'varchar', length: 0 } }),
    );
    model.entities.push(entity);
    expect(codesOf(model)).toContain(CODES.invalidVarcharLength);
  });

  it('signale une précision décimale invalide et une échelle supérieure à la précision', () => {
    const model = emptyModel();
    const entity = createEntity({ name: 'CLIENT' });
    entity.attributes.push(
      createAttribute({ name: 'a', dataType: { kind: 'decimal', precision: 0, scale: 0 } }),
      createAttribute({ name: 'b', dataType: { kind: 'decimal', precision: 4, scale: 6 } }),
    );
    model.entities.push(entity);
    const codes = codesOf(model);
    expect(codes).toContain(CODES.invalidDecimalPrecision);
    expect(codes).toContain(CODES.invalidDecimalScale);
  });
});

describe('validateConceptualModel — avertissements', () => {
  it('signale une association réflexive sans rôles distincts', () => {
    const model = emptyModel();
    const employe = createEntity({ name: 'EMPLOYE' });
    const encadrer = createAssociation({ name: 'ENCADRER' });
    encadrer.participations.push(
      createParticipation({ entityId: employe.id }),
      createParticipation({ entityId: employe.id }),
    );
    model.entities.push(employe);
    model.associations.push(encadrer);
    expect(codesOf(model)).toContain(CODES.reflexiveAssociationWithoutRoles);
  });

  it("n'avertit pas quand l'association réflexive porte des rôles distincts", () => {
    const model = emptyModel();
    const employe = createEntity({ name: 'EMPLOYE' });
    const encadrer = createAssociation({ name: 'ENCADRER' });
    encadrer.participations.push(
      createParticipation({ entityId: employe.id, role: 'manager' }),
      createParticipation({ entityId: employe.id, role: 'subordonne' }),
    );
    model.entities.push(employe);
    model.associations.push(encadrer);
    expect(codesOf(model)).not.toContain(CODES.reflexiveAssociationWithoutRoles);
  });

  it('signale un mot réservé SQL', () => {
    const model = emptyModel();
    model.entities.push(createEntity({ name: 'ORDER' }));
    expect(codesOf(model)).toContain(CODES.sqlReservedWord);
  });

  it('signale un nom incompatible avec une convention SQL', () => {
    const model = emptyModel();
    model.entities.push(createEntity({ name: "chambre d'hôtel" }));
    expect(codesOf(model)).toContain(CODES.nameNotSqlFriendly);
  });

  it('signale une entité sans attribut hors identifiant', () => {
    const model = emptyModel();
    model.entities.push(createEntity({ name: 'VIDE' }));
    expect(codesOf(model)).toContain(CODES.entityWithoutOwnAttributes);
  });

  it('signale un nom excessivement long', () => {
    const model = emptyModel();
    model.entities.push(createEntity({ name: 'X'.repeat(80) }));
    expect(codesOf(model)).toContain(CODES.nameTooLong);
  });

  it('signale une association 1,1 symétrique ambiguë', () => {
    const model = emptyModel();
    const a = createEntity({ name: 'A' });
    const b = createEntity({ name: 'B' });
    const association = createAssociation({ name: 'LIER' });
    association.participations.push(
      createParticipation({ entityId: a.id, cardinality: { min: 1, max: 1 } }),
      createParticipation({ entityId: b.id, cardinality: { min: 1, max: 1 } }),
    );
    model.entities.push(a, b);
    model.associations.push(association);
    expect(codesOf(model)).toContain(CODES.ambiguousOneToOne);
  });

  it('signale une collision de noms SQL générés', () => {
    const model = emptyModel();
    model.entities.push(
      createEntity({ name: 'date arrivée' }),
      createEntity({ name: 'Date Arrivee' }),
    );
    expect(codesOf(model)).toContain(CODES.sqlNameCollision);
  });
});

describe('projet d’exemple', () => {
  it("le modèle « Gestion d'hôtel » ne contient aucune erreur", () => {
    const project = createHotelExampleProject();
    const errors = validateConceptualModel(project.conceptualModel).filter(
      (issue) => issue.severity === 'error',
    );
    expect(errors).toEqual([]);
  });
});
