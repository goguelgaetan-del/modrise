/**
 * Dialecte PostgreSQL : première implémentation concrète de `SqlDialect`.
 */
import type { SqlDialect } from '../dialect';
import { mapPostgreSqlDataType } from './data-types';
import { generatePostgreSqlScript } from './generate';
import { quotePostgreSqlIdentifier } from './identifier';

export const postgreSqlDialect: SqlDialect = {
  id: 'postgresql',
  label: 'PostgreSQL',
  quoteIdentifier: quotePostgreSqlIdentifier,
  mapDataType: mapPostgreSqlDataType,
  generate: generatePostgreSqlScript,
};
