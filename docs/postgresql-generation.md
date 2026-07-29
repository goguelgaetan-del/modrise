# Génération SQL PostgreSQL

Implémentée dans `src/core/sql/postgresql/` (`identifier.ts`, `data-types.ts`,
`constraint-registry.ts`, `validate-logical-model.ts`, `generate.ts`,
`dialect.ts`), exposée via `postgreSqlDialect` (`SqlDialect`) et le registre
`src/core/sql/registry.ts`. Aucun de ces modules ne dépend de React, Zustand
ou du MCD : ils consomment exclusivement un `LogicalModel`.

## Pipeline

```text
ConceptualModel → Validation → LogicalModel → PostgreSqlDialect → SQL
```

Le SQL n'est jamais généré directement depuis le MCD. Le frontend applique ce
pipeline via deux hooks dérivés et mémoïsés, sans jamais persister le SQL :

```text
projectStore → useLogicalModel → PostgreSqlDialect.generate → SqlPreviewPanel
```

## Types supportés

| Type conceptuel | PostgreSQL                    |
| --------------- | ----------------------------- |
| `integer`       | `INTEGER`                     |
| `bigint`        | `BIGINT`                      |
| `decimal(p,s)`  | `NUMERIC(p,s)`                |
| `varchar(n)`    | `VARCHAR(n)`                  |
| `text`          | `TEXT`                        |
| `boolean`       | `BOOLEAN`                     |
| `date`          | `DATE`                        |
| `datetime`      | `TIMESTAMP WITHOUT TIME ZONE` |
| `uuid`          | `UUID`                        |

## Échappement des identifiants

Tous les identifiants (tables, colonnes, contraintes) sont systématiquement
entourés de doubles guillemets ; un guillemet interne est doublé
(`client"archive` → `"client""archive"`). Appliqué même sur des noms déjà
normalisés, pour rester valide quel que soit le mot réservé PostgreSQL
rencontré.

## Clés primaires

Simples ou composées, toujours `NOT NULL` (y compris si, par anomalie, la
colonne source était marquée nullable — la clause `PRIMARY KEY` prime).
Nommées `pk_<table>`.

## Contraintes uniques

Une par identifiant alternatif ou par attribut `unique: true` hors clé
primaire ; composées si l'identifiant l'est. Nommées `uq_<table>_<colonnes>`.
Une association 1,1 ajoute également une contrainte unique sur la colonne de
clé étrangère (voir `docs/logical-transformation.md`).

## Clés étrangères

Générées par défaut via `ALTER TABLE ... ADD CONSTRAINT` (`foreignKeyMode:
"alter-table"`), après la création de toutes les tables : cette stratégie
évite tout problème d'ordre pour les associations réflexives, les tables
associatives et les cycles entre tables, sans avoir à trier les instructions
`CREATE TABLE`. Un mode `inline` (clause `FOREIGN KEY` directement dans le
`CREATE TABLE`) est également implémenté et testé, pour des scripts plus
courts sans dépendances circulaires.

Nommées `fk_<table>_<table référencée>` ; lorsque plusieurs clés étrangères
d'une même table pointent vers la même table référencée (association
réflexive N,N), un qualificatif dérivé du rôle de participation est utilisé
à la place (`fk_employe_manager` / `fk_employe_subordonne`) plutôt qu'un
simple suffixe numérique.

Aucune action référentielle (`CASCADE`, `SET NULL`…) n'est écrite
explicitement : PostgreSQL applique `NO ACTION` par défaut, et le MCD ne
porte aujourd'hui aucune information permettant de choisir une autre
stratégie (voir « Limites » ci-dessous).

## Absence volontaire de `SERIAL`

Un entier de clé primaire n'est **jamais** converti en `SERIAL` : le modèle
conceptuel ne porte aucune information explicite d'auto-génération
aujourd'hui. Ajouter ce comportement supposerait une donnée que Modrise ne
connaît pas encore ; ce sera une évolution distincte et documentée le jour où
cette information sera modélisée.

## Ordre et déterminisme

Même modèle logique et mêmes options → sortie strictement identique (aucun
UUID ni horodatage dans le script). Ordre du script : en-tête optionnel,
`DROP TABLE IF EXISTS ... CASCADE` optionnels (ordre inverse des créations),
`CREATE TABLE` (ordre du MLD), `ALTER TABLE ... ADD CONSTRAINT` (mode par
défaut), puis `COMMENT ON` optionnels. Une ligne vide sépare chaque bloc ; le
fichier se termine par un seul retour à la ligne.

Les noms de contraintes sont résolus par un registre local à chaque
génération (`SqlConstraintNameRegistry`) : toute collision produit un
avertissement (`SQL_CONSTRAINT_NAME_COLLISION_RESOLVED`) et tout nom
dépassant 63 octets (limite PostgreSQL) est raccourci avec un avertissement
(`SQL_CONSTRAINT_NAME_TRUNCATED`) — jamais silencieusement.

## Validation défensive

Même si le MLD a déjà été validé par le moteur de transformation, le
générateur revérifie la cohérence structurelle avant de produire quoi que ce
soit (table/colonne sans nom, table sans colonne, clé primaire ou contrainte
référençant une colonne inexistante, clé étrangère vers une table ou colonne
inexistante, nombre de colonnes incohérent entre une clé étrangère et ses
colonnes référencées). Toute incohérence bloque la génération
(`success: false`) sans jamais lancer d'exception.

## Exemple complet

MCD (extrait du projet « Gestion d'hôtel ») : `CLIENT (0,N) — EFFECTUER —
(1,1) RESERVATION`. MLD résultant : la clé primaire de `CLIENT`
(`id_client`) migre dans `RESERVATION` (côté porteur, cardinalité max=1),
sous le nom `client_id_client`, non nullable (minimum 1 côté porteur). SQL
généré :

```sql
-- Generated by Modrise
-- PostgreSQL dialect

CREATE TABLE "client" (
  "id_client" INTEGER NOT NULL,
  "nom" VARCHAR(100) NOT NULL,
  "prenom" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255),
  "telephone" VARCHAR(20),
  CONSTRAINT "pk_client" PRIMARY KEY ("id_client"),
  CONSTRAINT "uq_client_email" UNIQUE ("email")
);

CREATE TABLE "reservation" (
  "id_reservation" INTEGER NOT NULL,
  "date_arrivee" DATE NOT NULL,
  "date_depart" DATE NOT NULL,
  "nombre_personnes" INTEGER NOT NULL,
  "statut" VARCHAR(20) NOT NULL,
  "client_id_client" INTEGER NOT NULL,
  CONSTRAINT "pk_reservation" PRIMARY KEY ("id_reservation")
);

ALTER TABLE "reservation"
  ADD CONSTRAINT "fk_reservation_client"
  FOREIGN KEY ("client_id_client")
  REFERENCES "client" ("id_client");
```

Script complet (avec `CHAMBRE` et la table associative `CONCERNER`) : voir le
snapshot `hotel.postgresql.sql` dans
`src/core/sql/postgresql/__snapshots__/snapshots.test.ts.snap`.

## Limites actuelles

- Un seul dialecte implémenté (PostgreSQL). MySQL/MariaDB et SQLite
  apparaissent dans l'interface comme « prévus dans une prochaine version »
  sans produire de faux SQL.
- Aucune action référentielle explicite (`ON DELETE` / `ON UPDATE`) : le MCD
  ne porte pas encore cette information. L'interface `SqlDialect` prévoit un
  type `ReferentialAction` pour une future évolution.
- `includeComments` (COMMENT ON) est implémenté et testé, mais n'est pas
  encore exposé par un contrôle dans l'interface : les descriptions
  d'entités/associations/attributs sont bien propagées jusqu'au MLD
  (`LogicalTable.description`, `LogicalColumn.description`), mais aucune
  case à cocher ne permet encore de l'activer depuis le panneau SQL.
- Pas d'auto-incrément (`SERIAL`/`IDENTITY`) : voir ci-dessus.
- Pas d'exécution du SQL, de connexion à une base, d'import SQL, de
  rétro-ingénierie ni de migrations de schéma (hors périmètre de cette
  phase).

## Évolutions futures

MySQL/MariaDB et SQLite s'ajouteront comme des dialectes frères de
`src/core/sql/postgresql/`, chacun implémentant la même interface
`SqlDialect`, sans modification du moteur MLD ni de cette interface.
