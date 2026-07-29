/**
 * Mapping des types conceptuels de Modrise vers les types PostgreSQL.
 *
 * Ne suppose jamais qu'une clé primaire entière doit devenir `SERIAL` : le
 * modèle ne porte aujourd'hui aucune information explicite d'auto-génération
 * (voir docs/postgresql-generation.md, section « Limites »).
 */
import type { ConceptualDataType } from '../../conceptual-model/data-types';

export function mapPostgreSqlDataType(type: ConceptualDataType): string {
  switch (type.kind) {
    case 'integer':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'decimal':
      return `NUMERIC(${type.precision},${type.scale})`;
    case 'varchar':
      return `VARCHAR(${type.length})`;
    case 'text':
      return 'TEXT';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'TIMESTAMP WITHOUT TIME ZONE';
    case 'uuid':
      return 'UUID';
  }
}
