/**
 * Store du projet : identité, modèle conceptuel et paramètres.
 *
 * Toute la logique métier réutilisable vit dans `src/core` ; ce store se
 * limite à appliquer ces opérations de manière immuable (Immer) et à tenir
 * `updatedAt` à jour.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Attribute, ConceptualModel, Entity } from '@/core/conceptual-model/types';
import type { Association, Cardinality } from '@/core/conceptual-model/types';
import {
  createAssociation,
  createAttribute,
  createEntity,
  createParticipation,
} from '@/core/conceptual-model/factories';
import {
  associationsReferencingEntity,
  removeAttributeFromEntity,
  togglePrimaryAttribute,
} from '@/core/conceptual-model/operations';
import { createId } from '@/core/id';
import type { ModriseProject, ProjectSettings } from '@/core/project/types';
import { createProject } from '@/core/project/types';
import type { SqlDialectId } from '@/core/sql/dialect';

export interface AttributePatch {
  name?: string;
  dataType?: Attribute['dataType'];
  required?: boolean;
  unique?: boolean;
  description?: string;
}

interface ProjectState {
  id: string;
  formatVersion: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  conceptualModel: ConceptualModel;
  settings: ProjectSettings;

  loadProject: (project: ModriseProject) => void;
  renameProject: (name: string) => void;
  setSqlDialect: (dialectId: SqlDialectId) => void;

  addEntity: () => Entity;
  updateEntity: (entityId: string, patch: { name?: string; description?: string }) => void;
  /**
   * Supprime une entité. Si elle est référencée par des associations et que
   * `force` est faux, ne supprime rien et retourne les associations
   * bloquantes (l'UI demande alors confirmation).
   */
  removeEntity: (entityId: string, force: boolean) => { blockedBy: Association[] };

  addAttribute: (ownerId: string) => void;
  updateAttribute: (ownerId: string, attributeId: string, patch: AttributePatch) => void;
  removeAttribute: (ownerId: string, attributeId: string) => void;
  moveAttribute: (ownerId: string, attributeId: string, direction: 'up' | 'down') => void;
  toggleAttributeInPrimaryIdentifier: (entityId: string, attributeId: string) => void;

  addAssociation: () => Association;
  updateAssociation: (
    associationId: string,
    patch: { name?: string; description?: string },
  ) => void;
  removeAssociation: (associationId: string) => void;
  addParticipation: (associationId: string, entityId: string) => void;
  updateParticipation: (
    associationId: string,
    participationId: string,
    patch: { role?: string; cardinality?: Cardinality },
  ) => void;
  removeParticipation: (associationId: string, participationId: string) => void;
}

const initialProject = createProject();

/** Retrouve le porteur d'attributs (entité ou association) par son id. */
function findAttributeOwner(
  model: ConceptualModel,
  ownerId: string,
): Entity | Association | undefined {
  return (
    model.entities.find((entity) => entity.id === ownerId) ??
    model.associations.find((association) => association.id === ownerId)
  );
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => {
    const touch = (state: { updatedAt: string }) => {
      state.updatedAt = new Date().toISOString();
    };

    return {
      id: initialProject.id,
      formatVersion: initialProject.formatVersion,
      name: initialProject.name,
      description: initialProject.description,
      createdAt: initialProject.createdAt,
      updatedAt: initialProject.updatedAt,
      conceptualModel: initialProject.conceptualModel,
      settings: initialProject.settings,

      loadProject: (project) => {
        set((state) => {
          state.id = project.id;
          state.formatVersion = project.formatVersion;
          state.name = project.name;
          state.description = project.description;
          state.createdAt = project.createdAt;
          state.updatedAt = project.updatedAt;
          state.conceptualModel = project.conceptualModel;
          state.settings = project.settings;
        });
      },

      renameProject: (name) => {
        set((state) => {
          state.name = name;
          touch(state);
        });
      },

      setSqlDialect: (dialectId) => {
        set((state) => {
          state.settings.sqlDialect = dialectId;
          touch(state);
        });
      },

      addEntity: () => {
        const entity = createEntity();
        set((state) => {
          state.conceptualModel.entities.push(entity);
          touch(state);
        });
        return entity;
      },

      updateEntity: (entityId, patch) => {
        set((state) => {
          const entity = state.conceptualModel.entities.find((e) => e.id === entityId);
          if (!entity) return;
          if (patch.name !== undefined) entity.name = patch.name;
          if (patch.description !== undefined) entity.description = patch.description;
          touch(state);
        });
      },

      removeEntity: (entityId, force) => {
        const blockedBy = associationsReferencingEntity(get().conceptualModel, entityId);
        if (blockedBy.length > 0 && !force) {
          return { blockedBy };
        }
        set((state) => {
          state.conceptualModel.entities = state.conceptualModel.entities.filter(
            (entity) => entity.id !== entityId,
          );
          // Suppression forcée : retire aussi les participations pendantes.
          for (const association of state.conceptualModel.associations) {
            association.participations = association.participations.filter(
              (participation) => participation.entityId !== entityId,
            );
          }
          touch(state);
        });
        return { blockedBy: [] };
      },

      addAttribute: (ownerId) => {
        set((state) => {
          const owner = findAttributeOwner(state.conceptualModel, ownerId);
          if (!owner) return;
          owner.attributes.push(createAttribute());
          touch(state);
        });
      },

      updateAttribute: (ownerId, attributeId, patch) => {
        set((state) => {
          const owner = findAttributeOwner(state.conceptualModel, ownerId);
          const attribute = owner?.attributes.find((a) => a.id === attributeId);
          if (!attribute) return;
          if (patch.name !== undefined) attribute.name = patch.name;
          if (patch.dataType !== undefined) attribute.dataType = patch.dataType;
          if (patch.required !== undefined) attribute.required = patch.required;
          if (patch.unique !== undefined) attribute.unique = patch.unique;
          if (patch.description !== undefined) attribute.description = patch.description;
          touch(state);
        });
      },

      removeAttribute: (ownerId, attributeId) => {
        set((state) => {
          const owner = findAttributeOwner(state.conceptualModel, ownerId);
          if (!owner) return;
          if ('identifiers' in owner) {
            removeAttributeFromEntity(owner, attributeId);
          } else {
            owner.attributes = owner.attributes.filter((a) => a.id !== attributeId);
          }
          touch(state);
        });
      },

      moveAttribute: (ownerId, attributeId, direction) => {
        set((state) => {
          const owner = findAttributeOwner(state.conceptualModel, ownerId);
          if (!owner) return;
          const index = owner.attributes.findIndex((a) => a.id === attributeId);
          const target = direction === 'up' ? index - 1 : index + 1;
          if (index < 0 || target < 0 || target >= owner.attributes.length) return;
          const [attribute] = owner.attributes.splice(index, 1);
          if (!attribute) return;
          owner.attributes.splice(target, 0, attribute);
          touch(state);
        });
      },

      toggleAttributeInPrimaryIdentifier: (entityId, attributeId) => {
        set((state) => {
          const entity = state.conceptualModel.entities.find((e) => e.id === entityId);
          if (!entity) return;
          togglePrimaryAttribute(entity, attributeId, createId);
          touch(state);
        });
      },

      addAssociation: () => {
        const association = createAssociation();
        set((state) => {
          state.conceptualModel.associations.push(association);
          touch(state);
        });
        return association;
      },

      updateAssociation: (associationId, patch) => {
        set((state) => {
          const association = state.conceptualModel.associations.find(
            (a) => a.id === associationId,
          );
          if (!association) return;
          if (patch.name !== undefined) association.name = patch.name;
          if (patch.description !== undefined) association.description = patch.description;
          touch(state);
        });
      },

      removeAssociation: (associationId) => {
        set((state) => {
          state.conceptualModel.associations = state.conceptualModel.associations.filter(
            (association) => association.id !== associationId,
          );
          touch(state);
        });
      },

      addParticipation: (associationId, entityId) => {
        set((state) => {
          const association = state.conceptualModel.associations.find(
            (a) => a.id === associationId,
          );
          const entityExists = state.conceptualModel.entities.some((e) => e.id === entityId);
          if (!association || !entityExists) return;
          association.participations.push(createParticipation({ entityId }));
          touch(state);
        });
      },

      updateParticipation: (associationId, participationId, patch) => {
        set((state) => {
          const association = state.conceptualModel.associations.find(
            (a) => a.id === associationId,
          );
          const participation = association?.participations.find((p) => p.id === participationId);
          if (!participation) return;
          if (patch.role !== undefined) participation.role = patch.role;
          if (patch.cardinality !== undefined) participation.cardinality = patch.cardinality;
          touch(state);
        });
      },

      removeParticipation: (associationId, participationId) => {
        set((state) => {
          const association = state.conceptualModel.associations.find(
            (a) => a.id === associationId,
          );
          if (!association) return;
          association.participations = association.participations.filter(
            (p) => p.id !== participationId,
          );
          touch(state);
        });
      },
    };
  }),
);
