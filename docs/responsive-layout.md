# Panneaux redimensionnables et interface tablette (v0.5)

Implémentation : `src/components/layout/AppLayout.tsx`, `BottomPanel.tsx`,
`InspectorDrawer.tsx`, `NarrowScreenNotice.tsx`, `src/lib/use-media-query.ts`.

## Choix de bibliothèque : `react-resizable-panels`

Évaluée avant intégration : zéro dépendance, activement maintenue (v4,
publication la plus récente en juillet 2026), c'est la bibliothèque
utilisée par le composant « Resizable » de shadcn/ui lui-même — cohérent
avec le reste de la stack UI du projet. Une implémentation interne aurait dû
réécrire à la main la gestion clavier (flèches, Home/End, Entrée sur les
séparateurs), le drag tactile, et la persistance — tout ce que la
bibliothèque fournit déjà correctement. Impact mesuré sur le bundle :
+40 kB / +14 kB gzip, chargés directement (pas de `import()` dynamique —
la mise en page persistante est nécessaire dès le premier rendu, la
différer retarderait l'affichage de toute l'application).

## Disposition en deux groupes imbriqués

- Un groupe **vertical** englobant : la zone de travail (bibliothèque +
  canevas + inspecteur) et le panneau inférieur.
- À l'intérieur de la zone de travail, un groupe **horizontal** : la
  bibliothèque, le canevas, l'inspecteur.

Chaque panneau a des tailles min/max (`minSize`/`maxSize`) ; chaque
séparateur restaure la taille par défaut au double-clic (comportement
natif de la bibliothèque, non désactivé) et est navigable au clavier
(flèches, Home/End, Entrée — rôle `separator` WAI-ARIA natif). Les
dimensions sont persistées dans `localStorage` via `useDefaultLayout` (deux
clés séparées, une par groupe), sans code de persistance à écrire.

## Panneau inférieur : redimensionnable et réductible

Le bouton réduire/agrandir existant (`ui-store.bottomPanelOpen`) reste la
source de vérité — pas de doublon d'état avec le `Panel` englobant : un
simple `useEffect` synchronise l'un vers l'autre (`panelRef.current.expand()
/ collapse()`), pour ne pas casser le comportement déjà testé tout en
gagnant le redimensionnement par glisser. Nouveaux indicateurs dans l'en-tête
du panneau : un badge « ! » sur l'onglet MLD quand la transformation échoue
(en plus du badge d'erreurs/avertissements déjà existant sur Validation), et
le libellé du dialecte SQL courant (masqué sous `sm` pour ne pas déborder
en tablette).

## Navigation entre problèmes de validation (F8 / Shift+F8)

`src/features/validation/issue-navigation.ts` (`resolveNextIssueId`, pure et
testée) calcule quel problème cibler ensuite, en bouclant, et repart du
début si le problème précédemment ciblé a été corrigé entre-temps. F8/
Shift+F8 (câblés dans `use-keyboard-shortcuts.ts`, ignorés dans un champ de
saisie comme tout autre raccourci) et les boutons ▲/▼ du panneau Validation
partagent cette même logique : sélectionne l'élément concerné, recentre le
canevas dessus, ouvre l'onglet Validation. L'id du problème actuellement
ciblé vit dans `ui-store.focusedIssueId` (pas dans le composant) pour rester
accessible depuis le raccourci global comme depuis le panneau.

## Interface tablette (< 1200px)

En dessous de 1200px (`useIsTablet`, `src/lib/use-media-query.ts`), le
groupe horizontal bibliothèque/canevas/inspecteur cède la place à :

- un **tiroir de bibliothèque** (glisse depuis la gauche, ouvert/fermé par
  un bouton flottant) ;
- un **tiroir d'inspecteur** (`InspectorDrawer`, glisse depuis la droite dès
  qu'un élément est sélectionné, se ferme en désélectionnant).

Les deux tiroirs sont **non modaux** — pas d'overlay bloquant, pas de
Dialog Radix : le canevas doit rester utilisable (sélectionner un autre
élément) pendant qu'un tiroir est ouvert, ce qu'un vrai modal empêcherait.
Implémentés comme de simples `<div>` positionnés en `fixed`, translatés via
CSS (`translate-x-full` ↔ `translate-x-0`), sans bibliothèque
supplémentaire. Le panneau inférieur et la barre supérieure restent
inchangés ; le bouton d'export et les menus contextuels ne dépendent pas de
la présence des panneaux latéraux et restent pleinement accessibles.

## Écran trop étroit (< 768px)

`useIsNarrowScreen` affiche un bandeau non bloquant (« Modrise est plus
confortable sur un écran large »), masquable, sans désactiver quoi que ce
soit : créer une entité, importer, exporter restent possibles (voir
`e2e/resizable-panels-and-navigation.spec.ts`). Aucune tentative
d'optimiser pour un smartphone au-delà de ce message.
