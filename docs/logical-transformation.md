# Transformation MCD → MLD

Implémentée dans `src/core/transformations/` (`mcd-to-mld.ts` orchestre,
`logical-tables.ts` construit les tables d'entités, `logical-associations.ts`
transforme les associations, `logical-naming.ts` centralise le nommage
déterministe). Aucun de ces modules ne dépend de React, React Flow, Zustand
ou Dexie.

## Pipeline

Le SQL n'est **jamais** généré directement depuis le MCD :

```text
ConceptualModel → Validation → LogicalModel → SqlDialect → SQL
```

`transformToLogicalModel(model, options?)` appelle d'abord
`validateConceptualModel` : si le modèle contient des erreurs bloquantes, la
transformation est refusée (`{ success: false, issues }`) sans produire de
table. Elle ne lève jamais d'exception : une erreur interne inattendue est
capturée et renvoyée comme `issue` de sévérité `error`, journalisée dans la
console.

## Déterminisme

Aucun identifiant aléatoire n'est généré pendant la transformation : chaque
id logique (table, colonne, clé étrangère, contrainte) est dérivé par simple
concaténation des ids stables du modèle conceptuel fourni en entrée (ex. :
`c:t:entity:<id-entité>:attr:<id-attribut>`). À modèle et options identiques,
deux appels produisent un résultat strictement égal (ids, noms, ordre) — voir
les tests « ordre déterministe » / « stabilité entre deux exécutions ».

## Entités

Chaque entité devient une table :

- nom de table = nom de l'entité, normalisé selon la convention SQL
  configurée (`snake_case` par défaut) ;
- chaque attribut devient une colonne, dans l'ordre du MCD ; `nullable =
!required` ; le type conceptuel est conservé tel quel (la conversion vers
  un type physique de dialecte est la responsabilité de `src/core/sql`,
  v0.3) ;
- l'identifiant primaire devient la clé primaire (`primaryKey`), composée si
  plusieurs attributs ;
- chaque identifiant alternatif devient une contrainte unique
  (`sourceIdentifierId` renseigné) ;
- un attribut marqué `unique: true` en dehors de l'identifiant primaire
  produit également une contrainte unique mono-colonne (sans
  `sourceIdentifierId`, puisqu'il ne provient pas d'un `Identifier`).

**Exemple** — entité `CLIENT` (`id_client` primaire, `email` unique) :

```text
CLIENT
────────────────────────────
PK id_client : integer
   nom       : varchar(100)
   email     : varchar(255)      UNIQUE (uq_client_email)
```

## Association 1,N — règle de direction (vérifiée sur le fixture hôtel)

> **Point corrigé par rapport à une première rédaction de ce document** : la
> clé étrangère est portée par l'entité dont la cardinalité **maximale vaut
> 1**, et référence l'entité dont la cardinalité **maximale vaut N** — pas
> l'inverse. Une colonne scalaire ne peut physiquement pas porter plusieurs
> références ; seul le côté max=1 peut recevoir une clé étrangère simple.

Pour une association binaire avec un côté `max=1` et un côté `max=N` :

- la clé primaire de l'entité côté `max=N` (référencée) migre dans la table
  de l'entité côté `max=1` (porteuse de la clé étrangère) ;
- la **nullabilité** de la clé étrangère dépend de la cardinalité **minimale
  du côté porteur** (`max=1`), pas de l'autre côté : c'est ce côté qui
  déclare si la relation lui est obligatoire ou optionnelle ;
- les attributs portés par l'association migrent dans la même table (celle
  du côté `max=1`), après les colonnes propres et la clé étrangère.

**Exemple** (fixture « Gestion d'hôtel ») — CLIENT (0,N) — EFFECTUER — (1,1)
RESERVATION : « une réservation est effectuée par exactement un client ».
RESERVATION porte donc la clé étrangère :

```text
RESERVATION
────────────────────────────────
PK id_reservation      : integer
   date_arrivee         : date
   ...
FK client_id_client     : integer NOT NULL   (fk_reservation_client → CLIENT)
```

`client_id_client` est NOT NULL car la participation de RESERVATION a pour
minimum `1`. Si elle avait été `(0,1)`, la colonne aurait été nullable.

### Nommage des colonnes migrées

`<préfixe>_<nom de la colonne référencée>`, où le préfixe est le **rôle** de
la participation référencée s'il est renseigné, sinon le nom de son entité.
Pour une clé composée, chaque colonne de la clé est migrée avec ce même
préfixe (ex. `client_code`, `client_version`).

## Association N,N

Pour une association binaire dont les deux participations ont `max=N` :

- une table associative est créée, nommée d'après l'association ;
- chaque participation contribue ses propres colonnes migrées (clé
  primaire de son entité, préfixée par son rôle ou le nom de son entité) et
  sa propre clé étrangère, non nullable par défaut ;
- la clé primaire de la table associative est la concaténation, dans l'ordre
  des participations, de toutes les colonnes migrées ;
- les attributs portés par l'association sont ajoutés après ces colonnes.

**Exemple** — COMMANDE (1,N) — CONTENIR — (0,N) PRODUIT, attribut `quantite` :

```text
CONTENIR
─────────────────────────────
PK FK commande_id  : integer
PK FK produit_id   : integer
      quantite     : integer NOT NULL
```

## Association 1,1

Stratégie déterministe :

- si un seul côté est optionnel (`min=0`) et l'autre obligatoire (`min=1`),
  la clé étrangère est placée du côté optionnel (nullable, contrainte
  unique) ;
- si les deux côtés sont équivalents (`0,1—0,1` ou `1,1—1,1`), la
  **première participation du modèle** est choisie comme porteuse (ordre
  stable, non aléatoire) et un avertissement
  `ONE_TO_ONE_AMBIGUOUS_SIDE_SELECTED` documente ce choix ;
- dans tous les cas, la nullabilité suit le même principe que pour 1,N : elle
  dépend du minimum du côté porteur.

## Association réflexive

Plusieurs participations vers la même entité. Le rôle de chaque participation
préfixe le nom de la colonne migrée qui la concerne :

- **réflexive 1,N** (ex. EMPLOYE — ENCADRER : un manager encadre 0..N
  subordonnés, un subordonné est encadré par 0 ou 1 manager) : une seule
  colonne est ajoutée à la table EMPLOYE (auto-référence), nommée d'après le
  rôle du côté référencé (`max=N`, ici « manager ») → `manager_id` ;
- **réflexive N,N** (ex. EMPLOYE — COLLABORER) : table associative avec une
  colonne par participation, chacune préfixée par son propre rôle →
  `initiateur_id`, `collegue_id` ;
- si les rôles sont absents ou identiques après normalisation, le
  transformateur reste défensif (aucune exception) : le registre de nommage
  désambiguïse automatiquement (suffixe `_2`) et un avertissement
  `REFLEXIVE_ASSOCIATION_MISSING_ROLE` est émis.

## Association n-aire

Plus de deux participations : traitée par le même algorithme générique que
N,N (table associative, une clé étrangère par participation, clé primaire
composée de toutes les colonnes migrées, dans l'ordre des participations). Un
avertissement informatif `NARY_ASSOCIATION_JUNCTION_TABLE_CREATED` signale
qu'aucune optimisation spécifique aux cardinalités n-aires n'est appliquée
pour l'instant — un raffinement pourra être ajouté plus tard sans changer la
structure du modèle logique.

## Ordre des colonnes d'une table

1. attributs propres de l'entité, dans l'ordre du MCD ;
2. pour chaque association 1,N ou 1,1 dont cette entité est le côté
   porteur de la clé étrangère, dans l'ordre des associations du MCD : ses
   colonnes migrées puis ses attributs portés (groupe contigu par
   association).

Pour une table associative (N,N / n-aire) : les colonnes migrées de chaque
participation, dans l'ordre des participations, puis les attributs portés par
l'association.

Aucun tri alphabétique n'est appliqué : l'ordre suit toujours le MCD.

## Collisions de noms

Toute génération de nom (table, colonne, contrainte) passe par
`LogicalNameRegistry`, qui détecte les collisions (insensible à la casse) et
ajoute un suffixe numérique stable (`_2`, `_3`…). Chaque collision résolue
produit un avertissement `SQL_NAME_COLLISION_RESOLVED` — jamais silencieuse.
Les noms de contraintes dépassant 63 caractères sont raccourcis (avertissement
`CONSTRAINT_NAME_TRUNCATED`).

## Limites actuelles

- L'héritage Merise n'est pas couvert (structures `sourceIds` / issues
  prévues pour l'ajouter sans casser le format).
- L'association n-aire utilise systématiquement une table associative
  générique, sans tenir compte d'éventuelles cardinalités permettant une
  transformation plus fine.
- Le choix du côté porteur d'une association 1,1 symétrique est stable mais
  arbitraire (ordre des participations) : il n'y a pas de heuristique
  sémantique pour deviner « le bon » côté.
