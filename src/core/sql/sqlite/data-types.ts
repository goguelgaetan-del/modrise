/**
 * Mapping des types conceptuels de Modrise vers les affinités de types
 * SQLite. SQLite ne fait pas respecter strictement les longueurs de
 * `VARCHAR`, ni la précision/l'échelle des décimaux : ces informations sont
 * conservées dans le MLD mais perdues dans le SQL généré, ce qui est
 * documenté explicitement plutôt que de prétendre à une garantie que SQLite
 * ne peut pas tenir. Les booléens utilisent l'affinité `INTEGER` (0/1) ; les
 * dates et heures sont stockées sous forme textuelle (convention ISO 8601),
 * SQLite ne possédant pas de type date/heure natif.
 */
import type { ConceptualDataType } from '../../conceptual-model/data-types';

export function mapSqliteDataType(type: ConceptualDataType): string {
  switch (type.kind) {
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'INTEGER';
    case 'decimal':
      return 'NUMERIC';
    case 'varchar':
      return 'TEXT';
    case 'text':
      return 'TEXT';
    case 'boolean':
      return 'INTEGER';
    case 'date':
      return 'TEXT';
    case 'datetime':
      return 'TEXT';
    case 'uuid':
      return 'TEXT';
  }
}
