/**
 * Hook de dérivation du modèle logique : recalcule (mémoïsé) le MLD à partir
 * du modèle conceptuel courant.
 *
 * Le MLD n'est jamais stocké comme une seconde source de vérité dans
 * Zustand : c'est une vue dérivée, recalculée via `useMemo` à chaque
 * changement du modèle conceptuel ou de la convention de nommage.
 */
import { useMemo } from 'react';
import type { LogicalTransformationResult } from '@/core/transformations/mcd-to-mld';
import { transformToLogicalModel } from '@/core/transformations/mcd-to-mld';
import { useProjectStore } from '@/stores/project-store';

export function useLogicalModel(): LogicalTransformationResult {
  const conceptualModel = useProjectStore((state) => state.conceptualModel);
  const namingConvention = useProjectStore((state) => state.settings.namingConvention);

  return useMemo(
    () => transformToLogicalModel(conceptualModel, { namingConvention }),
    [conceptualModel, namingConvention],
  );
}
