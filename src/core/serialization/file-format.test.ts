import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '../examples/hotel';
import { applyMigrations, MigrationError } from '../migrations';
import type { ProjectMigration } from '../migrations';
import { CURRENT_FORMAT_VERSION } from '../project/types';
import {
  FileFormatError,
  parseProjectFile,
  parseProjectFileWithWarnings,
  serializeProject,
} from './file-format';

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

  it('remplace un dialecte SQL inconnu par PostgreSQL sans faire échouer l’import', () => {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as {
      settings: { sqlDialect: string };
    };
    raw.settings.sqlDialect = 'oracle';
    const parsed = parseProjectFile(JSON.stringify(raw));
    expect(parsed.settings.sqlDialect).toBe('postgresql');
  });
});

describe('migration réelle v1 → v2 → v3 (commentaires graphiques, verrouillage)', () => {
  function v1Payload(): Record<string, unknown> {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as {
      formatVersion: number;
      diagram: { comments?: unknown; nodes: Record<string, unknown>[] };
    };
    raw.formatVersion = 1;
    delete raw.diagram.comments;
    for (const node of raw.diagram.nodes) delete node.locked;
    return raw as Record<string, unknown>;
  }

  function v2Payload(): Record<string, unknown> {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as {
      formatVersion: number;
      diagram: { nodes: Record<string, unknown>[] };
    };
    raw.formatVersion = 2;
    for (const node of raw.diagram.nodes) delete node.locked;
    return raw as Record<string, unknown>;
  }

  it("importe un vrai fichier v1 (sans `diagram.comments` ni `locked`) en chaînant les deux migrations", () => {
    const parsed = parseProjectFile(JSON.stringify(v1Payload()));
    expect(parsed.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(parsed.diagram.comments).toEqual([]);
    expect(parsed.diagram.nodes.every((node) => node.locked === false)).toBe(true);
  });

  it("importe un vrai fichier v2 (sans `locked`) avec `locked: false` sur chaque nœud", () => {
    const parsed = parseProjectFile(JSON.stringify(v2Payload()));
    expect(parsed.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expect(parsed.diagram.nodes.every((node) => node.locked === false)).toBe(true);
  });

  it('ne signale aucun avertissement pour une migration v1 → v3 réussie', () => {
    const { project, warnings } = parseProjectFileWithWarnings(JSON.stringify(v1Payload()));
    expect(project.diagram.comments).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('reste stable après un aller-retour export/import (v1 comme v2)', () => {
    const migratedFromV1 = parseProjectFile(JSON.stringify(v1Payload()));
    const reimportedFromV1 = parseProjectFile(serializeProject(migratedFromV1));
    expect(reimportedFromV1).toEqual(migratedFromV1);
    expect(reimportedFromV1.formatVersion).toBe(CURRENT_FORMAT_VERSION);

    const migratedFromV2 = parseProjectFile(JSON.stringify(v2Payload()));
    const reimportedFromV2 = parseProjectFile(serializeProject(migratedFromV2));
    expect(reimportedFromV2).toEqual(migratedFromV2);
    expect(reimportedFromV2.formatVersion).toBe(CURRENT_FORMAT_VERSION);
  });
});

describe('parseProjectFileWithWarnings', () => {
  it('ne produit aucun avertissement pour un fichier valide', () => {
    const project = createHotelExampleProject();
    const { warnings } = parseProjectFileWithWarnings(serializeProject(project));
    expect(warnings).toEqual([]);
  });

  it('signale le repli sur PostgreSQL pour un dialecte inconnu', () => {
    const project = createHotelExampleProject();
    const raw = JSON.parse(serializeProject(project)) as {
      settings: { sqlDialect: string };
    };
    raw.settings.sqlDialect = 'oracle';
    const { project: parsed, warnings } = parseProjectFileWithWarnings(JSON.stringify(raw));
    expect(parsed.settings.sqlDialect).toBe('postgresql');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/oracle/);
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
