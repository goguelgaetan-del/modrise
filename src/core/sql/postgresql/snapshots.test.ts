/**
 * Snapshots du script PostgreSQL généré pour chaque fixture de référence.
 * Toute évolution du générateur doit être relue attentivement avant
 * d'accepter un nouveau snapshot (`vitest run -u`) : un snapshot mis à jour
 * sans relecture peut figer une régression.
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
import { generatePostgreSqlScript } from './generate';

function generateSql(conceptual: ConceptualModel): string {
  const result = transformToLogicalModel(conceptual);
  if (!result.success) throw new Error('Transformation MLD inattendue en échec');
  const sqlResult = generatePostgreSqlScript(result.model);
  if (!sqlResult.success) throw new Error('Génération SQL inattendue en échec');
  return sqlResult.sql;
}

describe('snapshots PostgreSQL', () => {
  it('hotel.postgresql.sql', () => {
    expect(generateSql(createHotelExampleProject().conceptualModel)).toMatchSnapshot();
  });

  it('one-to-many.postgresql.sql', () => {
    expect(generateSql(oneToManyModel())).toMatchSnapshot();
  });

  it('many-to-many.postgresql.sql', () => {
    expect(generateSql(manyToManyModel())).toMatchSnapshot();
  });

  it('one-to-one.postgresql.sql', () => {
    expect(generateSql(oneToOneModel())).toMatchSnapshot();
  });

  it('reflexive.postgresql.sql', () => {
    expect(generateSql(reflexiveModel())).toMatchSnapshot();
  });

  it('ternary.postgresql.sql', () => {
    expect(generateSql(nAryModel())).toMatchSnapshot();
  });

  it('composite-identifiers.postgresql.sql', () => {
    expect(generateSql(compositeIdentifierModel())).toMatchSnapshot();
  });

  it('name-collisions.postgresql.sql', () => {
    expect(generateSql(nameCollisionModel())).toMatchSnapshot();
  });
});
