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
  columns: LogicalColumn[];
  /** Identifiants (id) des colonnes composant la clé primaire, dans l'ordre. */
  primaryKey: string[];
  foreignKeys: ForeignKey[];
  uniqueConstraints: UniqueConstraint[];
}

export interface LogicalColumn {
  id: string;
  name: string;
  dataType: ConceptualDataType;
  nullable: boolean;
  /** Attribut conceptuel d'origine, si la colonne en provient. */
  sourceId?: string;
}

export interface ForeignKey {
  id: string;
  columnIds: string[];
  referencedTableId: string;
  referencedColumnIds: string[];
  nullable: boolean;
  unique: boolean;
}

export interface UniqueConstraint {
  id: string;
  columnIds: string[];
}

/**
 * Problème rencontré ou choix effectué pendant la transformation MCD → MLD
 * (ex. : choix du côté porteur d'une association 1,1).
 */
export interface LogicalTransformationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  sourceId?: string;
}
