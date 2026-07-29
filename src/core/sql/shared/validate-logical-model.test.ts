import { describe, expect, it } from 'vitest';
import type { LogicalModel } from '../../logical-model/types';
import { SQL_VALIDATION_CODES, validateLogicalModelForSql } from './validate-logical-model';

function baseTable(overrides: Partial<LogicalModel['tables'][number]> = {}) {
  return {
    id: 't1',
    name: 'client',
    sourceIds: ['e1'],
    columns: [
      {
        id: 'c1',
        name: 'id',
        dataType: { kind: 'integer' } as const,
        nullable: false,
        origin: 'entity-attribute' as const,
      },
    ],
    primaryKey: ['c1'],
    foreignKeys: [],
    uniqueConstraints: [],
    ...overrides,
  };
}

describe('validateLogicalModelForSql', () => {
  it('un modèle cohérent ne produit aucune erreur', () => {
    const model: LogicalModel = { tables: [baseTable()], issues: [] };
    expect(validateLogicalModelForSql(model)).toEqual([]);
  });

  it('signale une table sans nom', () => {
    const model: LogicalModel = { tables: [baseTable({ name: '' })], issues: [] };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.tableWithoutName);
  });

  it('signale une colonne sans nom', () => {
    const model: LogicalModel = {
      tables: [
        baseTable({
          columns: [
            {
              id: 'c1',
              name: '',
              dataType: { kind: 'integer' },
              nullable: false,
              origin: 'entity-attribute',
            },
          ],
        }),
      ],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.columnWithoutName);
  });

  it('signale une table sans colonne', () => {
    const model: LogicalModel = {
      tables: [baseTable({ columns: [], primaryKey: [] })],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.tableWithoutColumns);
  });

  it('signale une clé primaire vers une colonne inexistante', () => {
    const model: LogicalModel = { tables: [baseTable({ primaryKey: ['inconnue'] })], issues: [] };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.primaryKeyUnknownColumn);
  });

  it('signale une contrainte unique vers une colonne inexistante', () => {
    const model: LogicalModel = {
      tables: [
        baseTable({
          uniqueConstraints: [{ id: 'uq1', name: 'uq_x', columnIds: ['inconnue'] }],
        }),
      ],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.uniqueConstraintUnknownColumn);
  });

  it('signale une FK vers une table référencée inexistante', () => {
    const model: LogicalModel = {
      tables: [
        baseTable({
          foreignKeys: [
            {
              id: 'fk1',
              name: 'fk_x',
              columnIds: ['c1'],
              referencedTableId: 'table-fantome',
              referencedColumnIds: ['zzz'],
              nullable: false,
              unique: false,
            },
          ],
        }),
      ],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.foreignKeyUnknownTable);
  });

  it('signale une FK vers une colonne locale inexistante', () => {
    const referenced = baseTable({ id: 't2', name: 'ref' });
    const model: LogicalModel = {
      tables: [
        referenced,
        baseTable({
          id: 't1',
          foreignKeys: [
            {
              id: 'fk1',
              name: 'fk_x',
              columnIds: ['inconnue'],
              referencedTableId: 't2',
              referencedColumnIds: ['c1'],
              nullable: false,
              unique: false,
            },
          ],
        }),
      ],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.foreignKeyLocalUnknownColumn);
  });

  it('signale une FK vers une colonne distante inexistante', () => {
    const referenced = baseTable({ id: 't2', name: 'ref' });
    const model: LogicalModel = {
      tables: [
        referenced,
        baseTable({
          id: 't1',
          foreignKeys: [
            {
              id: 'fk1',
              name: 'fk_x',
              columnIds: ['c1'],
              referencedTableId: 't2',
              referencedColumnIds: ['inconnue'],
              nullable: false,
              unique: false,
            },
          ],
        }),
      ],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.foreignKeyReferencedUnknownColumn);
  });

  it('signale un nombre de colonnes FK différent du nombre de colonnes référencées', () => {
    const referenced = baseTable({
      id: 't2',
      name: 'ref',
      columns: [
        {
          id: 'r1',
          name: 'a',
          dataType: { kind: 'integer' },
          nullable: false,
          origin: 'entity-attribute',
        },
        {
          id: 'r2',
          name: 'b',
          dataType: { kind: 'integer' },
          nullable: false,
          origin: 'entity-attribute',
        },
      ],
      primaryKey: ['r1', 'r2'],
    });
    const model: LogicalModel = {
      tables: [
        referenced,
        baseTable({
          id: 't1',
          foreignKeys: [
            {
              id: 'fk1',
              name: 'fk_x',
              columnIds: ['c1'],
              referencedTableId: 't2',
              referencedColumnIds: ['r1', 'r2'],
              nullable: false,
              unique: false,
            },
          ],
        }),
      ],
      issues: [],
    };
    const codes = validateLogicalModelForSql(model).map((i) => i.code);
    expect(codes).toContain(SQL_VALIDATION_CODES.foreignKeyColumnCountMismatch);
  });
});
