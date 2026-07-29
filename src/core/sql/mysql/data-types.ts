/**
 * Mapping des types conceptuels de Modrise vers MySQL/MariaDB.
 *
 * `uuid` devient `CHAR(36)` (représentation textuelle standard, ex.
 * `550e8400-e29b-41d4-a716-446655440000`) plutôt qu'un type binaire : ce
 * choix reste simple et lisible pour cette première version ; MySQL 8+
 * propose bien un type `UUID` natif, mais rien ne garantit encore que le
 * moteur cible en dispose (MariaDB le prend en charge différemment selon la
 * version). Documenté dans docs/mysql-generation.md.
 *
 * Aucun entier de clé primaire n'est converti en `AUTO_INCREMENT` : le
 * modèle ne porte aujourd'hui aucune information explicite d'auto-génération
 * (même choix que pour PostgreSQL, voir docs/postgresql-generation.md).
 */
import type { ConceptualDataType } from '../../conceptual-model/data-types';

export function mapMySqlDataType(type: ConceptualDataType): string {
  switch (type.kind) {
    case 'integer':
      return 'INT';
    case 'bigint':
      return 'BIGINT';
    case 'decimal':
      return `DECIMAL(${type.precision},${type.scale})`;
    case 'varchar':
      return `VARCHAR(${type.length})`;
    case 'text':
      return 'TEXT';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'DATETIME';
    case 'uuid':
      return 'CHAR(36)';
  }
}
