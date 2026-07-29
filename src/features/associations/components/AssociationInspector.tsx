/**
 * Inspecteur d'association : nom, description, attributs portés et
 * participations (entité, rôle, cardinalité).
 */
import { useId } from 'react';
import { Trash2 } from 'lucide-react';
import type { Association } from '@/core/conceptual-model/types';
import { CARDINALITIES, formatCardinality, parseCardinality } from '@/core/conceptual-model/types';
import { useProjectStore } from '@/stores/project-store';
import { AttributeListEditor } from '@/components/common/AttributeListEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface AssociationInspectorProps {
  association: Association;
  onRequestDelete: () => void;
}

export function AssociationInspector({ association, onRequestDelete }: AssociationInspectorProps) {
  const updateAssociation = useProjectStore((state) => state.updateAssociation);
  const updateParticipation = useProjectStore((state) => state.updateParticipation);
  const removeParticipation = useProjectStore((state) => state.removeParticipation);
  const entities = useProjectStore((state) => state.conceptualModel.entities);
  const nameId = useId();
  const descriptionId = useId();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Association</h2>
        <p className="text-xs text-muted-foreground">
          Reliez des entités sur le canvas pour créer des participations.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={nameId}>Nom</Label>
        <Input
          id={nameId}
          value={association.name}
          onChange={(event) => updateAssociation(association.id, { name: event.target.value })}
          data-testid="association-name-input"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={descriptionId}>Description</Label>
        <Textarea
          id={descriptionId}
          value={association.description ?? ''}
          rows={2}
          onChange={(event) =>
            updateAssociation(association.id, { description: event.target.value })
          }
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Participations</h3>
        {association.participations.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucune participation. Tracez un lien depuis une entité vers cette association.
          </p>
        )}
        <ul className="space-y-2">
          {association.participations.map((participation) => {
            const entity = entities.find((e) => e.id === participation.entityId);
            return (
              <li key={participation.id} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {entity?.name ?? <span className="italic">Entité inconnue</span>}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Supprimer la participation de « ${entity?.name ?? '?'} »`}
                    onClick={() => removeParticipation(association.id, participation.id)}
                  >
                    <Trash2 aria-hidden className="text-destructive" />
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <div className="w-24">
                    <Label className="text-xs">Cardinalité</Label>
                    <Select
                      value={formatCardinality(participation.cardinality)}
                      onValueChange={(value) => {
                        const cardinality = parseCardinality(value);
                        if (cardinality) {
                          updateParticipation(association.id, participation.id, { cardinality });
                        }
                      }}
                    >
                      <SelectTrigger size="sm" className="w-full" aria-label="Cardinalité">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARDINALITIES.map((cardinality) => (
                          <SelectItem
                            key={formatCardinality(cardinality)}
                            value={formatCardinality(cardinality)}
                          >
                            {formatCardinality(cardinality)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Rôle (optionnel)</Label>
                    <Input
                      value={participation.role ?? ''}
                      placeholder="ex. manager"
                      className="h-8"
                      onChange={(event) =>
                        updateParticipation(association.id, participation.id, {
                          role: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Separator />
      <AttributeListEditor ownerId={association.id} attributes={association.attributes} />
      <Separator />

      <Button variant="destructive" size="sm" onClick={onRequestDelete}>
        <Trash2 aria-hidden />
        Supprimer l'association
      </Button>
    </div>
  );
}
