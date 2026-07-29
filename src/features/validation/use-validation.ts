/**
 * Hook de validation : recalcul (mémoïsé) des problèmes du modèle courant et
 * des ensembles d'ids en erreur pour la mise en évidence dans le diagramme.
 */
import { useMemo } from 'react';
import type { ValidationIssue } from '@/core/validation/types';
import { validateConceptualModel } from '@/core/validation/validate';
import { useProjectStore } from '@/stores/project-store';
import { resolveIssueAnchor } from './issue-anchors';

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  /** Entités/associations dont au moins un problème est une erreur. */
  errorOwnerIds: ReadonlySet<string>;
  /** Participations en erreur (arêtes à surligner). */
  errorParticipationIds: ReadonlySet<string>;
}

export function useValidation(): ValidationResult {
  const conceptualModel = useProjectStore((state) => state.conceptualModel);
  const namingConvention = useProjectStore((state) => state.settings.namingConvention);

  return useMemo(() => {
    const issues = validateConceptualModel(conceptualModel, { namingConvention });
    const errorOwnerIds = new Set<string>();
    const errorParticipationIds = new Set<string>();
    for (const issue of issues) {
      if (issue.severity !== 'error') continue;
      const anchor = resolveIssueAnchor(conceptualModel, issue);
      if (anchor.ownerId) errorOwnerIds.add(anchor.ownerId);
      if (anchor.participationId) errorParticipationIds.add(anchor.participationId);
    }
    return {
      issues,
      errorCount: issues.filter((issue) => issue.severity === 'error').length,
      warningCount: issues.filter((issue) => issue.severity === 'warning').length,
      errorOwnerIds,
      errorParticipationIds,
    };
  }, [conceptualModel, namingConvention]);
}
