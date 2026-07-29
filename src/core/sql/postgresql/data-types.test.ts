import { describe, expect, it } from 'vitest';
import { mapPostgreSqlDataType } from './data-types';

describe('mapPostgreSqlDataType', () => {
  it('mappe chaque genre de type conceptuel', () => {
    expect(mapPostgreSqlDataType({ kind: 'integer' })).toBe('INTEGER');
    expect(mapPostgreSqlDataType({ kind: 'bigint' })).toBe('BIGINT');
    expect(mapPostgreSqlDataType({ kind: 'decimal', precision: 8, scale: 2 })).toBe('NUMERIC(8,2)');
    expect(mapPostgreSqlDataType({ kind: 'varchar', length: 100 })).toBe('VARCHAR(100)');
    expect(mapPostgreSqlDataType({ kind: 'text' })).toBe('TEXT');
    expect(mapPostgreSqlDataType({ kind: 'boolean' })).toBe('BOOLEAN');
    expect(mapPostgreSqlDataType({ kind: 'date' })).toBe('DATE');
    expect(mapPostgreSqlDataType({ kind: 'datetime' })).toBe('TIMESTAMP WITHOUT TIME ZONE');
    expect(mapPostgreSqlDataType({ kind: 'uuid' })).toBe('UUID');
  });

  it("ne convertit jamais un entier en SERIAL (aucune information d'auto-génération dans le modèle)", () => {
    expect(mapPostgreSqlDataType({ kind: 'integer' })).not.toContain('SERIAL');
  });
});
