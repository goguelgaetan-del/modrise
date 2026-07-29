# Génération SQL MySQL / MariaDB

Implémentée dans `src/core/sql/mysql/` (`identifier.ts`, `data-types.ts`,
`generate.ts`, `dialect.ts`), au-dessus du moteur partagé
(`src/core/sql/shared/`, voir sa description dans
[postgresql-generation.md](postgresql-generation.md)). Consomme
exclusivement un `LogicalModel`, jamais le MCD.

## Citation des identifiants

Accents graves, avec doublement d'un accent grave interne :
`nom\`archive` → `` `nom``archive` ``. Appliqué systématiquement, comme pour
PostgreSQL.

## Types supportés

| Type conceptuel | MySQL / MariaDB |
| --------------- | --------------- |
| `integer`       | `INT`           |
| `bigint`        | `BIGINT`        |
| `decimal(p,s)`  | `DECIMAL(p,s)`  |
| `varchar(n)`    | `VARCHAR(n)`    |
| `text`          | `TEXT`          |
| `boolean`       | `BOOLEAN`       |
| `date`          | `DATE`          |
| `datetime`      | `DATETIME`      |
| `uuid`          | `CHAR(36)`      |

`uuid` devient `CHAR(36)` (représentation textuelle standard) plutôt qu'un
type binaire ou le type `UUID` natif de MySQL 8+ : ce dernier n'est pas
disponible sur toutes les versions ciblées (MariaDB le gère différemment
selon sa propre version). Choix simple et lisible pour cette première
version, documenté ici plutôt que supposé équivalent partout.

Aucun entier de clé primaire n'est converti en `AUTO_INCREMENT` : le modèle
ne porte aujourd'hui aucune information explicite d'auto-génération (même
raisonnement que `SERIAL` pour PostgreSQL).

## Clés étrangères

Par défaut via `ALTER TABLE ... ADD CONSTRAINT` (comme PostgreSQL), après la
création de toutes les tables : cohérence entre dialectes, gestion des
cycles et des associations réflexives sans avoir à trier les `CREATE TABLE`.
Le mode `inline` reste disponible.

## `DROP TABLE`

Quand `includeDropStatements` est activé, le bloc de suppression est encadré
par :

```sql
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `reservation`;
DROP TABLE IF EXISTS `client`;
SET FOREIGN_KEY_CHECKS = 1;
```

permettant de supprimer les tables dans n'importe quel ordre sans se
soucier des clés étrangères. Aucun `CASCADE` : cette clause n'existe pas sur
`DROP TABLE` en MySQL.

## Limite de nom de contrainte

64 caractères (contre 63 octets pour PostgreSQL) : `pk_/uq_/fk_` avec
troncature et résolution de collision par le même registre déterministe que
les autres dialectes.

## Commentaires

Non implémentés dans cette phase. La syntaxe MySQL (`COMMENT 'texte'`
inline sur colonnes, `COMMENT='texte'` en option de table) est trop
différente de `COMMENT ON` (PostgreSQL) pour être ajoutée proprement au
moteur partagé sans le complexifier inutilement. Si `includeComments` est
demandé, une issue informative (`COMMENT_UNSUPPORTED_FOR_DIALECT`) est émise
et aucun commentaire n'est généré — jamais de faux commentaire ni de
plantage.

## Moteur de stockage

Aucun `ENGINE=InnoDB` n'est forcé : MySQL/MariaDB utilisent leur moteur par
défaut (InnoDB dans les configurations standard actuelles). Une option
explicite et testée pourra être ajoutée si le besoin se confirme.

## Validation réelle

Un conteneur MySQL/MariaDB n'était pas disponible dans cet environnement
(`docker` absent) : la validation réelle du script MySQL n'a **pas** été
effectuée dans une instance MySQL réelle. La couverture repose sur les tests
unitaires et les snapshots (`src/core/sql/mysql/`). Voir
[postgresql-generation.md](postgresql-generation.md) et
[sqlite-generation.md](sqlite-generation.md) pour les dialectes
effectivement exécutés dans un moteur réel.

## Limites actuelles

Identiques à PostgreSQL (pas d'action référentielle explicite, pas
d'auto-incrément) — voir le tableau comparatif dans
[sql-dialects.md](sql-dialects.md).
