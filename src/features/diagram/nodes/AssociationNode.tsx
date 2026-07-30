/**
 * Nœud d'association : bloc arrondi (style « losange adouci ») visuellement
 * distinct des entités, affichant le nom et les attributs portés.
 */
import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Lock } from 'lucide-react';
import { formatDataType } from '@/core/conceptual-model/data-types';
import { cn } from '@/lib/utils';
import type { AssociationNodeData } from '../adapters/to-react-flow';
import { NodeHandles } from './NodeHandles';

export const AssociationNode = memo(function AssociationNode({
  data,
  selected,
}: NodeProps<Node<AssociationNodeData, 'association'>>) {
  const { association, hasErrors, locked } = data;
  return (
    <div
      className={cn(
        'group relative min-w-36 rounded-3xl border-2 bg-primary/5 px-4 py-2 text-center shadow-sm transition-colors dark:bg-primary/15',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-primary/50',
        hasErrors && 'border-destructive',
      )}
      data-testid={`association-node-${association.name}`}
    >
      <NodeHandles />
      {locked && (
        <Lock
          aria-label="Nœud verrouillé"
          className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
        />
      )}
      <div className={cn('text-sm font-semibold tracking-wide', hasErrors && 'text-destructive')}>
        {association.name.trim() || (
          <span className="italic text-muted-foreground">(sans nom)</span>
        )}
      </div>
      {association.attributes.length > 0 && (
        <ul className="mt-1 border-t border-primary/30 pt-1 text-xs leading-5 text-muted-foreground">
          {association.attributes.map((attribute) => (
            <li key={attribute.id} className="whitespace-nowrap">
              {attribute.name.trim() || '(sans nom)'} : {formatDataType(attribute.dataType)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
