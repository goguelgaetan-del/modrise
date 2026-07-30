# Organisation automatique du diagramme (v0.5)

Implémentation : `src/features/diagram/layout/auto-layout.ts`.

## Choix de bibliothèque : dagre, chargé à la demande

Le layout automatique d'un graphe orienté est un problème déjà bien résolu ;
écrire son propre algorithme (ranking, minimisation des croisements,
positionnement) n'aurait apporté aucune valeur pour un gain de poids
marginal. Options évaluées :

| Option | Taille | Mainteneur | Verdict |
|---|---|---|---|
| `@dagrejs/dagre` | ~40 kB (13,4 kB gzip), chargé en chunk séparé | Fork activement maintenu (dernière publication : mars 2026) | **Retenu** |
| `elkjs` (ELK) | Plusieurs centaines de kB, web worker requis | Puissant mais bien plus lourd que nécessaire ici | Écarté — hors de proportion pour des diagrammes MCD de taille courante |
| Implémentation interne | 0 kB | — | Écarté — réinventer le ranking/anti-croisement pour un bénéfice net négatif |

`dagre` (et non l'ancien paquet `dagre`, abandonné depuis 2021) est déjà la
bibliothèque utilisée dans l'exemple officiel « Auto Layout » de React Flow,
ce qui confirme sa pertinence pour ce cas d'usage précis.

**Chargement dynamique** : `computeAutoLayout` fait `await import('@dagrejs/
dagre')` en interne, au moment de l'appel — jamais d'import statique en tête
de fichier. Résultat mesuré (`pnpm build`) : dagre se retrouve dans son
**propre chunk** (`dagre.esm-*.js`, ~40 kB / 13,4 kB gzip), totalement
absent du bundle initial. Le bundle principal n'a grossi que du code de
l'interface elle-même (bouton, menu), soit quelques kilooctets.

## Où vit le code

`src/features/diagram/layout/` (couche `features`, jamais `src/core`) :
l'algorithme de disposition est un choix d'implémentation de la couche
diagramme, pas une dépendance du moteur métier Merise — `src/core` reste
sans dépendance autre que `zod`.

## Comportement retenu

- **Graphe construit** : un nœud dagre par `DiagramNode` (entités,
  associations *et* commentaires), une arête par participation
  (entité → association). Les dimensions réelles (`width`/`height` déjà
  mesurées par le navigateur) sont transmises à dagre, avec un repli sur les
  dimensions par défaut pour un nœud jamais encore rendu.
- **Commentaires** : inclus comme nœuds **sans arête**. N'ayant aucune
  contrainte de graphe, dagre les place à l'écart du reste plutôt que de
  tenter de préserver leur position relative précédente — plus simple et
  suffisant, puisqu'un commentaire n'a pas de relation structurelle avec
  les entités/associations qu'il annote.
- **Associations réflexives** : gérées nativement — une clé d'arête
  explicite (`multigraph: true`) permet à une association reliée deux fois
  à la même entité de produire deux arêtes distinctes vers le même couple de
  nœuds, sans conflit.
- **Graphes non connexes** : dagre positionne chaque composante sans
  chevauchement (testé dans `auto-layout.test.ts`) ; l'agencement entre
  composantes n'est pas optimisé pour la compacité, seulement pour
  l'absence de recouvrement.
- **Déterminisme** : dagre ne fait appel à aucun aléatoire ; à graphe et
  options identiques, le résultat est strictement identique (testé).
- **Nœuds verrouillés** (voir [`identifiers.md`](identifiers.md) pour le
  premier consommateur du même genre de garde-fou, et la tâche
  verrouillage/alignement pour le détail) : inclus dans le graphe comme
  obstacles, mais leur position calculée n'est jamais appliquée —
  paramètre `excludedNodeIds` de `computeAutoLayout`.

## Orientation

Deux options minimales, conformes à la demande : **Horizontale** (par
défaut, `rankdir: 'LR'`) et **Verticale** (`rankdir: 'TB'`), choisies via un
petit menu déroulant sur le bouton « Organiser automatiquement » de la
barre supérieure — pas d'espacement configurable pour garder l'interface
simple.

## Historique

L'application des nouvelles positions (un appel à `moveNode` par nœud) est
entourée d'un seul `withHistory('Organiser automatiquement le diagramme',
…)` : quel que soit le nombre de nœuds déplacés, une seule entrée
d'historique est créée, annulable/rétablissable comme n'importe quelle
autre action.
