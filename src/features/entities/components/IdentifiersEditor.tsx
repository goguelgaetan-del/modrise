/**
 * Gestion complète des identifiants d'une entité : identifiant primaire et
 * identifiants alternatifs, sous forme de cartes structurées plutôt que de
 * cases à cocher dispersées dans la liste des attributs (voir
 * docs/identifiers.md).
 */
import { useId } from 'react';
import { ArrowDown, ArrowUp, Fingerprint, KeyRound, Plus, Star, Trash2, X } from 'lucide-react';
import type { Attribute, Entity, Identifier } from '@/core/conceptual-model/types';
import { alternateIdentifiers, primaryIdentifier } from '@/core/conceptual-model/operations';
import { useProjectStore } from '@/stores/project-store';
import { withHistory } from '@/features/history/with-history';
import { useFieldHistory } from '@/features/history/use-field-history';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface IdentifiersEditorProps {
  entity: Entity;
}

export function IdentifiersEditor({ entity }: IdentifiersEditorProps) {
  const addAlternateIdentifier = useProjectStore((state) => state.addAlternateIdentifier);
  const primary = primaryIdentifier(entity);
  const alternates = alternateIdentifiers(entity);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Identifiants</h3>
      {primary && <IdentifierCard entity={entity} identifier={primary} />}
      {alternates.map((identifier) => (
        <IdentifierCard key={identifier.id} entity={entity} identifier={identifier} />
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          withHistory('Ajouter un identifiant alternatif', () => addAlternateIdentifier(entity.id))
        }
        data-testid="add-alternate-identifier"
      >
        <Plus aria-hidden />
        Ajouter un identifiant alternatif
      </Button>
    </div>
  );
}

interface IdentifierCardProps {
  entity: Entity;
  identifier: Identifier;
}

function IdentifierCard({ entity, identifier }: IdentifierCardProps) {
  const renameIdentifier = useProjectStore((state) => state.renameIdentifier);
  const removeIdentifier = useProjectStore((state) => state.removeIdentifier);
  const addAttributeToIdentifier = useProjectStore((state) => state.addAttributeToIdentifier);
  const removeAttributeFromIdentifier = useProjectStore(
    (state) => state.removeAttributeFromIdentifier,
  );
  const moveIdentifierAttribute = useProjectStore((state) => state.moveIdentifierAttribute);
  const promoteIdentifierToPrimary = useProjectStore((state) => state.promoteIdentifierToPrimary);
  const nameHistory = useFieldHistory("Renommer l'identifiant");
  const nameId = useId();

  const selectedAttributes = identifier.attributeIds
    .map((id) => entity.attributes.find((attribute) => attribute.id === id))
    .filter((attribute): attribute is Attribute => attribute !== undefined);
  const availableAttributes = entity.attributes.filter(
    (attribute) => !identifier.attributeIds.includes(attribute.id),
  );

  return (
    <div
      className="space-y-2 rounded-md border p-2"
      data-testid={identifier.primary ? 'identifier-card-primary' : `identifier-card-${identifier.id}`}
    >
      <div className="flex items-center gap-1.5">
        {identifier.primary ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <KeyRound
                  aria-label="Identifiant primaire"
                  className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>Identifiant primaire</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Fingerprint
                  aria-label="Identifiant alternatif"
                  className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>Identifiant alternatif</TooltipContent>
          </Tooltip>
        )}
        <Label htmlFor={nameId} className="sr-only">
          Nom de l'identifiant
        </Label>
        <Input
          id={nameId}
          value={identifier.name ?? ''}
          placeholder={identifier.primary ? 'Identifiant primaire' : 'Sans nom'}
          className="h-8 flex-1"
          onChange={(event) => renameIdentifier(entity.id, identifier.id, event.target.value)}
          onFocus={nameHistory.onFocus}
          onBlur={nameHistory.onBlur}
          data-testid={
            identifier.primary
              ? 'identifier-name-primary'
              : `identifier-name-${identifier.id}`
          }
        />
        {!identifier.primary && (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Promouvoir en identifiant primaire"
              onClick={() =>
                withHistory('Promouvoir un identifiant alternatif en primaire', () =>
                  promoteIdentifierToPrimary(entity.id, identifier.id),
                )
              }
            >
              <Star aria-hidden />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Supprimer l'identifiant alternatif"
              onClick={() =>
                withHistory('Supprimer un identifiant alternatif', () =>
                  removeIdentifier(entity.id, identifier.id),
                )
              }
            >
              <Trash2 aria-hidden className="text-destructive" />
            </Button>
          </>
        )}
      </div>

      {selectedAttributes.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">Aucun attribut sélectionné.</p>
      ) : (
        <ul className="space-y-1">
          {selectedAttributes.map((attribute, index) => (
            <li key={attribute.id} className="flex items-center gap-1 text-xs">
              <span className="flex-1 truncate">{attribute.name.trim() || '(sans nom)'}</span>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                aria-label={`Monter « ${attribute.name} » dans l'identifiant`}
                disabled={index === 0}
                onClick={() =>
                  withHistory("Réordonner l'identifiant", () =>
                    moveIdentifierAttribute(entity.id, identifier.id, attribute.id, 'up'),
                  )
                }
              >
                <ArrowUp aria-hidden className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                aria-label={`Descendre « ${attribute.name} » dans l'identifiant`}
                disabled={index === selectedAttributes.length - 1}
                onClick={() =>
                  withHistory("Réordonner l'identifiant", () =>
                    moveIdentifierAttribute(entity.id, identifier.id, attribute.id, 'down'),
                  )
                }
              >
                <ArrowDown aria-hidden className="h-3 w-3" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-6 w-6"
                aria-label={`Retirer « ${attribute.name} » de l'identifiant`}
                onClick={() =>
                  withHistory("Retirer un attribut de l'identifiant", () =>
                    removeAttributeFromIdentifier(entity.id, identifier.id, attribute.id),
                  )
                }
              >
                <X aria-hidden className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {availableAttributes.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus aria-hidden className="h-3 w-3" />
              Ajouter un attribut
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableAttributes.map((attribute) => (
              <DropdownMenuItem
                key={attribute.id}
                onSelect={() =>
                  withHistory("Ajouter un attribut à l'identifiant", () =>
                    addAttributeToIdentifier(entity.id, identifier.id, attribute.id),
                  )
                }
              >
                {attribute.name.trim() || '(sans nom)'}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
