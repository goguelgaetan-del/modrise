import { describe, expect, it } from 'vitest';
import { SqlConstraintNameRegistry } from './constraint-registry';

const POSTGRESQL_MAX_BYTES = 63;

describe('SqlConstraintNameRegistry', () => {
  it('réserve un nom libre tel quel', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    expect(registry.reserve('pk_client')).toEqual({
      name: 'pk_client',
      collided: false,
      truncated: false,
    });
  });

  it('résout une collision par un suffixe numérique stable', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    registry.reserve('fk_a_b');
    expect(registry.reserve('fk_a_b')).toEqual({
      name: 'fk_a_b_2',
      collided: true,
      truncated: false,
    });
    expect(registry.reserve('fk_a_b')).toEqual({
      name: 'fk_a_b_3',
      collided: true,
      truncated: false,
    });
  });

  it('tient compte des noms déjà réclamés via claim()', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    registry.claim('uq_client_email');
    expect(registry.reserve('uq_client_email')).toEqual({
      name: 'uq_client_email_2',
      collided: true,
      truncated: false,
    });
  });

  it('tronque un nom dépassant la limite (63 octets pour PostgreSQL)', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    const longName = `fk_${'a'.repeat(80)}_b`;
    const { name, truncated } = registry.reserve(longName);
    expect(truncated).toBe(true);
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(POSTGRESQL_MAX_BYTES);
  });

  it('garde l’unicité même après troncature (deux noms tronqués identiques)', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    const first = `fk_${'x'.repeat(80)}_1`;
    const second = `fk_${'x'.repeat(80)}_2`;
    const a = registry.reserve(first);
    const b = registry.reserve(second);
    expect(a.name).not.toBe(b.name);
  });

  it('la casse est ignorée pour la détection de collision', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    registry.reserve('PK_Client');
    expect(registry.reserve('pk_client').collided).toBe(true);
  });

  it('gère les caractères Unicode dans la mesure en octets', () => {
    const registry = new SqlConstraintNameRegistry(POSTGRESQL_MAX_BYTES);
    const name = 'fk_café_établissement_' + 'é'.repeat(40);
    const { truncated, name: result } = registry.reserve(name);
    expect(truncated).toBe(true);
    expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(POSTGRESQL_MAX_BYTES);
  });

  it('applique une limite différente selon le dialecte (ex. 64 octets pour MySQL)', () => {
    const registry = new SqlConstraintNameRegistry(64);
    const name = `fk_${'a'.repeat(80)}`;
    const { name: result } = registry.reserve(name);
    expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(64);
  });
});
