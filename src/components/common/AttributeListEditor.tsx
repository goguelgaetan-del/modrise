/**
 * Éditeur de la liste d'attributs d'une entité ou d'une association :
 * nom, type, obligatoire, unique, ordre, suppression — et appartenance à
 * l'identifiant primaire lorsque le porteur est une entité.
 */
import { ArrowDown, ArrowUp, KeyRound, Plus, Trash2 } from 'lucide-react';
import type { Attribute, Entity } from '@/core/conceptual-model/types';
import { isPrimaryAttribute } from '@/core/conceptual-model/operations';
import { useProjectStore } from '@/stores/project-store';
import { withHistory } from '@/features/history/with-history';
import { useFieldHistory } from '@/features/history/use-field-history';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DataTypeEditor } from './DataTypeEditor';

interface AttributeListEditorProps {
  ownerId: string;
  attributes: Attribute[];
  /** Fournie quand le porteur est une entité : active la gestion de l'identifiant primaire. */
  entity?: Entity;
}

export function AttributeListEditor({ ownerId, attributes, entity }: AttributeListEditorProps) {
  const addAttribute = useProjectStore((state) => state.addAttribute);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Attributs</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => withHistory('Ajouter un attribut', () => addAttribute(ownerId))}
          data-testid="add-attribute"
        >
          <Plus aria-hidden />
          Ajouter un attribut
        </Button>
      </div>

      {attributes.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucun attribut pour le moment.</p>
      )}

      <ul className="space-y-2">
        {attributes.map((attribute, index) => (
          <AttributeRow
            key={attribute.id}
            ownerId={ownerId}
            attribute={attribute}
            entity={entity}
            primary={entity ? isPrimaryAttribute(entity, attribute.id) : false}
            isFirst={index === 0}
            isLast={index === attributes.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}

interface AttributeRowProps {
  ownerId: string;
  attribute: Attribute;
  entity: Entity | undefined;
  primary: boolean;
  isFirst: boolean;
  isLast: boolean;
}

function AttributeRow({ ownerId, attribute, entity, primary, isFirst, isLast }: AttributeRowProps) {
  const updateAttribute = useProjectStore((state) => state.updateAttribute);
  const removeAttribute = useProjectStore((state) => state.removeAttribute);
  const moveAttribute = useProjectStore((state) => state.moveAttribute);
  const togglePrimary = useProjectStore((state) => state.toggleAttributeInPrimaryIdentifier);
  const nameHistory = useFieldHistory("Modifier le nom de l'attribut");
  const dataTypeHistory = useFieldHistory("Modifier le type de la donnée");

  return (
    <li className="space-y-2 rounded-md border p-2">
      <div className="flex items-center gap-1.5">
        {entity && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant={primary ? 'default' : 'ghost'}
                aria-pressed={primary}
                aria-label={
                  primary
                    ? `Retirer « ${attribute.name} » de l'identifiant primaire`
                    : `Ajouter « ${attribute.name} » à l'identifiant primaire`
                }
                onClick={() =>
                  withHistory("Modifier l'identifiant primaire", () =>
                    togglePrimary(entity.id, attribute.id),
                  )
                }
              >
                <KeyRound aria-hidden className={cn(!primary && 'text-muted-foreground')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Identifiant primaire</TooltipContent>
          </Tooltip>
        )}
        <Input
          value={attribute.name}
          aria-label="Nom de l'attribut"
          onChange={(event) => updateAttribute(ownerId, attribute.id, { name: event.target.value })}
          onFocus={nameHistory.onFocus}
          onBlur={nameHistory.onBlur}
          className="h-8"
          data-testid="attribute-name-input"
        />
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Monter l'attribut"
          disabled={isFirst}
          onClick={() =>
            withHistory("Déplacer l'attribut", () => moveAttribute(ownerId, attribute.id, 'up'))
          }
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Descendre l'attribut"
          disabled={isLast}
          onClick={() =>
            withHistory("Déplacer l'attribut", () => moveAttribute(ownerId, attribute.id, 'down'))
          }
        >
          <ArrowDown aria-hidden />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Supprimer l'attribut « ${attribute.name} »`}
          onClick={() =>
            withHistory("Supprimer l'attribut", () => removeAttribute(ownerId, attribute.id))
          }
        >
          <Trash2 aria-hidden className="text-destructive" />
        </Button>
      </div>

      <DataTypeEditor
        value={attribute.dataType}
        onChange={(dataType) => updateAttribute(ownerId, attribute.id, { dataType })}
        onFieldFocus={dataTypeHistory.onFocus}
        onFieldBlur={dataTypeHistory.onBlur}
      />

      <div className="flex gap-4">
        <Label className="gap-1.5 text-xs font-normal">
          <Checkbox
            checked={attribute.required}
            onCheckedChange={(checked) =>
              withHistory("Modifier le caractère obligatoire de l'attribut", () =>
                updateAttribute(ownerId, attribute.id, { required: checked === true }),
              )
            }
          />
          Obligatoire
        </Label>
        <Label className="gap-1.5 text-xs font-normal">
          <Checkbox
            checked={attribute.unique}
            onCheckedChange={(checked) =>
              withHistory("Modifier l'unicité de l'attribut", () =>
                updateAttribute(ownerId, attribute.id, { unique: checked === true }),
              )
            }
          />
          Unique
        </Label>
      </div>
    </li>
  );
}
