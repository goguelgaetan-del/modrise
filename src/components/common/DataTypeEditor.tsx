/**
 * Éditeur du type conceptuel d'un attribut : genre + options
 * (longueur pour varchar, précision/échelle pour decimal).
 */
import { useId } from 'react';
import type {
  ConceptualDataType,
  ConceptualDataTypeKind,
} from '@/core/conceptual-model/data-types';
import {
  DATA_TYPE_KINDS,
  dataTypeKindLabel,
  defaultDataType,
} from '@/core/conceptual-model/data-types';
import { withHistory } from '@/features/history/with-history';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTypeEditorProps {
  value: ConceptualDataType;
  onChange: (value: ConceptualDataType) => void;
  onFieldFocus?: () => void;
  onFieldBlur?: () => void;
}

export function DataTypeEditor({ value, onChange, onFieldFocus, onFieldBlur }: DataTypeEditorProps) {
  const selectId = useId();

  const onKindChange = (kind: string) => {
    withHistory('Modifier le type de la donnée', () =>
      onChange(defaultDataType(kind as ConceptualDataTypeKind)),
    );
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-32 flex-1">
        <Label htmlFor={selectId} className="text-xs">
          Type
        </Label>
        <Select value={value.kind} onValueChange={onKindChange}>
          <SelectTrigger id={selectId} size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA_TYPE_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {dataTypeKindLabel(kind)} ({kind})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.kind === 'varchar' && (
        <NumberField
          label="Longueur"
          value={value.length}
          min={1}
          onChange={(length) => onChange({ kind: 'varchar', length })}
          onFocus={onFieldFocus}
          onBlur={onFieldBlur}
        />
      )}
      {value.kind === 'decimal' && (
        <>
          <NumberField
            label="Précision"
            value={value.precision}
            min={1}
            onChange={(precision) => onChange({ ...value, precision })}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          />
          <NumberField
            label="Échelle"
            value={value.scale}
            min={0}
            onChange={(scale) => onChange({ ...value, scale })}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          />
        </>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

function NumberField({ label, value, min, onChange, onFocus, onBlur }: NumberFieldProps) {
  const id = useId();
  return (
    <div className="w-20">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        value={Number.isNaN(value) ? '' : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="h-8"
      />
    </div>
  );
}
