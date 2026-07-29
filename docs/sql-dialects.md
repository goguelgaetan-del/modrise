# Dialectes SQL

> **Statut : PostgreSQL implémenté (v0.3.1).** MySQL/MariaDB et SQLite
> restent prévus pour une prochaine version ; l'interface les affiche comme
> tels sans jamais produire de faux SQL. Voir
> [docs/postgresql-generation.md](postgresql-generation.md) pour le détail
> complet du dialecte PostgreSQL.

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

- des types adaptés au dialecte (ex. `uuid` → `UUID` en PostgreSQL) ;
- l'échappement systématique des identifiants ;
- un ordre de génération et des noms de contraintes **déterministes**
  (sorties stables, testées par snapshot) ;
- des commentaires optionnels reprenant les descriptions du modèle ;
- une validation défensive qui bloque la génération (`success: false`)
  plutôt que de produire un script trompeur.

## Registre des dialectes

`src/core/sql/registry.ts` associe chaque `SqlDialectId` à son implémentation
concrète (`SQL_DIALECTS`, `getSqlDialect`). `src/core/sql/dialect.ts` ne
définit que l'interface et reste indépendant de toute implémentation, pour
que MySQL/MariaDB et SQLite puissent être ajoutés (dossiers frères de
`src/core/sql/postgresql/`) sans modifier le moteur MLD.

## Nommage

`src/core/sql/naming.ts` centralise la conversion des noms conceptuels en
identifiants physiques (conventions, normalisation des accents, mots
réservés). `src/core/sql/postgresql/constraint-registry.ts` centralise en
plus le nommage et la déduplication des **contraintes SQL** (`pk_<table>`,
`uq_<table>_<colonnes>`, `fk_<table>_<table référencée>`), avec troncature à
63 octets et résolution de collision par suffixe stable.

## Blocage par la validation

La génération SQL est refusée tant que le MCD contient des erreurs de
validation bloquantes (le panneau de validation l'indique par le badge
« Génération SQL bloquée »), et l'onglet SQL affiche alors un message dédié
avec un raccourci vers l'onglet Validation.
