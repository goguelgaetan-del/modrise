/** Dialecte MySQL / MariaDB. */
import type { SqlDialect } from '../dialect';
import { mapMySqlDataType } from './data-types';
import { generateMySqlScript } from './generate';
import { quoteMySqlIdentifier } from './identifier';

export const mySqlDialect: SqlDialect = {
  id: 'mysql',
  label: 'MySQL / MariaDB',
  quoteIdentifier: quoteMySqlIdentifier,
  mapDataType: mapMySqlDataType,
  generate: generateMySqlScript,
};
