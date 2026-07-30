import { describe, expect, it } from 'vitest';
import { createAttribute, createEntity } from '../../conceptual-model/factories';
import { createHotelExampleProject } from '../../examples/hotel';
import { transformToLogicalModel } from '../../transformations/mcd-to-mld';
import type { LogicalTransformationResult } from '../../transformations/mcd-to-mld';
import {
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
import { generateSqliteScript } from './generate';

function toLogicalModel(conceptual: ConceptualModel): LogicalModel {
  const result: LogicalTransformationResult = transformToLogicalModel(conceptual);
  if (!result.success) {
    throw new Error(`Transformation MLD inattendue en échec : ${JSON.stringify(result.issues)}`);
  }
  return result.model;
}

function generate(conceptual: ConceptualModel, options?: Partial<SqlGenerationOptions>) {
  const model = toLogicalModel(conceptual);
  return generateSqliteScript(model, { ...DEFAULT_SQL_GENERATION_OPTIONS, ...options });
}

describe('generateSqliteScript — PRAGMA et contraintes inline', () => {
  it('commence toujours par PRAGMA foreign_keys = ON', () => {
    const { sql } = generate(oneToManyModel());
    expect(sql.startsWith('PRAGMA foreign_keys = ON;')).toBe(true);
  });

  it("n'utilise jamais ALTER TABLE ADD CONSTRAINT", () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).not.toContain('ALTER TABLE');
  });

  it('force le mode inline même si alter-table est demandé explicitement', () => {
    const { sql } = generate(oneToManyModel(), { foreignKeyMode: 'alter-table' });
    expect(sql).not.toContain('ALTER TABLE');
    expect(sql).toMatch(/FOREIGN KEY \("client_id"\) REFERENCES "client" \("id"\)/);
  });

  it('place la FK sur le côté max=1, référençant le côté max=N (hôtel), inline', () => {
    const { sql } = generate(createHotelExampleProject().conceptualModel);
    expect(sql).toContain('"client_id_client" INTEGER NOT NULL');
    expect(sql).toMatch(
      /CONSTRAINT "fk_reservation_client" FOREIGN KEY \("client_id_client"\) REFERENCES "client" \("id_client"\)/,
    );
  });

  it('génère une clé étrangère composée inline', () => {
    const { sql } = generate(oneToManyCompositeKeyModel());
    expect(sql).toMatch(
      /FOREIGN KEY \("client_code", "client_version"\) REFERENCES "client" \("code", "version"\)/,
    );
  });

  it('gère une association réflexive (contrainte inline auto-référencée)', () => {
    const { sql } = generate(reflexiveModel());
    expect(sql).toContain('REFERENCES "employe" ("id")');
    expect(sql).toContain('"manager_id"');
  });

  it('gère un cycle entre deux tables (contraintes inline des deux côtés)', () => {
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
    expect(sql).toContain('REFERENCES "a"');
    expect(sql).toContain('REFERENCES "b"');
  });

  it('gère une association N,N (contraintes inline dans la table associative)', () => {
    const { sql } = generate(manyToManyModel());
    expect(sql).toContain('CREATE TABLE "contenir"');
    expect(sql).toMatch(/FOREIGN KEY \("commande_id"\) REFERENCES "commande" \("id"\)/);
    expect(sql).toMatch(/FOREIGN KEY \("produit_id"\) REFERENCES "produit" \("id"\)/);
  });

  it('gère une association n-aire', () => {
    const { sql } = generate(nAryModel());
    expect(sql).toMatch(/PRIMARY KEY \("enseignant_id", "matiere_id", "classe_id"\)/);
  });

  it('gère une contrainte unique 1,1', () => {
    const { sql } = generate(oneToOneModel());
    expect(sql).toContain('UNIQUE');
    expect(sql).toContain('REFERENCES "personne"');
  });

  it('génère une contrainte unique multi-colonnes depuis un identifiant alternatif composé', () => {
    const conceptual: ConceptualModel = { entities: [], associations: [] };
    const entity = createEntity({ name: 'RESERVATION' });
    const chambre = createAttribute({ name: 'chambre', dataType: { kind: 'integer' } });
    const dateArrivee = createAttribute({ name: 'date_arrivee', dataType: { kind: 'date' } });
    entity.attributes.push(chambre, dateArrivee);
    entity.identifiers.push({
      id: 'alt-composite',
      attributeIds: [chambre.id, dateArrivee.id],
      primary: false,
    });
    conceptual.entities.push(entity);
    const { sql } = generate(conceptual);
    expect(sql).toContain(
      'CONSTRAINT "uq_reservation_chambre_date_arrivee" UNIQUE ("chambre", "date_arrivee")',
    );
  });

  it('désambiguïse les FK réflexives multiples par qualificatif de rôle', () => {
    const { sql } = generate(reflexiveManyToManyModel());
    expect(sql).toContain('fk_collaborer_initiateur');
    expect(sql).toContain('fk_collaborer_collegue');
  });
});

describe('generateSqliteScript — script global', () => {
  it("n'inclut pas de DROP TABLE par défaut", () => {
    const { sql } = generate(oneToManyModel());
    expect(sql).not.toContain('DROP TABLE');
  });

  it('encadre les DROP TABLE de PRAGMA foreign_keys OFF/ON quand activé, en ordre inverse', () => {
    const { sql } = generate(oneToManyModel(), { includeDropStatements: true });
    const offIndex = sql.indexOf('PRAGMA foreign_keys = OFF;');
    const dropCommandeIndex = sql.indexOf('DROP TABLE IF EXISTS "commande"');
    const dropClientIndex = sql.indexOf('DROP TABLE IF EXISTS "client"');
    const onIndex = sql.lastIndexOf('PRAGMA foreign_keys = ON;');
    expect(offIndex).toBeGreaterThan(-1);
    expect(offIndex).toBeLessThan(dropCommandeIndex);
    expect(dropCommandeIndex).toBeLessThan(dropClientIndex); // ordre inverse de création
    expect(dropClientIndex).toBeLessThan(onIndex);
    expect(sql).not.toContain('CASCADE');
  });

  it('ordre déterministe : deux appels produisent un résultat identique', () => {
    const model = toLogicalModel(createHotelExampleProject().conceptualModel);
    expect(generateSqliteScript(model)).toEqual(generateSqliteScript(model));
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
