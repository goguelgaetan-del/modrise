# Annuler / rétablir (v0.4)

Implémentation : `src/stores/history-store.ts`, `src/features/history/`.

## Principe : instantanés structurés, pas de commandes inverses

Plutôt que d'enregistrer une commande et son inverse pour chaque action
(complexe à maintenir correctement pour un modèle aussi riche que le MCD),
l'historique enregistre des **instantanés complets** avant/après chaque
action :

```ts
interface EditorSnapshot {
  conceptualModel: ConceptualModel;
  diagramNodes: DiagramNode[];
  diagramComments: DiagramComment[];
}
```

Grâce à Immer (déjà utilisé par les stores), une mutation qui ne touche pas
réellement une partie de l'état ne change pas sa référence : comparer les
instantanés par égalité de référence suffit donc à savoir si une action a
réellement modifié quelque chose, sans recopie ni diff coûteux.

**Volontairement exclus de l'instantané** (donc jamais annulables/rétablis-
sables) : la sélection courante, le viewport (zoom/pan), le statut de
sauvegarde, les problèmes de validation dérivés, le MLD et le SQL générés.
Ce sont soit de l'état d'interface, soit des vues recalculées automatiquement
— les historiser produirait des entrées d'historique vides de sens pour
l'utilisateur (« annuler » un zoom n'a pas d'intérêt).

## Point d'entrée unique : `withHistory`

```ts
function withHistory(label: string, mutate: () => void): void
```

Capture un instantané, exécute `mutate` (une ou plusieurs actions de store),
capture un second instantané, et n'enregistre une entrée que si quelque
chose a réellement changé. Toute action historisable de l'application passe
par cette fonction — les stores (`project-store`, `diagram-store`) eux-mêmes
restent totalement ignorants de l'existence de l'historique, ce qui a évité
toute régression sur leurs tests existants lors de l'ajout du v0.4.

## Champs texte à mise à jour continue

Un champ texte (nom, description, rôle, longueur…) met à jour le store à
chaque frappe pour une UI réactive, mais ne doit produire **qu'une seule**
entrée d'historique par session d'édition — pas une par caractère tapé.
`useFieldHistory(label)` (`src/features/history/use-field-history.ts`)
capture un instantané au focus et le compare à l'état courant au blur,
n'enregistrant une entrée que si la valeur a effectivement changé pendant la
session.

Pour un champ rendu dans une liste (attribut, participation), appeler ce
hook dans le callback de `.map()` violerait les règles des hooks React — il
faut extraire un composant par ligne (`AttributeRow`, `ParticipationRow`)
pour que chaque instance ait son propre appel de hook à son propre niveau
supérieur.

## Déplacements continus (glisser-déposer)

Un événement `NodeChange` de type `'position'` est répété à chaque pixel
pendant un glissement, avec `dragging: true`, puis une dernière fois avec
`dragging: false` au relâchement. `DiagramCanvas` capture l'instantané
« avant » à la première variation de position d'un geste, et n'enregistre
l'entrée qu'au relâchement — un glissement, même long, ne produit donc
qu'une seule entrée d'historique.

## Limites et comportement

- Plafond de **100 entrées** (`MAX_HISTORY_ENTRIES`) : au-delà, les plus
  anciennes sont oubliées.
- Une nouvelle action après un « annuler » efface la branche de
  « rétablir » (comportement standard d'un historique linéaire).
- L'historique est **vidé** au chargement d'un nouveau projet ou à l'import
  d'un fichier (`useHistoryStore.getState().clear()`) : annuler ne doit
  jamais traverser un changement de projet.
- Raccourcis : Ctrl/Cmd+Z (annuler), Ctrl/Cmd+Shift+Z et Ctrl+Y (rétablir),
  câblés dans `src/features/diagram/hooks/use-keyboard-shortcuts.ts`. Les
  boutons Annuler/Rétablir de la barre supérieure affichent en info-bulle le
  libellé de la prochaine action annulée/rétablie.
