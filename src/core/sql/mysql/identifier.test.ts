import { describe, expect, it } from 'vitest';
import { quoteMySqlIdentifier } from './identifier';

describe('quoteMySqlIdentifier', () => {
  it('entoure un nom simple d’accents graves', () => {
    expect(quoteMySqlIdentifier('client')).toBe('`client`');
  });

  it('échappe un mot réservé de la même façon (guillemetage systématique)', () => {
    expect(quoteMySqlIdentifier('order')).toBe('`order`');
  });

  it('préserve un espace', () => {
    expect(quoteMySqlIdentifier('mon nom')).toBe('`mon nom`');
  });

  it('double un accent grave interne', () => {
    expect(quoteMySqlIdentifier('nom`archive')).toBe('`nom``archive`');
  });

  it('préserve les caractères Unicode', () => {
    expect(quoteMySqlIdentifier('café')).toBe('`café`');
  });
});
