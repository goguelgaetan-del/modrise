/**
 * Instrumentation de diagnostic, strictement locale et strictement de
 * développement.
 *
 * Trois garanties, dans l'ordre d'importance :
 *
 * 1. **Aucune donnée ne quitte le navigateur.** Il n'y a pas de télémétrie,
 *    pas de requête réseau, pas de stockage persistant : les mesures vivent
 *    dans un tampon circulaire en mémoire et disparaissent au rechargement.
 * 2. **Rien n'existe en production.** Tout est gardé par
 *    `import.meta.env.DEV`, que le bundler remplace par `false` lors d'un
 *    build : les branches sont éliminées et le panneau n'est même pas
 *    importé (voir `AppLayout`).
 * 3. **Aucun changement de comportement.** Les fonctions de mesure
 *    retournent la valeur de la fonction mesurée, et se réduisent à un
 *    appel direct quand le diagnostic est désactivé — c'est-à-dire dans la
 *    quasi-totalité des sessions, y compris en développement.
 *
 * Le diagnostic ne s'active que si l'URL porte `?debugPerformance=1`.
 */

export interface PerformanceMeasurement {
  label: string;
  durationMs: number;
  metadata?: Record<string, number | string>;
}

export interface PerformanceReport {
  measurements: PerformanceMeasurement[];
  counters: Record<string, number>;
}

/** Taille du tampon circulaire : borne la mémoire retenue. */
const MAX_MEASUREMENTS = 50;

const measurements: PerformanceMeasurement[] = [];
const counters = new Map<string, number>();
const listeners = new Set<() => void>();

let enabled = false;

/**
 * Le diagnostic est-il actif ? Faux en production quoi qu'il arrive, et
 * faux en développement sans le paramètre d'URL.
 */
export function isPerformanceDebugEnabled(): boolean {
  return enabled;
}

/**
 * Lit le paramètre d'URL. Appelé une fois au démarrage de l'application ;
 * séparé de la lecture pour rester testable sans navigateur.
 */
export function initPerformanceDiagnostics(search: string): boolean {
  enabled = import.meta.env.DEV && new URLSearchParams(search).get('debugPerformance') === '1';
  return enabled;
}

function notify(): void {
  for (const listener of listeners) listener();
}

/** Enregistre une mesure déjà calculée. Sans effet si le diagnostic est inactif. */
export function recordMeasurement(measurement: PerformanceMeasurement): void {
  if (!enabled) return;
  measurements.push(measurement);
  if (measurements.length > MAX_MEASUREMENTS) measurements.shift();
  notify();
}

/**
 * Mesure une opération synchrone et retourne son résultat inchangé.
 *
 * Les marqueurs `performance` sont posés puis **effacés** aussitôt la
 * mesure lue : sans cela, une session de diagnostic un peu longue
 * accumulerait des milliers d'entrées dans la chronologie du navigateur.
 */
export function measureSync<T>(
  label: string,
  operation: () => T,
  metadata?: Record<string, number | string>,
): T {
  if (!enabled) return operation();

  const start = `modrise:${label}:start`;
  const end = `modrise:${label}:end`;
  performance.mark(start);
  try {
    return operation();
  } finally {
    performance.mark(end);
    const entry = performance.measure(`modrise:${label}`, start, end);
    recordMeasurement({ label, durationMs: entry.duration, metadata });
    performance.clearMarks(start);
    performance.clearMarks(end);
    performance.clearMeasures(`modrise:${label}`);
  }
}

/** Incrémente un compteur nommé (rendus, sauvegardes, recalculs…). */
export function countEvent(name: string, by = 1): void {
  if (!enabled) return;
  counters.set(name, (counters.get(name) ?? 0) + by);
  notify();
}

export function getPerformanceReport(): PerformanceReport {
  return {
    measurements: [...measurements],
    counters: Object.fromEntries(counters),
  };
}

export function resetPerformanceDiagnostics(): void {
  measurements.length = 0;
  counters.clear();
  notify();
}

/** Abonnement du panneau de diagnostic ; retourne le désabonnement. */
export function subscribeToPerformance(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Réservé aux tests : force l'état d'activation sans passer par une URL. */
export function setPerformanceDebugEnabledForTests(value: boolean): void {
  enabled = value;
  resetPerformanceDiagnostics();
}
