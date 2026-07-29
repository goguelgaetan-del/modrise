# Transformation MCD → MLD

> **Statut : prévue pour la v0.2.** Ce document spécifie les règles qui seront
> implémentées dans `src/core/transformations/mcd-to-mld.ts`. Les structures du
> modèle logique (`src/core/logical-model/types.ts`) sont déjà en place.

## Pipeline

Le SQL n'est **jamais** généré directement depuis le MCD :

```text
ConceptualModel → Validation → LogicalModel → SqlDialect → SQL
```

La génération est bloquée tant que la validation contient des erreurs.

## Règles

### Entités

- Chaque entité devient une table ; chaque attribut une colonne
  (`nullable = !required`).
- L'identifiant primaire devient la clé primaire (composée si plusieurs
  attributs).
- Chaque identifiant alternatif devient une contrainte unique.

### Association 1,N

Pour une association binaire avec un côté `max = 1` et un côté `max = N` :

- la clé primaire de l'entité du côté `1` migre dans la table du côté `N`
  (clé étrangère) ;
- la nullabilité de la clé étrangère vient de la cardinalité minimale du côté
  `max = 1` : `min = 0` → nullable, `min = 1` → NOT NULL ;
- les attributs portés par l'association migrent dans la table du côté `N`.

### Association N,N

Pour une association dont au moins deux participations ont `max = N` :

- création d'une table associative nommée d'après l'association ;
- une clé étrangère par participation ;
- les attributs portés deviennent des colonnes de la table associative ;
- clé primaire composée de l'ensemble des clés étrangères par défaut ;
- les rôles servent à nommer les colonnes en cas de collision (deux
  participations vers la même entité).

### Association 1,1

Stratégie déterministe du MVP :

- si un seul côté est optionnel (`min = 0`), la clé étrangère est placée du
  côté optionnel, avec une contrainte unique ;
- si les deux côtés sont équivalents, le côté porteur est choisi par une règle
  stable (ordre des participations dans l'association) et un avertissement
  documente le choix (`ambiguous-one-to-one`, déjà émis par la validation).

### Association réflexive

- Les rôles nomment les colonnes de clés étrangères (ex. `manager_id`,
  `subordonne_id`).
- Rôles absents ou identiques → problème de validation
  (`reflexive-association-without-roles`, déjà émis).

### Association n-aire

- Table associative avec une clé étrangère par participation, les attributs
  portés, et une clé primaire composée cohérente.

### Héritage

L'héritage Merise n'est pas couvert par le MVP. Les structures (`sourceIds`,
`LogicalTransformationIssue`) sont prévues pour l'ajouter sans casser le
format.

## Traçabilité

Chaque table/colonne logique référence ses objets conceptuels d'origine
(`sourceIds` / `sourceId`), et chaque choix non trivial de transformation est
matérialisé par un `LogicalTransformationIssue` — jamais silencieux.
