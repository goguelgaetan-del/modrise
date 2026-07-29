/**
 * Résolution des cibles de validation vers les objets affichables :
 * un problème sur un attribut ou un identifiant est rattaché à son entité
 * (ou association) porteuse pour la mise en évidence dans le diagramme.
 */
import type { ConceptualModel } from '@/core/conceptual-model/types';
import type { ValidationIssue } from '@/core/validation/types';

export interface IssueAnchor {
  /** Entité ou association à mettre en évidence / sélectionner. */
  ownerId?: string;
  /** Participation concernée (pour surligner l'arête). */
  participationId?: string;
}

export function resolveIssueAnchor(model: ConceptualModel, issue: ValidationIssue): IssueAnchor {
  const { targetType, targetId } = issue;
  if (!targetId) return {};
  switch (targetType) {
    case 'entity':
    case 'association':
      return { ownerId: targetId };
    case 'attribute': {
      const entity = model.entities.find((e) => e.attributes.some((a) => a.id === targetId));
      if (entity) return { ownerId: entity.id };
      const association = model.associations.find((a) =>
        a.attributes.some((attribute) => attribute.id === targetId),
      );
      return { ownerId: association?.id };
    }
    case 'identifier': {
      const entity = model.entities.find((e) =>
        e.identifiers.some((identifier) => identifier.id === targetId),
      );
      return { ownerId: entity?.id };
    }
    case 'participation': {
      const association = model.associations.find((a) =>
        a.participations.some((participation) => participation.id === targetId),
      );
      return { ownerId: association?.id, participationId: targetId };
    }
    case 'project':
      return {};
  }
}
