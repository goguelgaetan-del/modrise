import { describe, expect, it } from 'vitest';
import { deduplicateIdentifiers, isSqlReservedWord, toDatabaseIdentifier } from './naming';

describe('toDatabaseIdentifier', () => {
  it('normalise les accents', () => {
    expect(toDatabaseIdentifier('numéro de résa', 'snake_case')).toBe('numero_de_resa');
    expect(toDatabaseIdentifier('Prénom Élève', 'snake_case')).toBe('prenom_eleve');
  });

  it('gère espaces, apostrophes, tirets et caractères spéciaux', () => {
    expect(toDatabaseIdentifier("chambre d'hôtel", 'snake_case')).toBe('chambre_d_hotel');
    expect(toDatabaseIdentifier('prix-nuit (TTC)', 'snake_case')).toBe('prix_nuit_ttc');
  });

  it('applique les quatre conventions', () => {
    expect(toDatabaseIdentifier('date arrivée', 'snake_case')).toBe('date_arrivee');
    expect(toDatabaseIdentifier('date arrivée', 'camelCase')).toBe('dateArrivee');
    expect(toDatabaseIdentifier('date arrivée', 'PascalCase')).toBe('DateArrivee');
    expect(toDatabaseIdentifier('date arrivée', 'UPPER_SNAKE_CASE')).toBe('DATE_ARRIVEE');
  });

  it('découpe les noms en camelCase existant', () => {
    expect(toDatabaseIdentifier('dateArrivee', 'snake_case')).toBe('date_arrivee');
  });

  it('replie les noms vides sur unnamed', () => {
    expect(toDatabaseIdentifier('', 'snake_case')).toBe('unnamed');
    expect(toDatabaseIdentifier('   ©®™   ', 'snake_case')).toBe('unnamed');
  });

  it('préfixe les noms commençant par un chiffre', () => {
    expect(toDatabaseIdentifier('2e étage', 'snake_case')).toBe('_2e_etage');
  });

  it('suffixe les mots réservés SQL', () => {
    expect(toDatabaseIdentifier('order', 'snake_case')).toBe('order_');
    expect(toDatabaseIdentifier('User', 'snake_case')).toBe('user_');
  });
});

describe('isSqlReservedWord', () => {
  it('détecte les mots réservés indépendamment de la casse', () => {
    expect(isSqlReservedWord('SELECT')).toBe(true);
    expect(isSqlReservedWord('client')).toBe(false);
  });
});

describe('deduplicateIdentifiers', () => {
  it('résout les collisions après normalisation', () => {
    expect(deduplicateIdentifiers(['client', 'client', 'Client'])).toEqual([
      'client',
      'client_2',
      'Client_3',
    ]);
  });

  it('laisse les identifiants uniques inchangés', () => {
    expect(deduplicateIdentifiers(['a', 'b'])).toEqual(['a', 'b']);
  });
});
