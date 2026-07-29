import { describe, expect, it } from 'vitest';
import { mapSqliteDataType } from './data-types';

describe('mapSqliteDataType', () => {
  it('mappe chaque genre de type conceptuel vers une affinité SQLite', () => {
    expect(mapSqliteDataType({ kind: 'integer' })).toBe('INTEGER');
    expect(mapSqliteDataType({ kind: 'bigint' })).toBe('INTEGER');
    expect(mapSqliteDataType({ kind: 'decimal', precision: 8, scale: 2 })).toBe('NUMERIC');
    expect(mapSqliteDataType({ kind: 'varchar', length: 100 })).toBe('TEXT');
    expect(mapSqliteDataType({ kind: 'text' })).toBe('TEXT');
    expect(mapSqliteDataType({ kind: 'boolean' })).toBe('INTEGER');
    expect(mapSqliteDataType({ kind: 'date' })).toBe('TEXT');
    expect(mapSqliteDataType({ kind: 'datetime' })).toBe('TEXT');
    expect(mapSqliteDataType({ kind: 'uuid' })).toBe('TEXT');
  });
});
