# Export SVG / PNG du diagramme (v0.4)

Implémentation : `src/core/diagram/bounds.ts`, `src/core/export/to-svg.ts`
(purs, sans dépendance UI), `src/features/diagram/export/` (intégration
navigateur).

## Rectangle englobant (`computeDiagramBounds`)

Fonction pure calculant `{ x, y, width, height }` englobant tous les nœuds du
diagramme (entités, associations et commentaires confondus — ce sont tous
des `DiagramNode`), avec une marge de chaque côté. Gère un diagramme vide
(`{0,0,0,0}`) et des coordonnées négatives sans les tronquer. Ignore la
sélection : l'export porte toujours sur le diagramme entier, jamais sur ce
qui est sélectionné à l'écran. Utilisé pour cadrer aussi bien l'export SVG
que l'export PNG, indépendamment du pan/zoom affiché au moment de l'export.

## SVG : un document réellement vectoriel

`renderDiagramToSvg` (`src/core/export/to-svg.ts`) construit un document SVG
autonome à partir du modèle — pas une capture du DOM. Entités, associations,
cardinalités, rôles et commentaires sont dessinés comme de vrais éléments
`<rect>`/`<line>`/`<text>`, réutilisant les mêmes fonctions de formatage que
l'écran (`formatDataType`, `isPrimaryAttribute`, `formatCardinality`). C'est
une fonction pure du noyau (`src/core`), testable sans navigateur
(`to-svg.test.ts`) et sans dépendance à React/React Flow.

**Ancrage aux bordures, pas aux centres.** Les lignes de participation et
leurs étiquettes de cardinalité sont ancrées au **bord** de chaque boîte
(`nodeBorderPoint`, `src/core/diagram/geometry.ts`), pas à son centre : une
étiquette positionnée « à 30 % du segment centre-à-centre » peut, si les
boîtes sont larges, tomber encore à l'intérieur de la boîte source et se
retrouver invisible sous son rectangle opaque (dessiné après, dans l'ordre
d'empilement). C'est exactement le bug rencontré pendant le développement de
cette fonctionnalité — voir le commit qui l'a corrigé pour le détail du
diagnostic.

`downloadDiagramSvg` (`src/features/diagram/export/export-svg.ts`) relie ce
générateur aux stores et déclenche le téléchargement, nommé
`<projet>.mcd.svg`.

## PNG : rastérisation du même document

`downloadDiagramPng` (`export-png.ts`) réutilise **exactement le même** SVG
que l'export vectoriel, et le rastérise sur un `<canvas>` hors écran (à 2×
pour une image nette) via `Image` + `canvas.toBlob('image/png')`. Aucune
dépendance tierce.

Une première implémentation utilisait `html-to-image` pour capturer
directement le DOM React Flow réel. Approche abandonnée : chaque arête de
participation vit dans son propre petit `<svg>` stylé par des classes
Tailwind, et ce style ne survit pas au clonage DOM effectué par la
bibliothèque — les traits de liaison disparaissaient silencieusement de
l'image exportée, alors que les boîtes et leurs libellés de cardinalité (
rendus via un portail séparé) restaient visibles. Rastériser notre propre
rendu vectoriel élimine ce problème à la racine et n'ajoute aucun poids au
bundle de production.

Fichier nommé `<projet>.mcd.png`.

## Garde-fou : diagramme vide

Les deux exports refusent proprement un diagramme sans aucun élément
(`DiagramExportError`, message explicite) plutôt que de produire un fichier
dégénéré silencieusement — sauf le SVG, qui affiche un message « Diagramme
vide » plutôt que d'échouer, pour rester consultable même vide.

## Accès depuis l'interface

Bouton « Exporter en image » (barre supérieure), menu déroulant avec les
deux options. Le bouton « Exporter » existant (export `.merise.json`) n'a
pas été transformé en menu pour ne rien changer à son comportement, déjà
couvert par des tests e2e existants.
