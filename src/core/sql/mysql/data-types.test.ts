import { describe, expect, it } from 'vitest';
import { mapMySqlDataType } from './data-types';

describe('mapMySqlDataType', () => {
  it('mappe chaque genre de type conceptuel', () => {
    expect(mapMySqlDataType({ kind: 'integer' })).toBe('INT');
    expect(mapMySqlDataType({ kind: 'bigint' })).toBe('BIGINT');
    expect(mapMySqlDataType({ kind: 'decimal', precision: 8, scale: 2 })).toBe('DECIMAL(8,2)');
    expect(mapMySqlDataType({ kind: 'varchar', length: 100 })).toBe('VARCHAR(100)');
    expect(mapMySqlDataType({ kind: 'text' })).toBe('TEXT');
    expect(mapMySqlDataType({ kind: 'boolean' })).toBe('BOOLEAN');
    expect(mapMySqlDataType({ kind: 'date' })).toBe('DATE');
    expect(mapMySqlDataType({ kind: 'datetime' })).toBe('DATETIME');
    expect(mapMySqlDataType({ kind: 'uuid' })).toBe('CHAR(36)');
  });

  it("ne convertit jamais un entier en AUTO_INCREMENT (aucune information d'auto-génération dans le modèle)", () => {
    expect(mapMySqlDataType({ kind: 'integer' })).not.toContain('AUTO_INCREMENT');
  });
});
