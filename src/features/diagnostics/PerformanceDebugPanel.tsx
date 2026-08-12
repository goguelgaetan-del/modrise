/**
 * Panneau de diagnostic de performance (§ développement uniquement).
 *
 * Ne s'affiche que sur une URL portant `?debugPerformance=1`, et seulement
 * dans un build de développement — en production, le module n'est même pas
 * chargé (voir `AppLayout`, où sa création est gardée par
 * `import.meta.env.DEV`, éliminé statiquement au build).
 *
 * Il ne lit que de l'état déjà présent dans le navigateur et n'émet aucune
 * requête : aucune donnée ne quitte la machine.
 */
import { useEffect, useState } from 'react';
import {
  getPerformanceReport,
  resetPerformanceDiagnostics,
  subscribeToPerformance,
  type PerformanceReport,
} from '@/lib/performance/diagnostics';
import { useDiagramStore } from '@/stores/diagram-store';
import { useProjectStore } from '@/stores/project-store';

const COUNTER_LABELS: Record<string, string> = {
  'canvas-render': 'Rendus du canvas',
  'mld-recompute': 'Recalculs MLD',
  'sql-recompute': 'Recalculs SQL',
  autosave: 'Sauvegardes',
};

export function PerformanceDebugPanel() {
  const [report, setReport] = useState<PerformanceReport>(getPerformanceReport);
  const nodeCount = useDiagramStore((state) => state.nodes.length);
  const associations = useProjectStore((state) => state.conceptualModel.associations);

  useEffect(() => subscribeToPerformance(() => setReport(getPerformanceReport())), []);

  const edgeCount = associations.reduce(
    (total, association) => total + association.participations.length,
    0,
  );
  const lastCommit = report.measurements.findLast((entry) => entry.label === 'drag-commit');

  return (
    <aside
      data-testid="performance-debug-panel"
      className="pointer-events-none fixed bottom-4 left-4 z-50 w-64 rounded-md border bg-background/95 p-3 font-mono text-xs shadow-lg"
    >
      <p className="mb-2 font-sans font-semibold">Diagnostic de performance</p>
      <dl className="space-y-0.5">
        <Row label="Nœuds" value={nodeCount} />
        <Row label="Arêtes" value={edgeCount} />
        {Object.entries(COUNTER_LABELS).map(([key, label]) => (
          <Row key={key} label={label} value={report.counters[key] ?? 0} />
        ))}
        <Row
          label="Dernier commit"
          value={lastCommit ? `${lastCommit.durationMs.toFixed(1)} ms` : '—'}
        />
      </dl>
      <button
        type="button"
        onClick={() => resetPerformanceDiagnostics()}
        className="pointer-events-auto mt-2 w-full rounded border px-2 py-1 font-sans hover:bg-accent"
      >
        Remettre à zéro
      </button>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default PerformanceDebugPanel;
