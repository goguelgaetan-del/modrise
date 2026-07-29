import { describe, expect, it } from 'vitest';
import { validateConceptualModel } from '@/core/validation/validate';
import {
  compositeIdentifierModel,
  invalidModel,
  manyToManyModel,
  nameCollisionModel,
  nAryModel,
  oneToManyCompositeKeyModel,
  oneToManyModel,
  oneToOneModel,
  oneToOneOptionalOptionalModel,
  oneToOneRequiredRequiredModel,
  reflexiveManyToManyModel,
  reflexiveModel,
} from './models';

const validFixtures = [
  ['one-to-many', oneToManyModel],
  ['one-to-many-composite-key', oneToManyCompositeKeyModel],
  ['many-to-many', manyToManyModel],
  ['one-to-one', oneToOneModel],
  ['one-to-one-required-required', oneToOneRequiredRequiredModel],
  ['one-to-one-optional-optional', oneToOneOptionalOptionalModel],
  ['reflexive-one-to-many', reflexiveModel],
  ['reflexive-many-to-many', reflexiveManyToManyModel],
  ['n-ary-association', nAryModel],
  ['composite-identifier', compositeIdentifierModel],
  ['name-collision', nameCollisionModel],
] as const;

describe('fixtures', () => {
  for (const [name, build] of validFixtures) {
    it(`la fixture ${name} ne contient aucune erreur de validation`, () => {
      const errors = validateConceptualModel(build()).filter((issue) => issue.severity === 'error');
      expect(errors).toEqual([]);
    });
  }

  it('la fixture invalid-model concentre les erreurs attendues', () => {
    const codes = validateConceptualModel(invalidModel()).map((issue) => issue.code);
    expect(codes).toContain('entity-without-primary-identifier');
    expect(codes).toContain('duplicate-entity-name');
    expect(codes).toContain('association-without-name');
    expect(codes).toContain('association-too-few-participations');
  });
});
