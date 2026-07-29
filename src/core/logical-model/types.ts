/**
 * Modèle logique de données (MLD).
 *
 * Modèle intermédiaire entre le MCD et le SQL : le SQL n'est jamais généré
 * directement depuis le modèle conceptuel.
 */
import type { ConceptualDataType } from '../conceptual-model/data-types';

export interface LogicalModel {
  tables: LogicalTable[];
  issues: LogicalTransformationIssue[];
}

export interface LogicalTable {
  id: string;
  name: string;
  /** Identifiants des objets conceptuels dont cette table est issue. */
  sourceIds: string[];
  /** Description de l'entité ou de l'association d'origine (pour COMMENT ON TABLE). */
  description?: string;
  columns: LogicalColumn[];
  /**
   * Identifiants (id) des colonnes composant la clé primaire, dans l'ordre.
   * Un tableau à un seul élément représente une clé simple, plusieurs
   * éléments une clé composée.
   */
  primaryKey: string[];
  foreignKeys: ForeignKey[];
  uniqueConstraints: UniqueConstraint[];
}

/**
 * Origine d'une colonne logique :
 * - `entity-attribute` : attribut propre de l'entité ;
 * - `association-attribute` : attribut porté par une association, migré ;
 * - `migrated-identifier` : colonne de clé étrangère copiant un identifiant ;
 * - `generated` : réservé pour un usage futur (aucune colonne de ce type
 *   n'est produite en v0.2).
 */
export type LogicalColumnOrigin =
  'entity-attribute' | 'association-attribute' | 'migrated-identifier' | 'generated';

export interface LogicalColumn {
  id: string;
  name: string;
  dataType: ConceptualDataType;
  nullable: boolean;
  /** Attribut conceptuel d'origine, si la colonne en provient directement. */
  sourceId?: string;
  origin: LogicalColumnOrigin;
  /** Description de l'attribut d'origine (pour COMMENT ON COLUMN), si elle existe. */
  description?: string;
}

export interface ForeignKey {
  id: string;
  name: string;
  columnIds: string[];
  referencedTableId: string;
  referencedColumnIds: string[];
  nullable: boolean;
  unique: boolean;
  /** Association à l'origine de cette clé étrangère. */
  sourceAssociationId?: string;
}

export interface UniqueConstraint {
  id: string;
  name: string;
  columnIds: string[];
  /** Identifiant alternatif à l'origine de cette contrainte, s'il y en a un. */
  sourceIdentifierId?: string;
}

/**
 * Problème rencontré ou choix effectué pendant la transformation MCD → MLD
 * (ex. : choix du côté porteur d'une association 1,1, collision de noms
 * résolue). `sourceIds` référence les objets conceptuels concernés.
 */
export interface LogicalTransformationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  sourceIds: string[];
}
