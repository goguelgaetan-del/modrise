# Ce que Modrise sait modéliser

Cette page décrit ce qui est **réellement pris en charge aujourd'hui**. Ce qui
n'y figure pas n'existe pas encore dans l'outil : voir
[Limites connues](limites.md).

## Entités et attributs

Une entité porte un nom et une liste ordonnée d'attributs. L'ordre compte : il
est conservé à l'export et détermine l'ordre des colonnes générées.

Chaque attribut a un **type** parmi neuf :

| Type       | Paramètres         | Exemple d'usage                 |
| ---------- | ------------------ | ------------------------------- |
| `integer`  | —                  | identifiant, quantité           |
| `bigint`   | —                  | compteur de grande amplitude    |
| `decimal`  | précision, échelle | `decimal(8,2)` pour un montant  |
| `varchar`  | longueur           | `varchar(255)` pour un courriel |
| `text`     | —                  | description libre               |
| `boolean`  | —                  | actif / inactif                 |
| `date`     | —                  | date de naissance               |
| `datetime` | —                  | horodatage                      |
| `uuid`     | —                  | identifiant technique           |

Et deux marqueurs indépendants : **obligatoire** (`NOT NULL`) et **unique**
(contrainte `UNIQUE` sur cette seule colonne).

## Identifiants

Chaque entité a **exactement un identifiant primaire**, et autant
d'identifiants alternatifs que nécessaire. Tous se gèrent dans la section
_Identifiants_ de l'inspecteur d'entité.

- **Identifiant primaire simple** : un attribut. Devient la clé primaire.
- **Identifiant primaire composé** : plusieurs attributs, dans un ordre que
  vous choisissez. Devient une clé primaire composée — et, quand l'entité est
  référencée, se propage en clé étrangère composée. L'exemple _Bibliothèque_
  montre ce cas (`RAYON`, identifié par `code_salle` + `numero_rayon`).
- **Identifiant alternatif** : un ou plusieurs attributs, nommé, qui devient
  une contrainte `UNIQUE` dans le MLD. L'exemple _Boutique en ligne_ en
  utilise plusieurs (`courriel_unique`, `reference_unique`).

Un attribut simplement coché « unique » et un identifiant alternatif à un seul
attribut produisent le même SQL ; l'identifiant alternatif se distingue par son
nom explicite, et se voit dans le diagramme.

Le diagramme distingue les trois cas par une icône **et** un libellé, jamais
par la seule couleur.

## Associations

Une association porte un verbe (`PASSER`, `CONCERNER`, `EMPRUNTER`) et relie
des entités par des **participations**. Modrise prend en charge :

- les associations **binaires** (deux participations) ;
- les associations **n-aires** — trois participations ou plus. L'exemple
  _Bibliothèque_ en contient une : `EMPRUNTER` relie un exemplaire, un
  adhérent et un bibliothécaire ;
- les associations **réflexives** : deux participations vers la **même**
  entité. L'exemple _Boutique en ligne_ en contient une : `REGROUPER`, qui
  relie `CATEGORIE` à elle-même. Donnez alors un **rôle** distinct à chaque
  participation (« catégorie parente », « sous-catégorie ») : sans eux, les
  colonnes générées seraient indiscernables, et Modrise le signale ;
- les **attributs portés par l'association** : une donnée qui n'appartient ni
  à l'une ni à l'autre entité, mais à leur rencontre — le prix convenu d'une
  réservation, la quantité d'une ligne de commande.

Une association reliant moins de deux participations est une erreur.

## Cardinalités

Quatre valeurs, celles de Merise, sur chaque participation :

| Cardinalité | Lecture                                    |
| ----------- | ------------------------------------------ |
| `0,1`       | au plus une fois, éventuellement aucune    |
| `1,1`       | exactement une fois                        |
| `0,N`       | un nombre quelconque de fois, zéro compris |
| `1,N`       | au moins une fois                          |

Ce que Modrise en fait dans le modèle logique :

- **Un côté en `0,N` ou `1,N`, l'autre en `1,1` ou `0,1`** — l'entité dont la
  participation est en `1,1`/`0,1` reçoit une clé étrangère vers l'autre.
  Aucune table supplémentaire. Dans l'exemple du démarrage rapide, c'est
  `commande` qui reçoit `id_client`.
- **Les deux côtés en `0,N` ou `1,N`** — l'association devient une table à
  part entière, de clé primaire composée des clés étrangères, et portant ses
  éventuels attributs.
- **Association n-aire** (trois participations ou plus) — toujours une table
  dédiée, quelles que soient les cardinalités.
- **Les deux côtés en `0,1`/`1,1`** — un seul côté peut porter la clé
  étrangère, qui reçoit alors une contrainte `UNIQUE`. Quand l'un des côtés
  est optionnel et l'autre obligatoire, c'est l'optionnel qui la porte. Quand
  les deux sont identiques (`0,1—0,1` ou `1,1—1,1`), Modrise retient la
  première participation du modèle — choix stable, mais arbitraire, et il
  **vous prévient** plutôt que de le faire en silence.

Les règles complètes, y compris le nommage des colonnes et la résolution des
collisions, sont dans [logical-transformation.md](../logical-transformation.md).

## Commentaires

Un commentaire est une note posée sur le canevas. Il est **purement visuel** :
il ne fait pas partie du modèle conceptuel, n'apparaît ni dans le MLD ni dans
le SQL, et n'influence aucune validation. Il est bien enregistré dans le
fichier du projet.

## Ce que la validation vérifie

En continu, à chaque modification, dans l'onglet **Validation** :

**Erreurs** (elles bloquent le calcul du MLD et du SQL) — entité ou attribut
sans nom, noms d'entités ou d'attributs en double, entité sans identifiant
primaire ou avec plusieurs, identifiant vide, en double, ou renvoyant à un
attribut inexistant, association sans nom ou à moins de deux participations,
participation vers une entité inexistante, cardinalité invalide, longueur de
`varchar` ou précision/échelle de `decimal` incohérente.

**Avertissements** (ils ne bloquent rien) — association réflexive sans rôles
distincts, nom peu compatible avec SQL, nom qui est un mot réservé SQL, entité
sans autre attribut que son identifiant, nom de plus de 64 caractères,
association `1,1` symétrique, collision entre deux noms une fois convertis à
la convention de nommage choisie.

## Conventions de nommage SQL

Les noms Merise (souvent en majuscules, parfois accentués) sont convertis
avant génération selon la convention retenue pour le projet :
`snake_case` (par défaut), `camelCase` ou `PascalCase`. La conversion supprime
les accents et découpe les mots ; en cas de collision entre deux noms
différents ramenés au même identifiant, un avertissement le signale.
