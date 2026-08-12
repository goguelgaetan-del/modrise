import { describe, expect, it } from 'vitest';
import type { ValidationIssue } from '@/core/validation/types';
import { resolveNextIssueId } from './issue-navigation';

function issue(id: string): ValidationIssue {
  return { id, severity: 'error', code: 'x', message: id, targetType: 'entity' };
}

describe('resolveNextIssueId', () => {
  it('renvoie undefined sans problème', () => {
    expect(resolveNextIssueId([], undefined, 1)).toBeUndefined();
  });

  it('démarre au premier problème quand aucun courant', () => {
    const issues = [issue('a'), issue('b'), issue('c')];
    expect(resolveNextIssueId(issues, undefined, 1)).toBe('a');
  });

  it('démarre au dernier problème pour "précédent" sans courant', () => {
    const issues = [issue('a'), issue('b'), issue('c')];
    expect(resolveNextIssueId(issues, undefined, -1)).toBe('c');
  });

  it('avance au suivant et boucle après le dernier', () => {
    const issues = [issue('a'), issue('b'), issue('c')];
    expect(resolveNextIssueId(issues, 'a', 1)).toBe('b');
    expect(resolveNextIssueId(issues, 'c', 1)).toBe('a');
  });

  it('recule au précédent et boucle avant le premier', () => {
    const issues = [issue('a'), issue('b'), issue('c')];
    expect(resolveNextIssueId(issues, 'b', -1)).toBe('a');
    expect(resolveNextIssueId(issues, 'a', -1)).toBe('c');
  });

  it('repart du début si le problème courant a été corrigé entre-temps', () => {
    const issues = [issue('a'), issue('b')];
    expect(resolveNextIssueId(issues, 'disparu', 1)).toBe('a');
  });
});
