import { describe, expect, it } from 'vitest';
import { quoteSqliteIdentifier } from './identifier';

describe('quoteSqliteIdentifier', () => {
  it('entoure un nom simple de doubles guillemets', () => {
    expect(quoteSqliteIdentifier('client')).toBe('"client"');
  });

  it('double un guillemet interne', () => {
    expect(quoteSqliteIdentifier('client"archive')).toBe('"client""archive"');
  });

  it('préserve les caractères Unicode', () => {
    expect(quoteSqliteIdentifier('café')).toBe('"café"');
  });

  it('échappe un mot réservé de la même façon (guillemetage systématique)', () => {
    expect(quoteSqliteIdentifier('order')).toBe('"order"');
  });
});
