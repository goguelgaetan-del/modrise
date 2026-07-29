/** Dialecte SQLite. */
import type { SqlDialect } from '../dialect';
import { mapSqliteDataType } from './data-types';
import { generateSqliteScript } from './generate';
import { quoteSqliteIdentifier } from './identifier';

export const sqliteDialect: SqlDialect = {
  id: 'sqlite',
  label: 'SQLite',
  quoteIdentifier: quoteSqliteIdentifier,
  mapDataType: mapSqliteDataType,
  generate: generateSqliteScript,
};
