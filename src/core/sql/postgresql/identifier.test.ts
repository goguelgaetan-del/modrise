import { describe, expect, it } from 'vitest';
import { quotePostgreSqlIdentifier } from './identifier';

describe('quotePostgreSqlIdentifier', () => {
  it('entoure un nom simple de doubles guillemets', () => {
    expect(quotePostgreSqlIdentifier('client')).toBe('"client"');
  });

  it('échappe un mot réservé de la même façon (guillemetage systématique)', () => {
    expect(quotePostgreSqlIdentifier('order')).toBe('"order"');
  });

  it('préserve un espace (déjà normalisé en amont, mais robuste si présent)', () => {
    expect(quotePostgreSqlIdentifier('mon nom')).toBe('"mon nom"');
  });

  it('double un guillemet interne', () => {
    expect(quotePostgreSqlIdentifier('client"archive')).toBe('"client""archive"');
  });

  it('préserve les caractères Unicode', () => {
    expect(quotePostgreSqlIdentifier('café')).toBe('"café"');
  });
});
