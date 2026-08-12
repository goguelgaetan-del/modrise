/**
 * Arête de participation : trait droit entre une entité et une association,
 * étiqueté par la cardinalité (proche du côté entité) et le rôle éventuel.
 */
import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from '@xyflow/react';
import type { Edge, EdgeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { ParticipationEdgeData } from '../adapters/to-react-flow';

type ParticipationEdgeProps = EdgeProps<Edge<ParticipationEdgeData, 'participation'>>;

/** Voir le commentaire équivalent dans `EntityNode.tsx`. */
function arePropsEqual(prev: ParticipationEdgeProps, next: ParticipationEdgeProps): boolean {
  return (
    prev.selected === next.selected &&
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.data?.cardinalityLabel === next.data?.cardinalityLabel &&
    prev.data?.role === next.data?.role &&
    prev.data?.hasErrors === next.data?.hasErrors
  );
}

export const ParticipationEdge = memo(function ParticipationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: ParticipationEdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  // La cardinalité est placée près de l'entité (côté source de l'arête).
  const labelX = sourceX + (targetX - sourceX) * 0.3;
  const labelY = sourceY + (targetY - sourceY) * 0.3;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={cn('!stroke-2', selected ? '!stroke-primary' : '!stroke-muted-foreground/60')}
      />
      {data && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className={cn(
              'pointer-events-none absolute rounded border bg-background px-1 py-0.5 text-[10px] font-medium leading-none shadow-sm',
              data.hasErrors && 'border-destructive text-destructive',
            )}
          >
            {data.cardinalityLabel}
            {data.role ? <span className="text-muted-foreground"> · {data.role}</span> : null}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}, arePropsEqual);
