/**
 * Sanité de performance sur un grand modèle (v0.5) — pas un benchmark
 * scientifique : un plafond large qui échoue si un recalcul devient
 * quadratique ou pire à cette échelle, sans viser un chiffre précis.
 */
import { describe, expect, it } from 'vitest';
import { largeModel } from './models';
import { validateConceptualModel } from '@/core/validation/validate';
import { transformToLogicalModel } from '@/core/transformations/mcd-to-mld';
import { generatePostgreSqlScript } from '@/core/sql/postgresql/generate';
import { DEFAULT_SQL_GENERATION_OPTIONS } from '@/core/sql/dialect';

const TIME_BUDGET_MS = 2000;

describe('performance sur un grand modèle (~100 entités, ~150 associations)', () => {
  const model = largeModel();

  it('valide le modèle sans erreur bloquante et dans un temps raisonnable', () => {
    const start = performance.now();
    const issues = validateConceptualModel(model);
    const elapsed = performance.now() - start;
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
  });

  it('transforme le MCD en MLD dans un temps raisonnable', () => {
    const start = performance.now();
    const result = transformToLogicalModel(model);
    const elapsed = performance.now() - start;
    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
  });

  it('génère le SQL PostgreSQL dans un temps raisonnable', () => {
    const logical = transformToLogicalModel(model);
    if (!logical.success) throw new Error('MLD inattendu en échec');
    const start = performance.now();
    const result = generatePostgreSqlScript(logical.model, DEFAULT_SQL_GENERATION_OPTIONS);
    const elapsed = performance.now() - start;
    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(TIME_BUDGET_MS);
  });
});
