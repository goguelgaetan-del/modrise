# Presse-papiers interne (v0.4)

Implémentation : `src/features/clipboard/` (logique pure), `src/stores/
clipboard-store.ts` (état), branché sur l'historique via `withHistory` (voir
[editor-history.md](editor-history.md)).

## Un presse-papiers interne, pas le presse-papiers système

Copier/coller dans Modrise ne touche jamais le presse-papiers du système
d'exploitation : `EditorClipboard` est un instantané autonome de la
sélection, gardé en mémoire (`clipboard-store.ts`, jamais persisté). Cela
simplifie énormément la sérialisation (pas de format MIME à négocier avec
d'autres applications) et garantit qu'un collage reproduit fidèlement des
entités/associations/commentaires Modrise, sans conversion avec perte.

```ts
interface EditorClipboard {
  entities: Entity[];
  associations: Association[];
  comments: DiagramComment[];
  nodes: DiagramNode[];
}
```

## Règle de copie d'une association

Une association n'est copiée que si **au moins deux** de ses participations
pointent vers des entités elles-mêmes présentes dans la sélection
(`buildClipboard`, `src/features/clipboard/clipboard.ts`). En dessous, la
copier produirait une association invalide (moins de deux participations)
lors du collage — elle est donc simplement exclue, silencieusement, plutôt
que collée cassée.

## Remappage complet des identifiants

`remapForPaste` (même fichier) régénère un **tout nouvel id** pour chaque
entité, attribut, identifiant, association, attribut d'association,
participation, commentaire et nœud graphique collés — via une table de
correspondance ancien id → nouvel id construite au fur et à mesure. Le
résultat ne partage **aucune référence** avec l'objet copié : modifier une
entité collée ne touche jamais l'originale, y compris pour des données
imbriquées (attributs, identifiants). Cette garantie est directement testée
dans `clipboard.test.ts`.

## Décalage des positions collées

Chaque collage successif depuis une même copie décale un peu plus les
positions (`ClipboardStore.consumePasteOffset`, pas fixe de 40px), pour
éviter d'empiler des éléments identiques exactement au même endroit. Une
nouvelle copie remet ce décalage à zéro.

## Duplication (Ctrl/Cmd+D)

`duplicateSelection` (`src/features/clipboard/actions.ts`) réutilise
exactement la même logique de remappage (`buildClipboard` +
`remapForPaste`), avec son propre décalage fixe et **sans jamais toucher au
presse-papiers de l'utilisateur** — dupliquer puis coller ce qu'on avait
copié avant restent deux opérations indépendantes.

## Historique

`copySelection` ne produit pas d'entrée d'historique (copier ne modifie rien
d'annulable) ; `pasteClipboard` et `duplicateSelection` sont chacun entourés
d'un seul appel à `withHistory`, quel que soit le nombre d'éléments collés.

## Raccourcis

Ctrl/Cmd+C (copier), Ctrl/Cmd+V (coller), Ctrl/Cmd+D (dupliquer) — câblés
dans `src/features/diagram/hooks/use-keyboard-shortcuts.ts`, ignorés quand le
focus est dans un champ de saisie pour ne jamais casser le copier/coller
natif d'un `input`/`textarea`. Le menu contextuel du canvas (clic droit)
propose les mêmes actions.
