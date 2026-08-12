# Bundle et performance (v0.5)

## Analyse du bundle

`pnpm analyze` (`ANALYZE=1 vite build`) génère `dist/bundle-analysis.html`
via `rollup-plugin-visualizer`, un treemap interactif du contenu de chaque
chunk. Le plugin n'est activé que derrière cette variable d'environnement
(`vite.config.ts`) : un `pnpm build` normal ne l'exécute jamais, et son
propre poids (dev-only, exécuté par Node pendant le build) ne fait jamais
partie du bundle livré.

## Code-splitting mis en place

| Code différé | Déclencheur | Chunk(s) mesuré(s) |
|---|---|---|
| dagre (auto-layout) | Clic sur « Organiser automatiquement » | `dagre.esm-*.js` — 39,5 kB / 13,4 kB gzip |
| Panneau MLD | Ouverture de l'onglet MLD | `LogicalModelPanel-*.js` — 3,8 kB / 1,5 kB gzip |
| Panneau SQL | Ouverture de l'onglet SQL | `SqlPreviewPanel-*.js` — 6,8 kB / 2,5 kB gzip |
| Générateur du dialecte SQL actif | Sélection d'un dialecte (voir plus bas) | 3 chunks `dialect-*.js` (~1 kB chacun) + `generate-script-*.js` (8,7 kB / 3 kB gzip, moteur partagé) |
| Export PNG | Clic sur « Exporter en PNG » | `export-png-*.js` — 1 kB / 0,6 kB gzip |

L'export SVG reste en import direct (léger, pas de dépendance propre — voir
[diagram-export.md](diagram-export.md)) ; React et les autres dépendances du
socle applicatif (Zustand, Zod, `@xyflow/react`, shadcn/ui) restent dans le
chunk initial, nécessaires dès le premier rendu.

## Dialectes SQL : chargement par dialecte, pas par onglet

Ouvrir l'onglet SQL ne charge **que** le générateur du dialecte
actuellement sélectionné, pas les trois (`src/core/sql/registry.ts`,
`loadSqlDialect`) :

- `src/core/sql/dialect-labels.ts` expose un petit objet statique
  (`SQL_DIALECT_LABELS`, id → libellé) pour que le sélecteur et
  l'indicateur du panneau inférieur puissent afficher les noms de
  dialectes sans charger un seul générateur.
- `loadSqlDialect(id)` fait un `import()` dynamique, met le résultat en
  cache (`Map` module-scope — **jamais dans Zustand**, conformément à la
  consigne : le SQL généré reste une donnée dérivée, le module chargé
  n'est qu'un détail d'implémentation de ce calcul), et déduplique les
  chargements concurrents d'un même dialecte.
- `useSqlGeneration` (le hook consommé par `SqlPreviewPanel`) traverse un
  état `loading-dialect` bref pendant le chargement (affiché avec un
  spinner), et un état `dialect-load-error` dédié si l'`import()` échoue
  (message clair, plutôt qu'un écran blanc ou une exception non gérée).

Changer de dialecte une seconde fois dans la même session ne recharge
rien : le cache du registre sert immédiatement le résultat.

## Résultat mesuré

Chunk initial (`dist/assets/index-*.js`), avant/après cette tâche :

- **Avant** (juste après l'ajout des panneaux redimensionnables,
  v0.5 tâche précédente) : 896,31 kB / 275,88 kB gzip.
- **Après** (dialectes + panneaux MLD/SQL + export PNG différés) :
  849,63 kB / 261,95 kB gzip.
- **Fin v0.5** (après la barre de statut, l'aide de premier lancement et le
  reste des tâches v0.5, sans nouveau code-splitting depuis) :
  855,69 kB / 263,50 kB gzip — légère hausse attendue, portée par les
  fonctionnalités ajoutées (barre de statut, aide de premier lancement),
  pas une régression du découpage lui-même.

Une partie de la réduction du chunk principal correspond à une extraction
automatique de `project-store.ts` par Rollup dans son propre fichier
(26 kB) — un chunk **partagé** entre le code chargé immédiatement et les
panneaux différés, donc lui-même préchargé (`<link rel="modulepreload">`)
dès le premier rendu : ce n'est pas un gain réel, seulement une
réorganisation en fichiers séparés. Le gain honnête et réellement différé
tient aux chunks listés ci-dessus : environ 25 kB non compressés (~10 kB
gzip) de code SQL/MLD/export qui ne sont désormais téléchargés que si
l'utilisateur ouvre effectivement ces fonctionnalités pendant sa session.

## Grands modèles (~100 entités, ~150 associations, 250 nœuds)

Vérification non chronométrée scientifiquement, mais un contrôle explicite
de blocages évidents sur un modèle nettement au-dessus des projets réels
attendus. Fixture : `src/tests/fixtures/models.ts` (`largeModel()`),
utilisée à la fois par `e2e/large-model-performance.spec.ts` (parcours
navigateur complet) et `src/tests/fixtures/large-model-performance.test.ts`
(mesure du **cœur métier** seul, sans React).

**Moteur métier (validation, MCD → MLD, génération SQL) : aucun problème.**
Chacune des trois opérations s'exécute en ~5-10 ms sur ce modèle (mesuré
directement, pas seulement asserté sous un budget) — pas de dégradation
quadratique perceptible à cette échelle.

**Deux inefficacités réelles trouvées côté rendu, corrigées dans cette
tâche :**

- `toReactFlowNodes`/`toReactFlowEdges` (`src/features/diagram/adapters/to-react-flow.ts`)
  cherchaient l'entité/association correspondant à chaque nœud de diagramme
  via `Array.find` sur `model.entities`/`model.associations` — une boucle
  O(n²) à chaque recalcul (recalcul déclenché à *chaque* changement de
  position pendant un glisser-déposer). Remplacé par des `Map` construites
  une fois par appel.
- `InspectorPanel` s'abonnait à l'intégralité de `state.nodes` du store de
  diagramme pour retrouver le seul nœud sélectionné, ce qui le faisait se
  re-rendre (identifiants alternatifs compris) à **chaque** déplacement de
  **n'importe quel** nœud du diagramme, sélectionné ou non. Remplacé par
  deux sélecteurs Zustand ciblés sur le type et l'id-modèle du nœud
  sélectionné (des primitives stables tant que la sélection elle-même ne
  change pas), qui ne redéclenchent un rendu que si l'élément réellement
  affiché par l'inspecteur change.

**Limite résiduelle à la fin de la v0.5, résolue depuis :** glisser-déposer
un nœud sur ce modèle à 250 nœuds restait perceptiblement plus lent qu'un
modèle vide — 162 ms par événement de déplacement, contre 19 ms sur un
diagramme à 3 nœuds, soit un rapport de 8,7×. Le profilage a confirmé que
le temps était passé dans le rendu React Flow lui-même, pas dans le code de
Modrise (la chaîne store → adaptateurs coûtait 0,20 ms par événement, soit
0,1 % du total).

**La passe dédiée annoncée ici a été menée en v0.5.1** : la position
affichée pendant un glissement est désormais découplée de l'écriture dans
le store, et seules les arêtes touchant un nœud déplacé sont réexaminées.
Résultat mesuré : **24,7 ms par événement, rapport ramené à 1,3× — soit une
réduction de 85 %** de la durée totale d'un scénario de déplacement. Le
détail des mesures, des causes et de l'architecture retenue est dans
[canvas-performance.md](canvas-performance.md). Coût en poids de bundle :
+1,69 kB sur le chunk principal (855,69 → 857,38 kB ; 263,50 → 264,05 kB
gzip), sans dépendance ajoutée.

**Autres parcours vérifiés sans anomalie** sur ce modèle : import du
fichier, changement d'onglet Validation/MLD/SQL, organisation automatique
(dagre, ~1,2 s pour 250 nœuds), sauvegarde locale, export SVG — tous sous
la seconde à quelques secondes, sans blocage prolongé ni ré-exécution
visible en boucle.
