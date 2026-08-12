/**
 * Le diagnostic doit être *invisible* quand il est inactif : c'est ce que
 * ces tests vérifient en priorité, avant même l'exactitude des mesures. Une
 * instrumentation qui coûte quelque chose hors diagnostic serait exactement
 * le genre de régression que cette mission cherche à éviter.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  countEvent,
  getPerformanceReport,
  initPerformanceDiagnostics,
  isPerformanceDebugEnabled,
  measureSync,
  recordMeasurement,
  resetPerformanceDiagnostics,
  setPerformanceDebugEnabledForTests,
  subscribeToPerformance,
} from './diagnostics';

afterEach(() => {
  setPerformanceDebugEnabledForTests(false);
  vi.restoreAllMocks();
});

describe('activation', () => {
  it("reste inactif sans le paramètre d'URL", () => {
    expect(initPerformanceDiagnostics('')).toBe(false);
    expect(initPerformanceDiagnostics('?other=1')).toBe(false);
    expect(initPerformanceDiagnostics('?debugPerformance=0')).toBe(false);
    expect(isPerformanceDebugEnabled()).toBe(false);
  });

  it("s'active avec ?debugPerformance=1 en développement", () => {
    // Les tests s'exécutent avec `import.meta.env.DEV` à vrai : la garde de
    // production n'est donc pas ce qui est vérifié ici, mais bien la lecture
    // du paramètre. L'élimination en production est vérifiée par la taille
    // du bundle (voir docs/canvas-performance.md).
    expect(initPerformanceDiagnostics('?debugPerformance=1')).toBe(true);
    expect(isPerformanceDebugEnabled()).toBe(true);
  });

  it('accepte le paramètre parmi d’autres', () => {
    expect(initPerformanceDiagnostics('?a=b&debugPerformance=1&c=d')).toBe(true);
  });
});

describe('inactif', () => {
  it("n'enregistre rien", () => {
    setPerformanceDebugEnabledForTests(false);
    recordMeasurement({ label: 'x', durationMs: 12 });
    countEvent('y');
    measureSync('z', () => 1);

    expect(getPerformanceReport()).toEqual({ measurements: [], counters: {} });
  });

  it('ne pose aucun marqueur de performance', () => {
    setPerformanceDebugEnabledForTests(false);
    const mark = vi.spyOn(performance, 'mark');
    const measure = vi.spyOn(performance, 'measure');

    measureSync('drag-commit', () => 'ok');

    expect(mark).not.toHaveBeenCalled();
    expect(measure).not.toHaveBeenCalled();
  });

  it("retourne quand même le résultat de l'opération", () => {
    setPerformanceDebugEnabledForTests(false);
    expect(measureSync('drag-commit', () => 42)).toBe(42);
  });
});

describe('actif', () => {
  it("retourne le résultat de l'opération et enregistre sa durée", () => {
    setPerformanceDebugEnabledForTests(true);

    const result = measureSync('drag-commit', () => 'valeur', { nodes: 3 });

    expect(result).toBe('valeur');
    const { measurements } = getPerformanceReport();
    expect(measurements).toHaveLength(1);
    expect(measurements[0]?.label).toBe('drag-commit');
    expect(measurements[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(measurements[0]?.metadata).toEqual({ nodes: 3 });
  });

  it('mesure aussi une opération qui lève, puis propage', () => {
    setPerformanceDebugEnabledForTests(true);

    expect(() =>
      measureSync('drag-commit', () => {
        throw new Error('boum');
      }),
    ).toThrow('boum');
    expect(getPerformanceReport().measurements).toHaveLength(1);
  });

  it('efface ses marqueurs pour ne pas gonfler la chronologie du navigateur', () => {
    setPerformanceDebugEnabledForTests(true);

    measureSync('drag-commit', () => null);
    measureSync('drag-commit', () => null);

    expect(performance.getEntriesByName('modrise:drag-commit')).toHaveLength(0);
    expect(performance.getEntriesByName('modrise:drag-commit:start')).toHaveLength(0);
  });

  it('cumule les compteurs', () => {
    setPerformanceDebugEnabledForTests(true);

    countEvent('canvas-render');
    countEvent('canvas-render');
    countEvent('autosave', 3);

    expect(getPerformanceReport().counters).toEqual({ 'canvas-render': 2, autosave: 3 });
  });

  it('borne le tampon de mesures et conserve les plus récentes', () => {
    setPerformanceDebugEnabledForTests(true);

    for (let index = 0; index < 120; index += 1) {
      recordMeasurement({ label: `m-${index}`, durationMs: index });
    }

    const { measurements } = getPerformanceReport();
    expect(measurements).toHaveLength(50);
    expect(measurements[0]?.label).toBe('m-70');
    expect(measurements.at(-1)?.label).toBe('m-119');
  });

  it('remet tout à zéro', () => {
    setPerformanceDebugEnabledForTests(true);
    countEvent('canvas-render');
    recordMeasurement({ label: 'x', durationMs: 1 });

    resetPerformanceDiagnostics();

    expect(getPerformanceReport()).toEqual({ measurements: [], counters: {} });
  });
});

describe('abonnement', () => {
  it('notifie les abonnés, et plus après désabonnement', () => {
    setPerformanceDebugEnabledForTests(true);
    const listener = vi.fn();
    const unsubscribe = subscribeToPerformance(listener);

    countEvent('canvas-render');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    countEvent('canvas-render');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ne notifie pas quand le diagnostic est inactif : aucun rendu n'est provoqué", () => {
    setPerformanceDebugEnabledForTests(false);
    const listener = vi.fn();
    const unsubscribe = subscribeToPerformance(listener);

    countEvent('canvas-render');
    recordMeasurement({ label: 'x', durationMs: 1 });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
