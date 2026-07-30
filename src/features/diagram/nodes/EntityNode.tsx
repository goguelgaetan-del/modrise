/**
 * Nœud d'entité : rectangle avec en-tête (nom) et liste des attributs.
 * Trois statuts distincts, jamais distingués par la seule couleur : clé
 * primaire (icône clé + souligné), identifiant alternatif (icône empreinte)
 * et attribut simplement unique (icône astérisque).
 */
import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { Asterisk, Fingerprint, KeyRound } from 'lucide-react';
import { formatDataType } from '@/core/conceptual-model/data-types';
import { isAlternateIdentifierAttribute, isPrimaryAttribute } from '@/core/conceptual-model/operations';
import { cn } from '@/lib/utils';
import type { EntityNodeData } from '../adapters/to-react-flow';
import { NodeHandles } from './NodeHandles';

export const EntityNode = memo(function EntityNode({
  data,
  selected,
}: NodeProps<Node<EntityNodeData, 'entity'>>) {
  const { entity, hasErrors } = data;
  return (
    <div
      className={cn(
        'group min-w-52 rounded-md border-2 bg-card text-card-foreground shadow-sm transition-colors',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        hasErrors && 'border-destructive',
      )}
      data-testid={`entity-node-${entity.name}`}
    >
      <NodeHandles />
      <header
        className={cn(
          'rounded-t border-b bg-muted/60 px-3 py-1.5 text-center text-sm font-semibold tracking-wide',
          hasErrors && 'text-destructive',
        )}
      >
        {entity.name.trim() || <span className="italic text-muted-foreground">(sans nom)</span>}
      </header>
      <ul className="px-3 py-1.5 text-xs leading-5">
        {entity.attributes.length === 0 && (
          <li className="italic text-muted-foreground">Aucun attribut</li>
        )}
        {entity.attributes.map((attribute) => {
          const primary = isPrimaryAttribute(entity, attribute.id);
          const alternate = !primary && isAlternateIdentifierAttribute(entity, attribute.id);
          return (
            <li key={attribute.id} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-3.5 shrink-0">
                {primary ? (
                  <KeyRound
                    aria-label="Identifiant primaire"
                    className="h-3 w-3 text-amber-600 dark:text-amber-400"
                  />
                ) : alternate ? (
                  <Fingerprint
                    aria-label="Identifiant alternatif"
                    className="h-3 w-3 text-indigo-600 dark:text-indigo-400"
                  />
                ) : (
                  attribute.unique && (
                    <Asterisk aria-label="Attribut unique" className="h-3 w-3 text-muted-foreground" />
                  )
                )}
              </span>
              <span
                className={cn(
                  primary && 'font-medium underline underline-offset-2',
                  alternate && 'underline decoration-dotted underline-offset-2',
                )}
              >
                {attribute.name.trim() || '(sans nom)'}
              </span>
              <span className="text-muted-foreground">: {formatDataType(attribute.dataType)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
