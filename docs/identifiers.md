# Identifiants primaires et alternatifs (v0.5)

Implémentation : `src/core/conceptual-model/operations.ts` (logique pure),
`src/stores/project-store.ts` (actions), `src/features/entities/components/
IdentifiersEditor.tsx` (interface).

## Le modèle métier supportait déjà tout, l'interface non

`Entity.identifiers` a toujours pu contenir plusieurs `Identifier`, chacun
composé d'un ou plusieurs attributs, un seul étant `primary: true`. Ce que le
v0.5 ajoute, c'est une interface permettant de les gérer complètement — le
modèle, la validation et même la transformation MCD → MLD (contraintes
`UNIQUE` par identifiant alternatif) fonctionnaient déjà correctement,
comme le confirment les tests déjà présents dans `mcd-to-mld.test.ts` avant
même de commencer cette tâche.

## Une section « Identifiants » plutôt que des cases dispersées

Avant le v0.5, la seule action possible était de cocher/décocher un attribut
dans l'identifiant primaire via une icône clé directement sur chaque ligne
d'attribut. Cette approche ne pouvait pas s'étendre proprement aux
identifiants alternatifs (plusieurs identifiants, noms, promotion…), et
aurait rendu la liste d'attributs confuse. La gestion complète vit donc
maintenant dans une section dédiée de l'inspecteur d'entité
(`IdentifiersEditor`), sous forme de cartes — une pour l'identifiant
primaire, une par identifiant alternatif — chacune permettant de renommer,
d'ajouter/retirer/réordonner ses attributs, et (pour les alternatifs) de
supprimer l'identifiant ou de le promouvoir en primaire.

La liste d'attributs (`AttributeListEditor`) et le nœud du diagramme
(`EntityNode`) restent en **lecture seule** sur ce sujet : ils se contentent
d'indiquer, par une icône *et* un `aria-label* (jamais la couleur seule),
si un attribut est clé primaire (🔑 `KeyRound`), membre d'un identifiant
alternatif (`Fingerprint`) ou simplement unique (`Asterisk`, `attribute.
unique` sans appartenir à un identifiant).

## Contraintes métier

Assurées par `src/core/conceptual-model/operations.ts` et la validation
(`src/core/validation/validate.ts`, nouveaux codes `duplicate-attribute-in-
identifier`, `duplicate-identifier`, `duplicate-identifier-name`) :

- une entité possède toujours exactement un identifiant primaire —
  `promoteIdentifierToPrimary` rétrograde l'ancien primaire dans le même
  geste, jamais de trou ;
- un identifiant sans attribut est signalé en erreur (`empty-identifier`,
  déjà existant) ;
- le même attribut deux fois dans un identifiant est signalé
  (`duplicate-attribute-in-identifier`) ;
- deux identifiants portant sur exactement le même ensemble d'attributs
  sont signalés (`duplicate-identifier`) ;
- deux identifiants alternatifs partageant le même nom (non vide) sont
  signalés (`duplicate-identifier-name`) — un identifiant alternatif sans
  nom reste valide ;
- l'ordre des attributs d'un identifiant composé est un tableau, jamais
  trié : `moveIdentifierAttribute` permute deux positions adjacentes.

Toute mutation passe par `withHistory` (une entrée par action) et,
transitant par les stores existants, déclenche automatiquement la
validation, le recalcul du MLD/SQL (vues dérivées mémoïsées) et
l'autosauvegarde — aucun câblage spécifique n'a été nécessaire ici.

## MLD et SQL : rien à changer

`buildEntityTable` (`src/core/transformations/logical-tables.ts`) construit
déjà la clé primaire (simple ou composée) et une contrainte `UNIQUE` par
identifiant alternatif de façon entièrement générique, en itérant
`entity.identifiers` — sans distinguer si l'identifiant a été créé via
l'ancienne icône clé ou la nouvelle section. Promouvoir un identifiant
alternatif en primaire change juste le résultat de cette itération : le MLD
et le SQL (PostgreSQL, MySQL, SQLite) se recalculent immédiatement, comme
n'importe quelle autre modification du MCD. Voir les tests de non-régression
ajoutés dans `mcd-to-mld.test.ts` et les trois `generate.test.ts` (identifiant
alternatif composé → contrainte `UNIQUE` multi-colonnes), et le scénario
e2e `e2e/identifiers.spec.ts` qui vérifie la promotion en conditions
réelles (MCD → MLD → SQL, y compris l'annulation).
