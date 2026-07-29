# Dialectes SQL

> **Statut : PostgreSQL, MySQL/MariaDB et SQLite implémentés (v0.3.2).**
> Voir [docs/postgresql-generation.md](postgresql-generation.md),
> [docs/mysql-generation.md](mysql-generation.md) et
> [docs/sqlite-generation.md](sqlite-generation.md) pour le détail complet
> de chaque dialecte.

## Interface

```ts
interface SqlDialect {
  id: SqlDialectId; // 'postgresql' | 'mysql' | 'sqlite'
  label: string;
  quoteIdentifier(identifier: string): string;
  mapDataType(type: ConceptualDataType): string;
  generate(model: LogicalModel, options?: SqlGenerationOptions): SqlGenerationResult;
}
```

```ts
interface SqlGenerationOptions {
  includeHeader: boolean;
  includeComments: boolean;
  includeDropStatements: boolean;
  foreignKeyMode: 'alter-table' | 'inline';
  keywordCase: 'upper' | 'lower';
  statementTerminator: boolean;
}

interface SqlGenerationResult {
  success: boolean;
  sql: string;
  issues: SqlGenerationIssue[];
}
```

Chaque dialecte consomme le **modèle logique** (jamais le MCD directement) et
produit un script complet : tables, colonnes, clés primaires simples et
composées, contraintes uniques, clés étrangères, nullabilité, avec :

- des types adaptés au dialecte ;
- l'échappement systématique des identifiants ;
- un ordre de génération et des noms de contraintes **déterministes**
  (sorties stables, testées par snapshot) ;
- une validation défensive qui bloque la génération (`success: false`)
  plutôt que de produire un script trompeur.

## Registre des dialectes

`src/core/sql/registry.ts` associe chaque `SqlDialectId` à son implémentation
concrète (`SQL_DIALECTS`, `getSqlDialect`). `src/core/sql/dialect.ts` ne
définit que l'interface et reste indépendant de toute implémentation. Le
frontend n'importe jamais directement les modules internes d'un dialecte
(générateur, échappement, types) : il passe systématiquement par
`getSqlDialect`, y compris pour un `SqlDialectId` invalide provenant d'un
fichier importé (`getSqlDialect` renvoie alors `undefined`, géré proprement
par `useSqlGeneration`).

## Moteur partagé

`src/core/sql/shared/` mutualise tout ce qui est identique quel que soit le
SGBD cible : validation défensive du `LogicalModel`
(`validate-logical-model.ts`), registre de noms de contraintes déterministe
paramétré par une limite d'octets (`constraint-registry.ts`), échappement
générique par délimiteur doublé (`quoting.ts`), et le moteur de génération
lui-même (`generate-script.ts`) qui parcourt tables et colonnes, calcule les
noms `pk_/uq_/fk_` (avec qualification par rôle pour les clés étrangères
réflexives multiples), assemble le script et gère les issues. Chaque
dialecte ne fournit qu'un petit objet `DialectSyntax` décrivant ce qui lui
est propre (échappement, types, limite de nom de contrainte, modes de clé
étrangère autorisés, syntaxe de `DROP TABLE`, préambule éventuel,
commentaires).

## Tableau comparatif

|                                   | PostgreSQL                             | MySQL / MariaDB                      | SQLite                                       |
| --------------------------------- | -------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Citation                          | `"identifiant"`                        | `` `identifiant` ``                  | `"identifiant"`                              |
| `integer`                         | `INTEGER`                              | `INT`                                | `INTEGER`                                    |
| `varchar(n)`                      | `VARCHAR(n)`                           | `VARCHAR(n)`                         | `TEXT` (longueur non appliquée)              |
| `decimal(p,s)`                    | `NUMERIC(p,s)`                         | `DECIMAL(p,s)`                       | `NUMERIC` (précision/échelle non conservées) |
| `boolean`                         | `BOOLEAN`                              | `BOOLEAN`                            | `INTEGER` (0/1)                              |
| `date` / `datetime`               | `DATE` / `TIMESTAMP WITHOUT TIME ZONE` | `DATE` / `DATETIME`                  | `TEXT` (convention ISO 8601)                 |
| `uuid`                            | `UUID`                                 | `CHAR(36)`                           | `TEXT`                                       |
| Stratégie FK par défaut           | `ALTER TABLE`                          | `ALTER TABLE`                        | `inline` (imposé)                            |
| `DROP TABLE`                      | `... CASCADE`                          | encadré par `SET FOREIGN_KEY_CHECKS` | encadré par `PRAGMA foreign_keys`            |
| Limite de nom de contrainte       | 63 octets                              | 64 caractères                        | 1024 octets (aucune limite pratique)         |
| Commentaires SQL                  | `COMMENT ON` (implémenté)              | non implémenté (issue informative)   | non implémenté                               |
| Auto-incrément                    | jamais inféré (`SERIAL`)               | jamais inféré (`AUTO_INCREMENT`)     | jamais inféré                                |
| Actions référentielles explicites | aucune (`NO ACTION` implicite)         | aucune                               | aucune                                       |

## Nommage

`src/core/sql/naming.ts` centralise la conversion des noms conceptuels en
identifiants physiques (conventions, normalisation des accents, mots
réservés). Le registre de contraintes partagé gère la déduplication et la
troncature spécifiques à chaque dialecte.

## Blocage par la validation

La génération SQL est refusée tant que le MCD contient des erreurs de
validation bloquantes ; l'onglet SQL affiche alors un message dédié avec un
raccourci vers l'onglet Validation.

## Validation réelle

Le script SQLite généré pour le projet « Gestion d'hôtel » a été exécuté
dans une base temporaire via le CLI `sqlite3` officiel (voir
[docs/sqlite-generation.md](sqlite-generation.md)) : création des tables
sans erreur, clés étrangères correctement déclarées et effectivement
appliquées. Un serveur MySQL/MariaDB n'était pas disponible dans cet
environnement (`docker` absent) ; la couverture de ce dialecte repose sur
les tests unitaires et les snapshots.
