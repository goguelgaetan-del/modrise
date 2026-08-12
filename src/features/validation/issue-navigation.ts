/**
 * Résolution pure de « quel problème suivant/précédent » pour F8/Shift+F8 —
 * séparée de la sélection/recentrage (qui a besoin de React Flow) pour
 * rester testable sans navigateur.
 */
import type { ValidationIssue } from '@/core/validation/types';

/**
 * Renvoie l'id du problème à cibler ensuite, en bouclant. `currentId` peut
 * être absent (aucune navigation précédente) ou ne plus correspondre à un
 * problème existant (corrigé entre-temps) : dans les deux cas, repart du
 * début (ou de la fin pour "précédent").
 */
export function resolveNextIssueId(
  issues: readonly ValidationIssue[],
  currentId: string | undefined,
  offset: 1 | -1,
): string | undefined {
  if (issues.length === 0) return undefined;
  const currentIndex = currentId ? issues.findIndex((issue) => issue.id === currentId) : -1;
  if (currentIndex === -1) {
    return offset === 1 ? issues[0]!.id : issues[issues.length - 1]!.id;
  }
  const nextIndex = (currentIndex + offset + issues.length) % issues.length;
  return issues[nextIndex]!.id;
}
