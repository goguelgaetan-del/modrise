# Modèle conceptuel (MCD)

Le modèle conceptuel de Modrise implémente le formalisme Merise : entités,
associations, participations et cardinalités. Types définis dans
`src/core/conceptual-model/types.ts`, schémas Zod dans `schemas.ts`.

## Entité

```ts
interface Entity {
  id: string;
  name: string;
  description?: string;
  attributes: Attribute[];
  identifiers: Identifier[];
}
```

## Attribut

```ts
interface Attribute {
  id: string;
  name: string;
  dataType: ConceptualDataType;
  required: boolean;
  unique: boolean;
  description?: string;
}
```

Les types conceptuels sont une union discriminée, indépendante de tout dialecte
SQL :

```ts
type ConceptualDataType =
  | { kind: 'integer' }
  | { kind: 'bigint' }
  | { kind: 'decimal'; precision: number; scale: number }
  | { kind: 'varchar'; length: number }
  | { kind: 'text' }
  | { kind: 'boolean' }
  | { kind: 'date' }
  | { kind: 'datetime' }
  | { kind: 'uuid' };
```

Les fonctions centralisées (`data-types.ts`) fournissent affichage
(`formatDataType`), validation des options (`validateDataType`) et valeurs par
défaut sûres (`defaultDataType`). La conversion vers un dialecte SQL sera de la
responsabilité des dialectes (v0.3).

## Identifiant

```ts
interface Identifier {
  id: string;
  name?: string;
  attributeIds: string[]; // identifiant composé si plusieurs
  primary: boolean;
}
```

Une entité valide possède **exactement un identifiant primaire** ; elle peut
posséder des identifiants alternatifs (contraintes `UNIQUE` en SQL, gérables
depuis l'inspecteur — voir [identifiers.md](identifiers.md)) et des
identifiants composés de plusieurs attributs.

## Association et participation

```ts
interface Association {
  id: string;
  name: string;
  description?: string;
  attributes: Attribute[]; // attributs portés
  participations: Participation[];
}

interface Participation {
  id: string;
  entityId: string;
  role?: string; // requis en pratique pour les associations réflexives
  cardinality: Cardinality;
}

interface Cardinality {
  min: 0 | 1;
  max: 1 | 'N';
}
```

Cardinalités disponibles : `0,1`, `1,1`, `0,N`, `1,N`.

Le modèle supporte :

- les associations binaires, ternaires et n-aires (n participations) ;
- les associations réflexives (plusieurs participations vers la même entité,
  distinguées par leurs rôles) ;
- les attributs portés par une association.

## Règles de validation

Le moteur (`src/core/validation/validate.ts`) émet des problèmes typés
(`ValidationIssue`) avec un code stable par règle — erreurs (entité sans nom,
sans identifiant primaire, identifiant cassé, cardinalité invalide, options de
type invalides…) et avertissements (association réflexive sans rôles, mots
réservés SQL, collisions de noms générés, 1,1 ambiguë…). Chaque règle est
testée dans `validate.test.ts`.
