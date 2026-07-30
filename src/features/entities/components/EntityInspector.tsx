/**
 * Inspecteur d'entité : nom, description, attributs et identifiant primaire.
 *
 * TODO(v0.2) : gestion complète des identifiants alternatifs (création,
 * nommage, composition) — le modèle et la validation les supportent déjà.
 */
import { useId } from 'react';
import { Trash2 } from 'lucide-react';
import type { Entity } from '@/core/conceptual-model/types';
import { useProjectStore } from '@/stores/project-store';
import { useFieldHistory } from '@/features/history/use-field-history';
import { AttributeListEditor } from '@/components/common/AttributeListEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface EntityInspectorProps {
  entity: Entity;
  onRequestDelete: () => void;
}

export function EntityInspector({ entity, onRequestDelete }: EntityInspectorProps) {
  const updateEntity = useProjectStore((state) => state.updateEntity);
  const nameId = useId();
  const descriptionId = useId();
  const nameHistory = useFieldHistory("Modifier le nom de l'entité");
  const descriptionHistory = useFieldHistory("Modifier la description de l'entité");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Entité</h2>
        <p className="text-xs text-muted-foreground">
          Modifiez le nom, la description et les attributs.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={nameId}>Nom</Label>
        <Input
          id={nameId}
          value={entity.name}
          onChange={(event) => updateEntity(entity.id, { name: event.target.value })}
          onFocus={nameHistory.onFocus}
          onBlur={nameHistory.onBlur}
          data-testid="entity-name-input"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={descriptionId}>Description</Label>
        <Textarea
          id={descriptionId}
          value={entity.description ?? ''}
          rows={2}
          onChange={(event) => updateEntity(entity.id, { description: event.target.value })}
          onFocus={descriptionHistory.onFocus}
          onBlur={descriptionHistory.onBlur}
        />
      </div>

      <Separator />
      <AttributeListEditor ownerId={entity.id} attributes={entity.attributes} entity={entity} />
      <Separator />

      <Button variant="destructive" size="sm" onClick={onRequestDelete}>
        <Trash2 aria-hidden />
        Supprimer l'entité
      </Button>
    </div>
  );
}
