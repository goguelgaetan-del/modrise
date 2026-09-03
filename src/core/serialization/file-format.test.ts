import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '../examples/hotel';
import { applyMigrations, MigrationError } from '../migrations';
import type { ProjectMigration } from '../migrations';
import type { ModriseProject } from '../project/types';
import { CURRENT_FORMAT_VERSION } from '../project/types';
import v1Raw from '@/tests/fixtures/formats/v1.merise.json?raw';
import v2Raw from '@/tests/fixtures/formats/v2.merise.json?raw';
import v3Raw from '@/tests/fixtures/formats/v3.merise.json?raw';
import {
  assertImportableSize,
  FileFormatError,
  formatFileSize,
  MAX_PROJECT_FILE_BYTES,
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

/**
 * Migrations vérifiées sur des **fichiers figés**, pas sur des formats
 * anciens refabriqués depuis le sérialiseur courant.
 *
 * La nuance est tout l'intérêt du test. Un ancien format reconstruit en
 * retirant des champs au JSON d'aujourd'hui hérite silencieusement de toutes
 * les évolutions faites entre-temps : renommage de champ, resserrement de
 * schéma, changement de forme d'un type. Il ne peut donc pas détecter la
 * régression qu'on veut précisément détecter — un vrai fichier v1 gardé sur
 * un disque depuis 2025 qui ne s'ouvre plus.
 *
 * Ces trois fichiers sont donc écrits à la main et **immuables** : ils ne
 * doivent jamais être régénérés (voir `src/tests/fixtures/formats/README.md`).
 */
describe('fixtures de format figées (v1, v2, v3)', () => {
  /** Ce qu'un import réussi doit rendre du modèle, quelle que soit la version d'origine. */
  function expectSharedModel(project: ModriseProject): void {
    expect(project.conceptualModel.entities.map((entity) => entity.name)).toEqual([
      'PERSONNE',
      'VEHICULE',
    ]);
    const [personne] = project.conceptualModel.entities;
    expect(personne?.attributes.map((attribute) => attribute.name)).toEqual(['numero', 'nom']);
    expect(personne?.identifiers[0]?.primary).toBe(true);

    const [conduit] = project.conceptualModel.associations;
    expect(conduit?.name).toBe('CONDUIT');
    expect(conduit?.attributes.map((attribute) => attribute.name)).toEqual(['depuis_le']);
    expect(conduit?.participations.map((participation) => participation.cardinality)).toEqual([
      { min: 0, max: 'N' },
      { min: 1, max: 1 },
    ]);
    expect(conduit?.participations[1]?.role).toBe('conduit par');
  }

  it('sont bien des fichiers anciens, et non le format courant déguisé', () => {
    // Garde-fou contre une régénération accidentelle : si quelqu'un réécrit
    // ces fixtures avec `serializeProject`, elles contiendront les champs
    // ajoutés par les migrations et ce test tombera.
    expect(v1Raw).not.toContain('"comments"');
    expect(v1Raw).not.toContain('"locked"');
    expect(v2Raw).toContain('"comments"');
    expect(v2Raw).not.toContain('"locked"');
    expect(v3Raw).toContain('"locked"');

    expect(JSON.parse(v1Raw)).toMatchObject({ formatVersion: 1 });
    expect(JSON.parse(v2Raw)).toMatchObject({ formatVersion: 2 });
    expect(JSON.parse(v3Raw)).toMatchObject({ formatVersion: 3 });
  });

  it('ouvre un fichier v1 en chaînant les deux migrations, sans rien perdre', () => {
    const { project, warnings } = parseProjectFileWithWarnings(v1Raw);

    expect(project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expectSharedModel(project);

    // Apport de la migration 1 → 2, puis 2 → 3.
    expect(project.diagram.comments).toEqual([]);
    expect(project.diagram.nodes.every((node) => node.locked === false)).toBe(true);

    // Un fichier v1 ne connaît pas encore le sélecteur de dialecte : le repli
    // sur PostgreSQL est un défaut, pas une valeur invalide, donc pas un
    // avertissement.
    expect(project.settings.sqlDialect).toBe('postgresql');
    expect(project.settings.namingConvention).toBe('snake_case');
    expect(warnings).toEqual([]);

    // Ce que la migration ne doit surtout pas toucher.
    expect(project.name).toBe('Fixture de format v1');
    expect(project.createdAt).toBe('2025-01-15T09:00:00.000Z');
    expect(project.diagram.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(project.diagram.nodes.map((node) => node.position)).toEqual([
      { x: 0, y: 0 },
      { x: 480, y: 0 },
      { x: 240, y: 160 },
    ]);
  });

  it('ouvre un fichier v2 en conservant ses commentaires graphiques', () => {
    const { project, warnings } = parseProjectFileWithWarnings(v2Raw);

    expect(project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expectSharedModel(project);

    expect(project.diagram.comments).toEqual([
      {
        id: '9e6b3a58-4d17-4c2f-a5e8-1b9d6f3c7a20',
        text: "Un véhicule peut n'être conduit par personne.",
      },
    ]);
    expect(project.diagram.nodes.every((node) => node.locked === false)).toBe(true);
    expect(project.diagram.nodes[0]?.width).toBe(240);
    expect(project.settings.sqlDialect).toBe('mysql');
    expect(project.diagram.viewport).toEqual({ x: -40, y: 12, zoom: 0.9 });
    expect(warnings).toEqual([]);
  });

  it('ouvre un fichier v3 sans le modifier', () => {
    const { project, warnings } = parseProjectFileWithWarnings(v3Raw);

    expect(project.formatVersion).toBe(CURRENT_FORMAT_VERSION);
    expectSharedModel(project);

    // Le verrouillage doit être lu tel quel, pas réinitialisé à `false` par
    // une migration appliquée à tort.
    expect(project.diagram.nodes.map((node) => node.locked)).toEqual([false, true, false, false]);
    expect(project.settings.sqlDialect).toBe('sqlite');
    expect(project.settings.namingConvention).toBe('PascalCase');
    expect(project.settings.gridEnabled).toBe(false);
    expect(warnings).toEqual([]);
  });

  it.each([
    ['v1', v1Raw],
    ['v2', v2Raw],
    ['v3', v3Raw],
  ])('reste stable après réexport puis réimport (%s)', (_version, raw) => {
    const migrated = parseProjectFile(raw);
    const reimported = parseProjectFile(serializeProject(migrated));

    expect(reimported).toEqual(migrated);
    expect(reimported.formatVersion).toBe(CURRENT_FORMAT_VERSION);

    // Deuxième aller-retour : la stabilité doit être un point fixe, pas une
    // convergence lente.
    expect(serializeProject(parseProjectFile(serializeProject(reimported)))).toBe(
      serializeProject(migrated),
    );
  });

  it('converge : les trois versions produisent le même modèle une fois migrées', () => {
    // Les trois fixtures décrivent délibérément le même MCD. Après migration,
    // seuls les métadonnées de projet, le viewport, les commentaires, le
    // verrouillage et les paramètres diffèrent — le modèle conceptuel, lui,
    // doit être identique.
    const fromV1 = parseProjectFile(v1Raw).conceptualModel;
    const fromV2 = parseProjectFile(v2Raw).conceptualModel;
    const fromV3 = parseProjectFile(v3Raw).conceptualModel;

    expect(fromV2).toEqual(fromV1);
    expect(fromV3).toEqual(fromV1);
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

/**
 * Les fichiers hostiles ne sont pas des cas exotiques : un téléchargement
 * interrompu, un `.json` renommé à la main, une sauvegarde produite par une
 * version plus récente de Modrise sur un autre poste, tout cela arrive. La
 * règle est la même partout — un message qu'un humain peut lire et agir
 * dessus, jamais un écran blanc ni un « undefined ».
 */
describe('robustesse : fichiers refusés avec un message actionnable', () => {
  function messageFor(content: string): string {
    try {
      parseProjectFile(content);
    } catch (error) {
      expect(error).toBeInstanceOf(FileFormatError);
      return (error as FileFormatError).message;
    }
    throw new Error('ce contenu aurait dû être refusé');
  }

  it('distingue un fichier vide d’un JSON invalide', () => {
    expect(messageFor('')).toBe('Ce fichier est vide.');
    expect(messageFor('   \n\t ')).toBe('Ce fichier est vide.');
  });

  it('refuse un fichier tronqué', () => {
    const complete = serializeProject(createHotelExampleProject());
    const truncated = complete.slice(0, Math.floor(complete.length / 2));

    expect(messageFor(truncated)).toBe('Ce fichier ne contient pas de JSON valide.');
  });

  it('refuse du JSON invalide', () => {
    expect(messageFor('{ "formatVersion": 3, }')).toBe(
      'Ce fichier ne contient pas de JSON valide.',
    );
    expect(messageFor('pas du tout du json')).toBe('Ce fichier ne contient pas de JSON valide.');
  });

  it('refuse un JSON valide qui n’est pas un projet', () => {
    expect(messageFor('[]')).toBe('Ce fichier ne ressemble pas à un projet Modrise.');
    expect(messageFor('"texte"')).toBe('Ce fichier ne ressemble pas à un projet Modrise.');
    expect(messageFor('42')).toBe('Ce fichier ne ressemble pas à un projet Modrise.');
    expect(messageFor('{"pas": "un projet"}')).toBe(
      'Ce fichier ne déclare pas de version de format (champ « formatVersion »).',
    );
  });

  it('refuse une version future en disant quoi faire', () => {
    const raw = JSON.parse(v3Raw) as { formatVersion: number };
    raw.formatVersion = CURRENT_FORMAT_VERSION + 1;

    const message = messageFor(JSON.stringify(raw));
    expect(message).toContain(String(CURRENT_FORMAT_VERSION + 1));
    expect(message).toContain('Mettez Modrise à jour');
  });

  it('refuse une structure invalide en nommant le champ fautif', () => {
    const raw = JSON.parse(v3Raw) as { conceptualModel: { entities: { name: unknown }[] } };
    const entity = raw.conceptualModel.entities[0];
    if (!entity) throw new Error('fixture v3 inattendue');
    entity.name = 42;

    const message = messageFor(JSON.stringify(raw));
    expect(message).toContain('conceptualModel.entities.0.name');
  });
});

describe('limite de taille d’import', () => {
  it('formate une taille pour un humain', () => {
    expect(formatFileSize(0)).toBe('0 o');
    expect(formatFileSize(512)).toBe('512 o');
    expect(formatFileSize(8_500)).toBe('8.3 Kio');
    expect(formatFileSize(20 * 1024 * 1024)).toBe('20.0 Mio');
  });

  it('accepte les tailles plausibles, y compris la limite exacte', () => {
    expect(() => {
      assertImportableSize(1);
    }).not.toThrow();
    expect(() => {
      assertImportableSize(MAX_PROJECT_FILE_BYTES);
    }).not.toThrow();
  });

  it('refuse un fichier vide sans avoir à le lire', () => {
    expect(() => {
      assertImportableSize(0);
    }).toThrowError('Ce fichier est vide.');
  });

  it('refuse un fichier surdimensionné en donnant les deux tailles', () => {
    let message = '';
    try {
      assertImportableSize(MAX_PROJECT_FILE_BYTES + 1);
    } catch (error) {
      expect(error).toBeInstanceOf(FileFormatError);
      message = (error as FileFormatError).message;
    }

    expect(message).toContain('16.0 Mio');
    expect(message).toContain("limite d'import");
  });

  it('laisse une marge confortable au-dessus du plus gros modèle revendiqué', () => {
    // Le plus grand modèle documenté (100 entités / 150 associations /
    // 250 nœuds, voir docs/performance.md) pèse ~356 Kio sérialisé.
    expect(MAX_PROJECT_FILE_BYTES).toBeGreaterThan(40 * 356 * 1024);
  });
});
