/**
 * Paires de poignées (source + cible) sur les quatre côtés d'un nœud.
 * Les ids (`source-top`, `target-left`…) sont référencés par l'adaptateur
 * d'arêtes pour choisir le côté de connexion le plus naturel.
 */
import { Handle, Position } from '@xyflow/react';

const SIDES = [
  { side: 'top', position: Position.Top },
  { side: 'right', position: Position.Right },
  { side: 'bottom', position: Position.Bottom },
  { side: 'left', position: Position.Left },
] as const;

export function NodeHandles() {
  return (
    <>
      {SIDES.map(({ side, position }) => (
        <span key={side}>
          <Handle
            id={`source-${side}`}
            type="source"
            position={position}
            className="!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
          <Handle
            id={`target-${side}`}
            type="target"
            position={position}
            className="!h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </span>
      ))}
    </>
  );
}
