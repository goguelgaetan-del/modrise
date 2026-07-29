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
import { generatePostgreSqlScript, SQL_GENERATION_CODES } from './generate';

function toLogicalModel(conceptual: ConceptualModel): LogicalModel {
  const result: LogicalTransformationResult = transformToLogicalModel(conceptual);
  if (!result.success) {
    throw new Error(`Transformation MLD inattendue en échec : ${JSON.stringify(result.issues)}`);
  }
  return result.model;
}

function generate(conceptual: ConceptualModel, options?: Partial<SqlGenerationOptions>) {
  const model = toLogicalModel(conceptual);
  return generatePostgreSqlScript(model, { ...DEFAULT_SQL_GENERATION_OPTIONS, ...options });
}

describe('generatePostgreSqlScript — tables', () => {
  it('génère une instruction CREATE TABLE par table', () => {
    const { sql, success } = generate(oneToManyModel());
    expect(success).toBe(true);
    expect(sql).toContain('CREATE TABLE "client"');
    expect(sql).toContain('CREATE TABLE "commande"');
  });

  it('les colonnes non nullables portent NOT NULL, les nullables non', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toMatch(/"nom" VARCHAR\(100\) NOT NULL/);
    expect(sql).toMatch(/"email" VARCHAR\(255\),/);
    expect(sql).not.toMatch(/"email" VARCHAR\(255\) NOT NULL/);
  });

  it('une colonne de clé primaire est toujours NOT NULL', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).toMatch(/"id" VARCHAR\(255\) NOT NULL/);
  });

  it('génère une clé primaire simple', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).toContain('CONSTRAINT "pk_client" PRIMARY KEY ("id")');
  });

  it('génère une clé primaire composée', () => {
    const { sql } = generate(compositeIdentifierModel());
    expect(sql).toContain('CONSTRAINT "pk_ligne_commande" PRIMARY KEY ("id", "no_ligne")');
  });

  it("l'ordre des colonnes suit le modèle logique", () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    const clientTable = sql.slice(sql.indexOf('CREATE TABLE "client"'));
    const idIndex = clientTable.indexOf('"id_client"');
    const nomIndex = clientTable.indexOf('"nom"');
    const emailIndex = clientTable.indexOf('"email"');
    expect(idIndex).toBeLessThan(nomIndex);
    expect(nomIndex).toBeLessThan(emailIndex);
  });
});

describe('generatePostgreSqlScript — contraintes uniques', () => {
  it('génère une contrainte unique simple', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('CONSTRAINT "uq_client_email" UNIQUE ("email")');
  });

  it('génère une contrainte unique composée', () => {
    const model = oneToManyCompositeKeyModel();
    const { sql } = generate(model);
    // Clé primaire composée du côté N,1 : vérifie la présence de la contrainte PK composée.
    expect(sql).toContain('CONSTRAINT "pk_client" PRIMARY KEY ("code", "version")');
  });

  it('génère plusieurs contraintes uniques', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('uq_client_email');
    expect(sql).toContain('uq_chambre_numero');
  });
});

describe('generatePostgreSqlScript — clés étrangères', () => {
  it('génère une clé étrangère simple via ALTER TABLE (mode par défaut)', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).toContain('ALTER TABLE "commande"');
    expect(sql).toContain('ADD CONSTRAINT "fk_commande_client"');
    expect(sql).toContain('FOREIGN KEY ("client_id")');
    expect(sql).toContain('REFERENCES "client" ("id")');
  });

  it('génère une clé étrangère composée', () => {
    const { sql } = generate(oneToManyCompositeKeyModel());
    expect(sql).toMatch(/FOREIGN KEY \("client_code", "client_version"\)/);
    expect(sql).toMatch(/REFERENCES "client" \("code", "version"\)/);
  });

  it('place la clé étrangère non nullable quand le côté porteur a un minimum de 1', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toMatch(/"client_id_client" INTEGER NOT NULL/);
  });

  it('place la clé étrangère nullable quand le côté porteur a un minimum de 0', () => {
    const model = oneToManyModel();
    const participation = model.associations[0]?.participations.find(
      (p) => p.cardinality.max === 1,
    );
    if (participation) participation.cardinality = { min: 0, max: 1 };
    const { sql } = generate(model);
    expect(sql).toMatch(/"client_id" VARCHAR\(255\),/);
  });

  it('gère une association réflexive (auto-référence)', () => {
    const { sql } = generate(reflexiveModel());
    expect(sql).toContain('REFERENCES "employe" ("id")');
    expect(sql).toContain('"manager_id"');
  });

  it('gère un cycle entre deux tables (deux associations 1,N en sens opposés)', () => {
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
    expect(sql).toContain('CREATE TABLE "a"');
    expect(sql).toContain('CREATE TABLE "b"');
    // Les deux CREATE TABLE précèdent les deux ALTER TABLE (aucune dépendance d'ordre requise).
    const lastCreate = sql.lastIndexOf('CREATE TABLE');
    const firstAlter = sql.indexOf('ALTER TABLE');
    expect(firstAlter).toBeGreaterThan(lastCreate);
  });

  it('désambiguïse plusieurs FK vers la même table par un qualificatif de rôle', () => {
    const { sql } = generate(reflexiveManyToManyModel());
    expect(sql).toContain('fk_collaborer_initiateur');
    expect(sql).toContain('fk_collaborer_collegue');
  });

  it('rejette une table référencée inexistante sans planter (défensif)', () => {
    const model = toLogicalModel(oneToManyModel());
    model.tables[1]!.foreignKeys[0]!.referencedTableId = 'table-fantome';
    expect(() => generatePostgreSqlScript(model)).not.toThrow();
    const result = generatePostgreSqlScript(model);
    expect(result.success).toBe(false);
  });
});

describe('generatePostgreSqlScript — non-régression direction 1,N', () => {
  it('places the foreign key on the max-one participant in a one-to-many association', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('"client_id_client" INTEGER NOT NULL');
    expect(sql).toContain('ALTER TABLE "reservation"');
    expect(sql).toContain('ADD CONSTRAINT "fk_reservation_client"');
    expect(sql).toContain('REFERENCES "client" ("id_client")');
    // La table CLIENT ne doit jamais recevoir de clé étrangère vers RESERVATION.
    const clientBlock = sql.slice(
      sql.indexOf('CREATE TABLE "client"'),
      sql.indexOf('CREATE TABLE "chambre"'),
    );
    expect(clientBlock).not.toContain('reservation');
  });
});

describe('generatePostgreSqlScript — script global', () => {
  it('gère une table associative N,N', () => {
    const { sql } = generate(manyToManyModel());
    expect(sql).toContain('CREATE TABLE "contenir"');
    expect(sql).toContain('CONSTRAINT "pk_contenir" PRIMARY KEY ("commande_id", "produit_id")');
  });

  it('gère une association n-aire', () => {
    const { sql } = generate(nAryModel());
    expect(sql).toContain('CREATE TABLE "enseigner"');
    expect(sql).toMatch(/PRIMARY KEY \("enseignant_id", "matiere_id", "classe_id"\)/);
  });

  it('gère une association 1,1 avec contrainte unique', () => {
    const { sql } = generate(oneToOneModel());
    expect(sql).toContain('UNIQUE');
    expect(sql).toContain('REFERENCES "personne"');
  });

  it('active l’en-tête quand includeHeader est vrai', () => {
    const { sql } = generate(oneToManyModel(), { includeHeader: true });
    expect(sql.startsWith('-- Generated by Modrise')).toBe(true);
  });

  it("n'inclut pas l'en-tête quand includeHeader est faux", () => {
    const { sql } = generate(oneToManyModel(), { includeHeader: false });
    expect(sql).not.toContain('Generated by Modrise');
  });

  it('génère les DROP TABLE en ordre inverse quand demandé', () => {
    const { sql } = generate(oneToManyModel(), { includeDropStatements: true });
    const dropClient = sql.indexOf('DROP TABLE IF EXISTS "client"');
    const dropCommande = sql.indexOf('DROP TABLE IF EXISTS "commande"');
    expect(dropCommande).toBeGreaterThan(-1);
    expect(dropCommande).toBeLessThan(dropClient);
  });

  it("n'inclut pas de DROP TABLE par défaut", () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).not.toContain('DROP TABLE');
  });

  it('la génération est déterministe (deux appels produisent un résultat identique)', () => {
    const model = toLogicalModel(createHotelExampleProject().conceptualModel);
    const a = generatePostgreSqlScript(model);
    const b = generatePostgreSqlScript(model);
    expect(a).toEqual(b);
  });

  it('le fichier se termine par un seul retour à la ligne, sans espace en fin de ligne', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql.endsWith('\n')).toBe(true);
    expect(sql.endsWith('\n\n')).toBe(false);
    for (const line of sql.split('\n')) {
      expect(line).toBe(line.trimEnd());
    }
  });
});

describe('generatePostgreSqlScript — options', () => {
  it('met les mots-clés en minuscules quand demandé', () => {
    const { sql } = generate(oneToManyModel(), { keywordCase: 'lower' });
    expect(sql).toContain('create table');
    expect(sql).toContain('primary key');
    expect(sql).not.toContain('CREATE TABLE');
  });

  it('génère les clés étrangères en ligne (inline) avec REFERENCES', () => {
    const { sql } = generate(oneToManyModel(), { foreignKeyMode: 'inline' });
    expect(sql).not.toContain('ALTER TABLE');
    expect(sql).toMatch(/FOREIGN KEY \("client_id"\) REFERENCES "client" \("id"\)/);
  });

  it('omet le point-virgule final quand statementTerminator est faux', () => {
    const { sql } = generate(oneToManyModel(), { statementTerminator: false });
    expect(sql).not.toContain(');\n');
    expect(sql).toContain(')\n');
  });

  it('génère des COMMENT ON quand includeComments est vrai et une description existe', () => {
    const model = oneToManyModel();
    const client = model.entities.find((e) => e.name === 'CLIENT');
    if (client) client.description = "Clients de l'établissement";
    const { sql } = generate(model, { includeComments: true });
    expect(sql).toContain("COMMENT ON TABLE \"client\" IS 'Clients de l''établissement'");
  });

  it("n'ajoute aucun COMMENT ON quand includeComments est vrai mais aucune description n'existe", () => {
    const { sql } = generate(oneToManyModel(), { includeComments: true });
    expect(sql).not.toContain('COMMENT ON');
  });
});

describe('generatePostgreSqlScript — nommage des contraintes', () => {
  it('nomme les contraintes selon la convention pk_/uq_/fk_', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).toContain('"pk_client"');
    expect(sql).toContain('"pk_commande"');
    expect(sql).toContain('"fk_commande_client"');
  });

  it('signale un nom de contrainte tronqué', () => {
    const conceptual: ConceptualModel = {
      entities: [
        {
          id: 'e1',
          name: 'X'.repeat(80),
          attributes: [
            { id: 'a1', name: 'id', dataType: { kind: 'integer' }, required: true, unique: false },
          ],
          identifiers: [{ id: 'i1', attributeIds: ['a1'], primary: true }],
        },
      ],
      associations: [],
    };
    const result = generate(conceptual);
    expect(result.issues.some((i) => i.code === SQL_GENERATION_CODES.constraintNameTruncated)).toBe(
      true,
    );
  });
});
