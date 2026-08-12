import { describe, expect, it } from 'vitest';
import { getCachedSqlDialect, loadSqlDialect, UnknownSqlDialectError } from './registry';
import type { SqlDialectId } from './dialect';

describe('loadSqlDialect', () => {
  it('charge et met en cache chacun des trois dialectes', async () => {
    for (const id of ['postgresql', 'mysql', 'sqlite'] as const) {
      const dialect = await loadSqlDialect(id);
      expect(dialect.id).toBe(id);
      expect(getCachedSqlDialect(id)).toBe(dialect);
    }
  });

  it('renvoie la même instance mise en cache lors des appels suivants', async () => {
    const first = await loadSqlDialect('postgresql');
    const second = await loadSqlDialect('postgresql');
    expect(second).toBe(first);
  });

  it('déduplique les chargements concurrents du même dialecte', async () => {
    const [a, b] = await Promise.all([loadSqlDialect('mysql'), loadSqlDialect('mysql')]);
    expect(a).toBe(b);
  });

  it('rejette un identifiant de dialecte inconnu', async () => {
    await expect(loadSqlDialect('oracle' as SqlDialectId)).rejects.toThrow(UnknownSqlDialectError);
  });
});
