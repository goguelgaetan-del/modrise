import { describe, expect, it } from 'vitest';
import { LogicalNameRegistry } from './logical-naming';

describe('LogicalNameRegistry', () => {
  it('réserve un nom libre tel quel', () => {
    const registry = new LogicalNameRegistry('snake_case');
    expect(registry.reserveTableName('CLIENT')).toEqual({ name: 'client', collided: false });
  });

  it('résout une collision de nom de table par un suffixe numérique stable', () => {
    const registry = new LogicalNameRegistry('snake_case');
    expect(registry.reserveTableName('CLIENT')).toEqual({ name: 'client', collided: false });
    expect(registry.reserveTableName('client')).toEqual({ name: 'client_2', collided: true });
    expect(registry.reserveTableName('Client')).toEqual({ name: 'client_3', collided: true });
  });

  it('les colonnes sont scoping par table (deux tables peuvent avoir la même colonne)', () => {
    const registry = new LogicalNameRegistry('snake_case');
    expect(registry.reserveColumnName('t1', 'nom')).toEqual({ name: 'nom', collided: false });
    expect(registry.reserveColumnName('t2', 'nom')).toEqual({ name: 'nom', collided: false });
    expect(registry.reserveColumnName('t1', 'nom')).toEqual({ name: 'nom_2', collided: true });
  });

  it('les noms de contraintes sont dans un espace global', () => {
    const registry = new LogicalNameRegistry('snake_case');
    expect(registry.reserveConstraintName('fk_a_b')).toEqual({ name: 'fk_a_b', collided: false });
    expect(registry.reserveConstraintName('fk_a_b')).toEqual({ name: 'fk_a_b_2', collided: true });
  });

  it('tronque les noms de contraintes trop longs', () => {
    const registry = new LogicalNameRegistry('snake_case');
    const longName = 'a'.repeat(80);
    const { name } = registry.reserveConstraintName(longName);
    expect(name.length).toBeLessThan(80);
  });

  it('applique la convention de nommage demandée', () => {
    const camel = new LogicalNameRegistry('camelCase');
    expect(camel.reserveTableName('date arrivée').name).toBe('dateArrivee');
    const pascal = new LogicalNameRegistry('PascalCase');
    expect(pascal.reserveTableName('date arrivée').name).toBe('DateArrivee');
  });
});
