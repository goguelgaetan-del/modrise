/**
 * Libellés d'affichage des dialectes, séparés de leurs implémentations
 * (`registry.ts`) : l'interface (sélecteur de dialecte, indicateur du
 * panneau inférieur) doit pouvoir les afficher sans charger le générateur
 * SQL correspondant, chargé dynamiquement à la demande (v0.5, voir
 * docs/performance.md).
 */
import type { SqlDialectId } from './dialect';

export const SQL_DIALECT_LABELS: Readonly<Record<SqlDialectId, string>> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL / MariaDB',
  sqlite: 'SQLite',
};
