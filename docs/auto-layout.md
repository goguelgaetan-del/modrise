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
- **Nœuds verrouillés** (voir plus bas) : inclus dans le graphe comme
  obstacles, mais leur position calculée n'est jamais appliquée —
  `computeAutoLayout` lit directement `DiagramNode.locked`, sans paramètre
  séparé (même principe que `computeAlignment`/`computeDistribution`).

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

## Alignement et distribution (v0.5)

Implémentation : `src/core/diagram/align.ts` (géométrie pure),
`src/features/diagram/layout/alignment-actions.ts` (stores + historique),
interface dans l'inspecteur multi-sélection (`InspectorPanel.tsx`).

## Alignement

Six directions (gauche, centre horizontal, droite, haut, centre vertical,
bas), disponibles dès **deux** éléments sélectionnés. La cible est calculée
sur le rectangle englobant de la sélection entière (bord ou centre) — pas
sur le premier élément sélectionné, pour un résultat indépendant de l'ordre
de sélection.

## Distribution

Espace régulièrement les **centres** (pas les bords) d'au moins **trois**
éléments sélectionnés le long d'un axe, en conservant fixes les deux
éléments extrêmes (les plus excentrés sur cet axe) — conformément à la
demande. N'apparaît dans l'inspecteur qu'à partir de trois éléments.

## Nœuds verrouillés : ancres, jamais déplacés

Un nœud verrouillé (voir plus bas) **participe** au calcul de la cible
(bordure de l'alignement, extrêmes de la distribution) mais n'est **jamais
lui-même déplacé** — exactement le même principe que pour l'auto-layout,
pour un comportement cohérent et prévisible entre les trois
fonctionnalités. Un nœud verrouillé qui se trouve au milieu d'une
distribution est simplement ignoré (ni déplacé, ni retiré du calcul des
positions cibles des autres) : un choix volontairement simple plutôt
qu'une redistribution qui tiendrait compte de son blocage.

## Historique

Chaque appel à « Aligner » ou « Distribuer » applique toutes les nouvelles
positions dans un seul `withHistory`, quel que soit le nombre d'éléments
déplacés — une seule entrée, annulable en un geste.

## Verrouillage de nœuds (v0.5)

Implémentation : `DiagramNode.locked` (`src/core/diagram/types.ts`),
`useDiagramStore.setNodeLocked`, menu contextuel (clic droit sur un nœud).

Un nœud verrouillé :

- reste **sélectionnable** et **éditable** dans l'inspecteur (aucune
  restriction sur le modèle métier — le verrouillage est une propriété
  purement graphique) ;
- ne peut **pas être déplacé** — ni par glisser-déposer (`draggable: false`
  côté React Flow, *et* un garde-fou dans `moveNode` lui-même côté store,
  en défense en profondeur : aucun appelant, présent ou futur, ne peut
  déplacer un nœud verrouillé) ;
- n'est **jamais repositionné** par l'auto-layout, l'alignement ou la
  distribution (voir plus haut) ;
- **peut être supprimé** (le verrouillage protège la position, pas
  l'existence du nœud) ;
- se **déverrouille** depuis le même menu contextuel ;
- est **persisté** dans le fichier projet (`diagram.nodes[].locked`, format
  v3 — voir [file-format.md](file-format.md)).

Un petit cadenas apparaît sur le nœud (en-tête pour une entité/association,
coin du commentaire) — un indicateur visuel *et* un `aria-label`, jamais la
seule présence/absence d'une couleur.

Verrouiller/déverrouiller passe par `withHistory`, comme toute autre action
du diagramme : annulable/rétablissable en un geste.
