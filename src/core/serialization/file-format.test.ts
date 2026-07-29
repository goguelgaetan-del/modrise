import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '../examples/hotel';
import { applyMigrations, MigrationError } from '../migrations';
import type { ProjectMigration } from '../migrations';
import { FileFormatError, parseProjectFile, serializeProject } from './file-format';

describe('serializeProject / parseProjectFile', () => {
  it('réalise un aller-retour sans perte', () => {
    const project = createHotelExampleProject();
    const parsed = parseProjectFile(serializeProject(project));
    expect(parsed).toEqual(project);
  });

  it('rejette un JSON invalide avec un message compréhensible', () => {
    expect(() => parseProjectFile('{pas du json')).toThrowError(FileFormatError);
    expect(() => parseProjectFile('{pas du json')).toThrowError(/JSON valide/);
  });

  it('rejette un document sans formatVersion', () => {
    expect(() => parseProjectFile('{"project": {}}')).toThrowError(/formatVersion/);
  });

  it('rejette un projet structurellement invalide en nommant le champ fautif', () => {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as Record<string, unknown>;
    raw.conceptualModel = { entities: [{ id: '' }], associations: [] };
    expect(() => parseProjectFile(JSON.stringify(raw))).toThrowError(FileFormatError);
    expect(() => parseProjectFile(JSON.stringify(raw))).toThrowError(/conceptualModel/);
  });

  it('rejette une cardinalité hors domaine', () => {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as {
      conceptualModel: { associations: { participations: { cardinality: unknown }[] }[] };
    };
    const participation = raw.conceptualModel.associations[0]?.participations[0];
    if (!participation) throw new Error('fixture inattendue');
    participation.cardinality = { min: 2, max: 'N' };
    expect(() => parseProjectFile(JSON.stringify(raw))).toThrowError(FileFormatError);
  });

  it('rejette une version de format plus récente que celle supportée', () => {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as Record<string, unknown>;
    raw.formatVersion = 999;
    expect(() => parseProjectFile(JSON.stringify(raw))).toThrowError(/version 999/);
  });
});

describe('applyMigrations', () => {
  const chain: ProjectMigration[] = [
    {
      fromVersion: 1,
      toVersion: 2,
      migrate: (data) => ({ ...(data as object), a: 1 }),
    },
    {
      fromVersion: 2,
      toVersion: 3,
      migrate: (data) => ({ ...(data as object), b: 2 }),
    },
  ];

  it('est une identité quand la version est déjà courante', () => {
    const data = { formatVersion: 1 };
    expect(applyMigrations(data, 1)).toBe(data);
  });

  it('chaîne les migrations jusqu’à la version cible', () => {
    expect(applyMigrations({}, 1, chain, 3)).toEqual({ a: 1, b: 2 });
  });

  it('échoue clairement quand une migration manque', () => {
    expect(() => applyMigrations({}, 1, [], 3)).toThrowError(MigrationError);
  });

  it('rejette les versions invalides', () => {
    expect(() => applyMigrations({}, 0)).toThrowError(MigrationError);
    expect(() => applyMigrations({}, 1.5)).toThrowError(MigrationError);
  });
});
