# Performance du canvas : le glisser-déposer (v0.5.1)

## Le problème

À la fin de la v0.5, déplacer un nœud sur un grand diagramme était
perceptiblement poussif. Le contrôle de non-régression de la v0.5
([performance.md](performance.md)) l'avait constaté sans le résoudre :
« de l'ordre de la seconde pour quelques pas de déplacement, contre
quelques dizaines de millisecondes à vide ».

Mesure de départ, dans Chromium piloté par Playwright, sur la fixture de
100 entités / 150 associations (250 nœuds, 300 arêtes) :

| Modèle | 60 `mouse.move` pendant un glissement | Coût par événement |
|---|---|---|
| 250 nœuds | 9 736 ms | 162,3 ms |
| 3 nœuds | 1 122 ms | 18,7 ms |

Soit un **rapport de 8,7×** entre le grand diagramme et le petit. Les
18,7 ms du petit modèle ne sont pas du travail de Modrise : c'est le coût
incompressible d'un aller-retour `mouse.move` du protocole Playwright.
C'est donc bien le grand modèle qui payait quelque chose de réel, et il le
payait à chaque image.

## La cause

L'hypothèse évidente — « les adaptateurs React Flow et le store coûtent
trop cher sur 250 nœuds » — est **fausse**, et il valait mieux le vérifier
que le supposer. Un banc en JavaScript pur, rejouant 100 fois la chaîne
`moveNode` → `toReactFlowNodes` → `toReactFlowEdges` sur 254 nœuds et
300 arêtes, s'exécute en **20,4 ms au total, soit 0,20 ms par
événement** : environ 0,1 % du coût observé. Les `Map` de lookup
introduites en v0.5 avaient déjà réglé ce qu'il y avait à régler de ce
côté.

Le coût était en aval. La chaîne était la suivante, à **chaque** événement
de déplacement :

1. React Flow émettait un changement `position` ;
2. le canvas écrivait immédiatement la position dans le store de diagramme ;
3. l'écriture notifiait les abonnés, et les `useMemo` des adaptateurs se
   réinvalidaient parce que `state.nodes` était un nouveau tableau ;
4. `toReactFlowNodes` et `toReactFlowEdges` reconstruisaient **250 objets
   de nœud et 300 objets d'arête neufs** ;
5. React Flow recevait des tableaux entièrement neufs, resynchronisait son
   store interne, remontait ses 250 enveloppes de nœud et ses 300 arêtes.

Les étapes 1 à 4 coûtaient 0,20 ms. L'étape 5 coûtait le reste. Les
comparateurs `memo` de `EntityNode` et `ParticipationEdge` étaient déjà
corrects et précis (ils comparent les champs visuels réellement utilisés,
sans `JSON.stringify`), mais ils ne peuvent rien contre une resynchronisation
de l'ensemble du graphe déclenchée en amont d'eux.

Deux vérifications faites au passage, qui n'ont **pas** révélé de problème :

- `useValidation`, `useLogicalModel` et `useSqlGeneration` dépendent
  uniquement du modèle conceptuel et des réglages de nommage/dialecte,
  jamais des positions. Aucun recalcul métier n'était donc déclenché par un
  déplacement, ni avant ni après cette passe — mais rien ne le garantissait
  par un test, ce qui est désormais corrigé.
- Les comparateurs `React.memo` des nœuds et des arêtes étaient déjà
  corrects (voir ci-dessus).

En revanche, l'écriture par image entraînait bien deux effets de bord
coûteux : une **entrée d'historique** et une **planification
d'autosauvegarde** à chaque événement.

## L'architecture retenue

Le principe : **pendant le déplacement, le store n'est pas écrit du
tout.**

```
déplacement en cours  →  transaction transitoire  →  rendu immédiat
fin du déplacement    →  une écriture du store
                      →  une entrée d'historique
                      →  une autosauvegarde (débattue)
```

`DiagramModel` reste la source de vérité. La transaction est un état
strictement transitoire, qui n'existe qu'entre l'appui et le relâchement du
bouton.

### La transaction — `src/core/diagram/drag-transaction.ts`

Module pur, sans React ni React Flow ni Zustand, donc testable seul :

```ts
export interface DragTransaction {
  nodeIds: string[];
  initialPositions: Record<string, Position>;
  currentPositions: Record<string, Position>;
  startedAt: number;
}
```

- `startDrag(nodes, nodeIds, startedAt)` ouvre la transaction. **Les nœuds
  verrouillés en sont exclus dès l'ouverture** : ils ne peuvent donc jamais
  être déplacés par accident, même sélectionnés au sein d'un groupe.
- `updateDragPreview(transaction, nodeId, position)` accumule une position.
  L'objet est muté sur place — c'est le seul endroit du code où une mutation
  est délibérée, et elle est justifiée : cent événements par déplacement ne
  doivent pas produire cent objets.
- `hasMoved(transaction)` distingue un vrai déplacement d'un simple clic.
- `commitDrag(transaction)` retourne **uniquement les nœuds qui ont
  réellement bougé**. Un clic sans déplacement retourne `{}`, et n'écrit
  donc rien.

Il n'existe pas d'opération d'annulation symétrique : le store n'ayant
jamais été écrit pendant le déplacement, abandonner une transaction se
réduit à l'oublier — les positions du `DiagramModel` font alors foi.

### L'aperçu — `applyDragPreviewToNodes` / `applyDragPreviewToEdges`

Les positions en cours sont superposées aux nœuds dérivés du store sans
repasser par celui-ci
(`src/features/diagram/adapters/to-react-flow.ts`). Ces deux fonctions sont
écrites pour **préserver l'identité référentielle** :

- un nœud non déplacé est retourné tel quel, pas recopié ;
- si rien n'a changé, le **tableau d'origine** est retourné, pas un
  nouveau tableau issu d'un `map` ;
- côté arêtes, seules celles dont une extrémité bouge sont réexaminées, et
  même parmi elles, une arête dont le côté de raccordement ne change pas est
  conservée à l'identique.

C'est ce qui permet aux `memo` déjà en place de faire enfin leur travail :
déplacer un nœud sur 250 ne remplace qu'un objet de nœud et, au plus, les
quelques arêtes qui le touchent.

### Le cycle complet — `DiagramCanvas.tsx`

Tout passe par `onNodesChange`, seul point d'entrée : React Flow y émet des
changements `position` porteurs d'un drapeau `dragging`, ce qui suffit à
distinguer les trois phases sans multiplier les gestionnaires
(`onNodeDragStart` / `onNodeDrag` / `onNodeDragStop` traiteraient les mêmes
événements une seconde fois).

| Phase | Déclencheur | Effet |
|---|---|---|
| Démarrage | premier changement `position` sans transaction ouverte | capture d'un `EditorSnapshot` (le « avant » de l'historique), ouverture de la transaction |
| Aperçu | changements `position` suivants | mutation de `currentPositions`, superposition au rendu — **aucune écriture du store** |
| Validation | `dragging === false` | `commitDrag` → `moveNodes` (une seule écriture) → une entrée d'historique → autosauvegarde débattue |

La transaction est conservée dans un `useState` (l'objet étant muté sur
place, un déplacement entier ne provoque que deux rendus du canvas :
l'ouverture et la fermeture) doublé d'une `ref` non réactive lue par le
gestionnaire d'événements.

### L'écriture unique — `moveNodes`

`src/stores/diagram-store.ts` expose `moveNodes(positions)` : une seule
transaction Immer applique toutes les positions, donc **une seule
notification aux abonnés**, que le déplacement concerne un nœud ou vingt.
La garde sur les nœuds verrouillés y est répétée, en défense en
profondeur. `moveNode` (unitaire) reste utilisé par l'alignement, la
distribution et l'organisation automatique.

### Historique

Une entrée par déplacement, quel que soit le nombre d'événements
intermédiaires, libellée « Déplacer un élément » ou « Déplacer N éléments ».
L'instantané « avant » est capturé une fois à l'ouverture de la
transaction, le « après » une fois au commit ; si les deux sont identiques
(clic sans déplacement, ou déplacement annulé par un nœud verrouillé),
aucune entrée n'est empilée. Le moteur d'historique lui-même
([editor-history.md](editor-history.md)) n'a pas été réécrit : le problème
n'était pas le coût d'un instantané, mais le fait d'en créer cent.

### Autosauvegarde

Rien n'est planifié pendant le déplacement, puisque le store n'est pas
écrit — l'indicateur ne passe même pas par « Modifications non
enregistrées » avant le relâchement. Le commit final déclenche le débounce
habituel de 800 ms, qui fusionne au besoin plusieurs déplacements
rapprochés en une seule écriture IndexedDB portant la dernière position.

**Cent événements de déplacement produisent donc : 0 écriture du store,
0 entrée d'historique, 0 sauvegarde — puis, au relâchement, 1 écriture,
1 entrée, 1 sauvegarde.**

## Résultats mesurés

Même protocole que la mesure de départ, même machine, même session :

| Modèle | Avant | Après | |
|---|---|---|---|
| 250 nœuds, 60 événements | 9 736 ms | **1 480 ms** | −85 % |
| Coût par événement | 162,3 ms | **24,7 ms** | |
| Rapport grand / petit modèle | 8,7× | **1,3×** | |

Le budget fixé pour cette passe était une réduction d'au moins 50 % de la
durée totale d'un scénario de déplacement automatisé ; la réduction
constatée est de 85 %. Les 24,7 ms restants par événement sont
essentiellement le plancher de Playwright déjà mesuré sur le modèle à
3 nœuds (18,7 ms) : le grand diagramme est revenu au niveau du petit.

Coût en poids de bundle : chunk principal 855,69 kB → **857,38 kB**
(263,50 → 264,05 kB gzip), soit **+1,69 kB**, sans aucune dépendance
ajoutée.

## Ce qui garantit que ça ne régresse pas

Les mesures en millisecondes sont instables en intégration continue ; les
tests portent donc sur des **nombres de recalculs**, qui sont la grandeur
réellement en cause, plus un garde-fou en rapport plutôt qu'en valeur
absolue.

- `src/core/diagram/drag-transaction.test.ts` — la transaction elle-même :
  exclusion des nœuds verrouillés, accumulation de 100 positions,
  distinction clic / déplacement, positions relatives d'un groupe.
- `src/features/diagram/adapters/to-react-flow.test.ts` — la préservation
  d'identité : tableau d'origine retourné quand rien ne change, `data`
  d'un nœud déplacé non reconstruit, arêtes non touchées conservées.
- `src/features/diagram/components/DiagramCanvas.drag.test.tsx` — le
  contrat de comptage, React Flow remplacé par un espion : 100 événements
  → 0 écriture du store, 0 validation, 0 transformation MLD ; puis au
  relâchement 1 écriture et 1 entrée d'historique.
- `src/persistence/autosave.test.ts` — 100 événements → 0 appel à
  `saveProject` ; commit → exactement 1, portant la position finale.
- `src/stores/diagram-store.test.ts` — `moveNodes` ne notifie qu'une fois
  pour vingt nœuds.
- `e2e/drag-behaviour.spec.ts` — les cinq parcours utilisateur :
  déplacement simple annulable/rétablissable, déplacement groupé,
  nœud verrouillé, stabilité du panneau SQL, persistance de la seule
  position finale après rechargement.
- `e2e/drag-performance.spec.ts` — le garde-fou : le rapport entre un
  déplacement sur 250 nœuds et le même sur 3 nœuds doit rester sous 4×
  (il est de 1,3-1,4×). Ce seuil détecte un retour à l'architecture
  précédente (8,7×) sans se déclencher pour quelques millisecondes de
  variation d'une machine à l'autre.

La fixture déterministe partagée est `e2e/fixtures/large-model.ts`
(`createLargeModelFixture` / `writeLargeModelFixture`), qui produit un
`.merise.json` complet avec des identifiants de nœuds stables (`n-e-0`,
`n-a-0`, `n-c-0`), et son équivalent en mémoire pour les tests unitaires
dans `src/tests/fixtures/models.ts` (`largeModel` / `largeDiagram`).

## Limites connues

- **Le côté de raccordement des arêtes est figé pendant le glissement**
  pour les arêtes dont aucune extrémité ne bouge — ce qui est correct — mais
  aussi, volontairement, pour toute arête dont le côté ne change pas au
  regard des positions transitoires. Le rendu est donc exact pendant le
  déplacement ; c'est simplement le recalcul complet qui n'a lieu qu'au
  relâchement, ce qui est sans effet visible.
- **Le plancher restant est celui de React Flow**, pas de Modrise : sur
  250 nœuds, la bibliothèque garde un coût par image supérieur à celui d'un
  diagramme vide. Le rapport de 1,3× indique qu'il est devenu marginal ;
  aller plus loin supposerait de la virtualisation (ne monter que les nœuds
  visibles), ce qui n'est pas justifié à cette échelle.
- **Les autres interactions n'ont pas été retravaillées** : le
  redimensionnement d'un commentaire, l'organisation automatique et
  l'alignement écrivent toujours directement dans le store. C'est
  approprié — ce sont des actions ponctuelles, pas des flux d'événements
  continus.
- **Aucune instrumentation n'est livrée en production.** Les mesures
  ci-dessus ont été prises avec des bancs jetables, supprimés depuis, et
  avec les outils du navigateur. Aucune donnée ne quitte le navigateur, et
  aucune télémétrie n'a été ajoutée.
