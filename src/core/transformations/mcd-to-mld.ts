/**
 * Transformation MCD → MLD.
 *
 * Pipeline cible :
 *
 *   ConceptualModel → Validation → LogicalModel → SqlDialect → SQL
 *
 * TODO(v0.2) — implémenter `transformToLogicalModel` avec les règles suivantes,
 * chacune testée indépendamment :
 *
 * 1. Entités : une table par entité ; attributs → colonnes ; identifiant
 *    primaire → clé primaire (composée supportée) ; identifiants alternatifs
 *    → contraintes uniques.
 * 2. Association 1,N : migration de la clé primaire du côté max=1 vers la
 *    table du côté max=N ; clé étrangère ; nullabilité issue de la
 *    cardinalité minimale du côté max=1 ; attributs portés migrés dans la
 *    table du côté N.
 * 3. Association N,N : table associative, clés étrangères vers chaque
 *    participante, attributs portés, clé primaire composée par défaut,
 *    rôles utilisés pour résoudre les collisions de noms.
 * 4. Association 1,1 : clé étrangère du côté optionnel si l'autre côté est
 *    obligatoire, contrainte unique ; sinon choix déterministe (ordre stable
 *    des participations) signalé par un avertissement.
 * 5. Association réflexive : colonnes nommées d'après les rôles
 *    (ex. `manager_id` / `subordonne_id`) ; problème de validation si les
 *    rôles sont absents ou identiques.
 * 6. Association n-aire : table associative avec toutes les clés étrangères
 *    et une clé primaire composée cohérente.
 *
 * L'héritage Merise n'est pas couvert par le MVP ; l'architecture (issues,
 * sourceIds) est prévue pour l'ajouter sans casser le format.
 */
import type { ConceptualModel } from '../conceptual-model/types';
import type { LogicalModel } from '../logical-model/types';
import type { NamingConvention } from '../sql/naming';

export interface TransformationOptions {
  namingConvention: NamingConvention;
}

/**
 * Indique si la transformation est disponible dans cette version.
 * L'interface s'appuie dessus pour afficher un état honnête plutôt qu'un
 * faux résultat.
 */
export const LOGICAL_TRANSFORMATION_AVAILABLE = false;

export function transformToLogicalModel(
  _model: ConceptualModel,
  _options: TransformationOptions,
): LogicalModel {
  // TODO(v0.2) : voir le plan détaillé dans l'en-tête du fichier.
  throw new Error('La transformation MCD → MLD sera disponible dans une prochaine version (v0.2).');
}
