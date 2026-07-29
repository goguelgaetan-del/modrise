/**
 * Snapshots du script SQLite généré pour chaque fixture de référence.
 * Toute évolution du générateur doit être relue attentivement avant
 * d'accepter un nouveau snapshot (`vitest run -u`).
 */
import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '../../examples/hotel';
import { transformToLogicalModel } from '../../transformations/mcd-to-mld';
import {
  compositeIdentifierModel,
  manyToManyModel,
  nameCollisionModel,
  nAryModel,
  oneToManyModel,
  oneToOneModel,
  reflexiveModel,
} from '../../../tests/fixtures/models';
import type { ConceptualModel } from '../../conceptual-model/types';
import { generateSqliteScript } from './generate';

function generateSql(conceptual: ConceptualModel): string {
  const result = transformToLogicalModel(conceptual);
  if (!result.success) throw new Error('Transformation MLD inattendue en échec');
  const sqlResult = generateSqliteScript(result.model);
  if (!sqlResult.success) throw new Error('Génération SQL inattendue en échec');
  return sqlResult.sql;
}

describe('snapshots SQLite', () => {
  it('hotel.sqlite.sql', () => {
    expect(generateSql(createHotelExampleProject().conceptualModel)).toMatchSnapshot();
  });

  it('one-to-many.sqlite.sql', () => {
    expect(generateSql(oneToManyModel())).toMatchSnapshot();
  });

  it('many-to-many.sqlite.sql', () => {
    expect(generateSql(manyToManyModel())).toMatchSnapshot();
  });

  it('one-to-one.sqlite.sql', () => {
    expect(generateSql(oneToOneModel())).toMatchSnapshot();
  });

  it('reflexive.sqlite.sql', () => {
    expect(generateSql(reflexiveModel())).toMatchSnapshot();
  });

  it('ternary.sqlite.sql', () => {
    expect(generateSql(nAryModel())).toMatchSnapshot();
  });

  it('composite-identifiers.sqlite.sql', () => {
    expect(generateSql(compositeIdentifierModel())).toMatchSnapshot();
  });

  it('name-collisions.sqlite.sql', () => {
    expect(generateSql(nameCollisionModel())).toMatchSnapshot();
  });
});
