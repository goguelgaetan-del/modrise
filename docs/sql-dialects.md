# Dialectes SQL

> **Statut : prévue pour la v0.3.** L'interface est en place
> (`src/core/sql/dialect.ts`) ; aucun dialecte n'est encore implémenté et
> l'onglet SQL de l'interface l'annonce explicitement.

## Interface

```ts
interface SqlDialect {
  id: SqlDialectId; // 'postgresql' | 'mysql' | 'sqlite'
  label: string;
  quoteIdentifier(identifier: string): string;
  mapDataType(type: ConceptualDataType): string;
  generate(model: LogicalModel, options: SqlGenerationOptions): string;
}
```

Chaque dialecte consomme le **modèle logique** (jamais le MCD directement) et
produit un script complet : tables, colonnes, clés primaires simples et
composées, contraintes uniques, clés étrangères, nullabilité, avec :

- des types adaptés au dialecte (ex. `uuid` → `UUID` en PostgreSQL,
  `CHAR(36)` en MySQL) ;
- l'échappement systématique des identifiants ;
- un ordre de génération et des noms de contraintes **déterministes** (sorties
  stables, testables par snapshot) ;
- des commentaires optionnels reprenant les descriptions du modèle ;
- les options `ON DELETE` / `ON UPDATE`.

## Nommage

`src/core/sql/naming.ts` centralise la conversion des noms conceptuels en
identifiants physiques :

- conventions `snake_case` (défaut), `camelCase`, `PascalCase`,
  `UPPER_SNAKE_CASE` ;
- normalisation des accents, espaces, apostrophes, tirets et caractères
  spéciaux ;
- repli `unnamed` pour les noms vides, préfixe pour les noms commençant par un
  chiffre, suffixe pour les mots réservés ;
- `deduplicateIdentifiers` pour résoudre les collisions après normalisation.

Les noms affichés dans le MCD restent toujours distincts des noms physiques
générés.

## Blocage par la validation

La génération SQL sera refusée tant que le modèle contient des erreurs de
validation ; le panneau de validation l'indique déjà par le badge
« Génération SQL bloquée ».
