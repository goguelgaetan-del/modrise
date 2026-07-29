import { describe, expect, it } from 'vitest';
import { createHotelExampleProject } from '../../examples/hotel';
import { transformToLogicalModel } from '../../transformations/mcd-to-mld';
import type { LogicalTransformationResult } from '../../transformations/mcd-to-mld';
import {
  compositeIdentifierModel,
  manyToManyModel,
  nAryModel,
  oneToManyCompositeKeyModel,
  oneToManyModel,
  oneToOneModel,
  reflexiveManyToManyModel,
  reflexiveModel,
} from '../../../tests/fixtures/models';
import type { ConceptualModel } from '../../conceptual-model/types';
import type { LogicalModel } from '../../logical-model/types';
import { DEFAULT_SQL_GENERATION_OPTIONS } from '../dialect';
import type { SqlGenerationOptions } from '../dialect';
import { generateMySqlScript } from './generate';

function toLogicalModel(conceptual: ConceptualModel): LogicalModel {
  const result: LogicalTransformationResult = transformToLogicalModel(conceptual);
  if (!result.success) {
    throw new Error(`Transformation MLD inattendue en échec : ${JSON.stringify(result.issues)}`);
  }
  return result.model;
}

function generate(conceptual: ConceptualModel, options?: Partial<SqlGenerationOptions>) {
  const model = toLogicalModel(conceptual);
  return generateMySqlScript(model, { ...DEFAULT_SQL_GENERATION_OPTIONS, ...options });
}

describe('generateMySqlScript — citation', () => {
  it('utilise des accents graves pour les identifiants', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).toContain('CREATE TABLE `client`');
    expect(sql).toContain('CREATE TABLE `commande`');
  });
});

describe('generateMySqlScript — types', () => {
  it('mappe integer en INT et decimal en DECIMAL', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('`id_chambre` INT NOT NULL');
    expect(sql).toContain('`prix_nuit` DECIMAL(8,2) NOT NULL');
  });
});

describe('generateMySqlScript — tables et contraintes', () => {
  it('génère une clé primaire simple et composée', () => {
    expect(generate(oneToManyModel()).sql).toContain('CONSTRAINT `pk_client` PRIMARY KEY (`id`)');
    expect(generate(compositeIdentifierModel()).sql).toContain(
      'CONSTRAINT `pk_ligne_commande` PRIMARY KEY (`id`, `no_ligne`)',
    );
  });

  it('génère une contrainte unique simple et composée', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('CONSTRAINT `uq_client_email` UNIQUE (`email`)');
    const { sql: composite } = generate(oneToManyCompositeKeyModel());
    expect(composite).toContain('PRIMARY KEY (`code`, `version`)');
  });

  it('génère une clé étrangère simple et composée via ALTER TABLE', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).toContain('ALTER TABLE `commande`');
    expect(sql).toContain('ADD CONSTRAINT `fk_commande_client`');
    expect(sql).toContain('FOREIGN KEY (`client_id`)');
    expect(sql).toContain('REFERENCES `client` (`id`)');

    const { sql: composite } = generate(oneToManyCompositeKeyModel());
    expect(composite).toMatch(/FOREIGN KEY \(`client_code`, `client_version`\)/);
  });

  it('place la FK sur le côté max=1, référençant le côté max=N (hôtel)', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('`client_id_client` INT NOT NULL');
    expect(sql).toContain('ADD CONSTRAINT `fk_reservation_client`');
    expect(sql).toContain('REFERENCES `client` (`id_client`)');
  });

  it('gère une association réflexive', () => {
    const { sql } = generate(reflexiveModel());
    expect(sql).toContain('REFERENCES `employe` (`id`)');
    expect(sql).toContain('`manager_id`');
  });

  it('gère un cycle entre deux tables', () => {
    const conceptual: ConceptualModel = {
      entities: [
        {
          id: 'a',
          name: 'A',
          attributes: [
            {
              id: 'a-id',
              name: 'id',
              dataType: { kind: 'integer' },
              required: true,
              unique: false,
            },
          ],
          identifiers: [{ id: 'a-pk', attributeIds: ['a-id'], primary: true }],
        },
        {
          id: 'b',
          name: 'B',
          attributes: [
            {
              id: 'b-id',
              name: 'id',
              dataType: { kind: 'integer' },
              required: true,
              unique: false,
            },
          ],
          identifiers: [{ id: 'b-pk', attributeIds: ['b-id'], primary: true }],
        },
      ],
      associations: [
        {
          id: 'assoc1',
          name: 'A_VERS_B',
          attributes: [],
          participations: [
            { id: 'p1', entityId: 'a', cardinality: { min: 0, max: 'N' } },
            { id: 'p2', entityId: 'b', cardinality: { min: 0, max: 1 } },
          ],
        },
        {
          id: 'assoc2',
          name: 'B_VERS_A',
          attributes: [],
          participations: [
            { id: 'p3', entityId: 'b', cardinality: { min: 0, max: 'N' } },
            { id: 'p4', entityId: 'a', cardinality: { min: 0, max: 1 } },
          ],
        },
      ],
    };
    const { success, sql } = generate(conceptual);
    expect(success).toBe(true);
    expect(sql).toContain('CREATE TABLE `a`');
    expect(sql).toContain('CREATE TABLE `b`');
  });

  it('gère une association N,N', () => {
    const { sql } = generate(manyToManyModel());
    expect(sql).toContain('CREATE TABLE `contenir`');
    expect(sql).toContain('PRIMARY KEY (`commande_id`, `produit_id`)');
  });

  it('gère une association n-aire', () => {
    const { sql } = generate(nAryModel());
    expect(sql).toMatch(/PRIMARY KEY \(`enseignant_id`, `matiere_id`, `classe_id`\)/);
  });

  it('gère une association 1,1', () => {
    const { sql } = generate(oneToOneModel());
    expect(sql).toContain('UNIQUE');
    expect(sql).toContain('REFERENCES `personne`');
  });

  it('désambiguïse les FK réflexives multiples par qualificatif de rôle', () => {
    const { sql } = generate(reflexiveManyToManyModel());
    expect(sql).toContain('fk_collaborer_initiateur');
    expect(sql).toContain('fk_collaborer_collegue');
  });
});

describe('generateMySqlScript — script global', () => {
  it('inclut un en-tête MySQL', () => {
    const { sql } = generate(oneToManyModel(), { includeHeader: true });
    expect(sql.startsWith('-- Generated by Modrise\n-- MySQL / MariaDB dialect')).toBe(true);
  });

  it("n'inclut pas de DROP TABLE ni de FOREIGN_KEY_CHECKS par défaut", () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).not.toContain('DROP TABLE');
    expect(sql).not.toContain('FOREIGN_KEY_CHECKS');
  });

  it('encadre les DROP TABLE de FOREIGN_KEY_CHECKS quand activé', () => {
    const { sql } = generate(oneToManyModel(), { includeDropStatements: true });
    const offIndex = sql.indexOf('SET FOREIGN_KEY_CHECKS = 0;');
    const dropClientIndex = sql.indexOf('DROP TABLE IF EXISTS `client`');
    const onIndex = sql.indexOf('SET FOREIGN_KEY_CHECKS = 1;');
    expect(offIndex).toBeGreaterThan(-1);
    expect(offIndex).toBeLessThan(dropClientIndex);
    expect(dropClientIndex).toBeLessThan(onIndex);
    // Pas de CASCADE : syntaxe non supportée par MySQL sur DROP TABLE.
    expect(sql).not.toContain('CASCADE');
  });

  it('ordre déterministe : deux appels produisent un résultat identique', () => {
    const model = toLogicalModel(createHotelExampleProject().conceptualModel);
    expect(generateMySqlScript(model)).toEqual(generateMySqlScript(model));
  });

  it('le fichier se termine par un seul retour à la ligne, sans espace en fin de ligne', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql.endsWith('\n')).toBe(true);
    expect(sql.endsWith('\n\n')).toBe(false);
    for (const line of sql.split('\n')) {
      expect(line).toBe(line.trimEnd());
    }
  });

  it('bloque la génération en présence d’erreurs bloquantes du MCD', () => {
    const invalid: ConceptualModel = {
      entities: [{ id: 'e1', name: '', attributes: [], identifiers: [] }],
      associations: [],
    };
    const result = transformToLogicalModel(invalid);
    expect(result.success).toBe(false);
  });
});
