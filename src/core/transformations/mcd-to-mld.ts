/**
 * Transformation MCD → MLD.
 *
 * Pipeline obligatoire :
 *
 *   ConceptualModel → Validation → LogicalModel → SqlDialect → SQL
 *
 * Le SQL n'est jamais généré directement depuis le MCD. La transformation
 * est bloquée tant que la validation du modèle conceptuel contient des
 * erreurs bloquantes (voir `LogicalTransformationResult`).
 *
 * Déterminisme : `transformToLogicalModel` ne génère aucun identifiant
 * aléatoire — tous les ids du modèle logique sont dérivés par simple
 * concaténation des ids stables du modèle conceptuel fourni en entrée. À
 * modèle et options égaux, la sortie (ids, noms, ordre) est strictement
 * identique d'un appel à l'autre.
 *
 * Voir docs/logical-transformation.md pour le détail des règles par type
 * d'association et des exemples entrée/sortie.
 */
import type { ConceptualModel } from '../conceptual-model/types';
import type {
  LogicalModel,
  LogicalTable,
  LogicalTransformationIssue,
} from '../logical-model/types';
import type { NamingConvention } from '../sql/naming';
import { DEFAULT_NAMING_CONVENTION } from '../sql/naming';
import type { ValidationIssue } from '../validation/types';
import { hasBlockingErrors, validateConceptualModel } from '../validation/validate';
import {
  applyOneToMany,
  applyOneToOne,
  buildJunctionTable,
  checkReflexiveNaming,
  classifyAssociation,
} from './logical-associations';
import { LogicalNameRegistry } from './logical-naming';
import { buildEntityTable } from './logical-tables';

export interface LogicalTransformationOptions {
  namingConvention: NamingConvention;
}

export const DEFAULT_LOGICAL_TRANSFORMATION_OPTIONS: LogicalTransformationOptions = {
  namingConvention: DEFAULT_NAMING_CONVENTION,
};

/**
 * Codes des problèmes propres à la transformation (distincts des codes de
 * validation du MCD, qui utilisent `VALIDATION_CODES`).
 */
export const LOGICAL_TRANSFORMATION_CODES = {
  oneToOneAmbiguousSideSelected: 'ONE_TO_ONE_AMBIGUOUS_SIDE_SELECTED',
  naryAssociationJunctionTableCreated: 'NARY_ASSOCIATION_JUNCTION_TABLE_CREATED',
  reflexiveAssociationMissingRole: 'REFLEXIVE_ASSOCIATION_MISSING_ROLE',
  sqlNameCollisionResolved: 'SQL_NAME_COLLISION_RESOLVED',
  constraintNameTruncated: 'CONSTRAINT_NAME_TRUNCATED',
  internalTransformationError: 'INTERNAL_TRANSFORMATION_ERROR',
} as const;

export type LogicalTransformationResult =
  { success: true; model: LogicalModel } | { success: false; issues: LogicalTransformationIssue[] };

function toBlockingIssue(issue: ValidationIssue): LogicalTransformationIssue {
  return {
    id: `blocked:${issue.id}`,
    severity: issue.severity,
    code: issue.code,
    message: issue.message,
    sourceIds: issue.targetId ? [issue.targetId] : [],
  };
}

/**
 * Transforme un modèle conceptuel validé en modèle logique.
 *
 * Ordre déterministe des tables : les tables issues des entités d'abord
 * (dans l'ordre du MCD), puis les tables associatives (N,N / n-aires) dans
 * l'ordre des associations du MCD — jamais de tri alphabétique.
 */
export function transformToLogicalModel(
  model: ConceptualModel,
  options: LogicalTransformationOptions = DEFAULT_LOGICAL_TRANSFORMATION_OPTIONS,
): LogicalTransformationResult {
  try {
    const validationIssues = validateConceptualModel(model, {
      namingConvention: options.namingConvention,
    });
    if (hasBlockingErrors(validationIssues)) {
      return {
        success: false,
        issues: validationIssues.filter((issue) => issue.severity === 'error').map(toBlockingIssue),
      };
    }

    const registry = new LogicalNameRegistry(options.namingConvention);
    const issues: LogicalTransformationIssue[] = [];
    const pushIssue = (issue: Omit<LogicalTransformationIssue, 'id'>): void => {
      issues.push({ id: `issue-${issues.length + 1}`, ...issue });
    };

    const entityTables = new Map<string, LogicalTable>();
    for (const entity of model.entities) {
      entityTables.set(entity.id, buildEntityTable(entity, registry, pushIssue));
    }

    const junctionTables: LogicalTable[] = [];
    for (const association of model.associations) {
      checkReflexiveNaming(association, pushIssue);
      const kind = classifyAssociation(association);
      if (kind === 'one-to-many') {
        applyOneToMany(association, model, entityTables, registry, pushIssue);
      } else if (kind === 'one-to-one') {
        applyOneToOne(association, model, entityTables, registry, pushIssue);
      } else {
        const table = buildJunctionTable(association, model, entityTables, registry, pushIssue);
        if (table) junctionTables.push(table);
      }
    }

    const tables = [
      ...model.entities
        .map((entity) => entityTables.get(entity.id))
        .filter((table): table is LogicalTable => table !== undefined),
      ...junctionTables,
    ];

    return { success: true, model: { tables, issues } };
  } catch (error) {
    console.error('Erreur inattendue pendant la transformation MCD → MLD :', error);
    return {
      success: false,
      issues: [
        {
          id: 'internal-error',
          severity: 'error',
          code: LOGICAL_TRANSFORMATION_CODES.internalTransformationError,
          message:
            'Une erreur interne inattendue a empêché la génération du MLD. Consultez la console pour plus de détails.',
          sourceIds: [],
        },
      ],
    };
  }
}
