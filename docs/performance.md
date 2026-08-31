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
[canvas-performance.md](canvas-performance.md). Le coût en poids de bundle
de l'ensemble de la v0.5.1 est détaillé dans la section suivante.

**Autres parcours vérifiés sans anomalie** sur ce modèle : import du
fichier, changement d'onglet Validation/MLD/SQL, organisation automatique
(dagre, ~1,2 s pour 250 nœuds), sauvegarde locale, export SVG — tous sous
la seconde à quelques secondes, sans blocage prolongé ni ré-exécution
visible en boucle.

## Analyse du chunk initial (`pnpm analyze`, v0.5.1)

`pnpm analyze` (`ANALYZE=1 vite build`) produit `dist/bundle-analysis.html`
via `rollup-plugin-visualizer`. Le plugin n'est chargé que sous
`ANALYZE=1` : il n'entre jamais dans un build normal.

### Poids des chunks émis (build de production, fin v0.5.1)

| Chunk | Taille | gzip | Chargement |
| --- | --- | --- | --- |
| `index-*.js` | 860,18 kB | 264,98 kB | immédiat |
| `index-*.css` | 83,41 kB | 14,17 kB | immédiat |
| `project-store-*.js` | 23,77 kB | 8,32 kB | immédiat (partagé, `modulepreload`) |
| `dagre.esm-*.js` | 39,53 kB | 13,42 kB | à la demande |
| `generate-script-*.js` | 8,65 kB | 3,00 kB | à la demande |
| `SqlPreviewPanel-*.js` | 6,81 kB | 2,52 kB | à la demande |
| `LogicalModelPanel-*.js` | 3,79 kB | 1,49 kB | à la demande |
| `types-*.js` | 2,39 kB | 1,22 kB | à la demande |
| `data-types-*.js` | 1,42 kB | 0,59 kB | à la demande |
| `dialect-*.js` (×3) | ~1 kB chacun | ~0,5 kB | à la demande |
| `export-png-*.js` | 1,03 kB | 0,64 kB | à la demande |
| `quoting-*.js` | 0,07 kB | 0,08 kB | à la demande |
| polices Geist (5 `.woff2`) | 76,41 kB | — | à la demande (`unicode-range`) |

### Ce qui compose réellement les 860 kB

Agrégation des modules du rapport par paquet d'origine (taille rendue,
avant compression) :

| Origine | Poids rendu |
| --- | --- |
| `react-dom` | 449,2 kB |
| `@xyflow/react` + `@xyflow/system` | 231,4 kB |
| `dexie` | 129,5 kB |
| `zod` | 123,3 kB |
| `tailwind-merge` | 54,6 kB |
| `@dagrejs/dagre` | 51,4 kB |
| `react-resizable-panels` | 45,2 kB |
| `@radix-ui/*` (select, scroll-area, menu, tooltip…) | ~110 kB |
| `d3-selection` + `d3-transition` | 50,5 kB |
| `lucide-react` | 29,7 kB |
| **Code applicatif Modrise** (`src/**`) | **~190 kB** |

Conclusion honnête : **le chunk initial est dominé par le runtime tiers,
pas par Modrise.** Le code applicatif représente environ un cinquième du
total, et le noyau métier (`src/core/**` : SQL, transformations,
sérialisation, validation) moins de 60 kB. Réduire significativement les
860 kB supposerait de différer React Flow ou Dexie derrière l'écran
d'accueil, pas de découper davantage le code de Modrise — arbitrage non
retenu ici : les deux sont nécessaires dès le premier rendu utile.

### Coût cumulé de la v0.5.1

Chaque étape a été mesurée sur un build réel, pas estimée :

| Étape | Chunk initial | gzip | Δ |
| --- | --- | --- | --- |
| Fin v0.5 (référence) | 855,69 kB | 263,50 kB | — |
| Transaction de déplacement transitoire | 857,38 kB | 264,05 kB | +1,69 kB |
| Instrumentation + panneau de diagnostic | 858,32 kB | 264,41 kB | +0,78 kB |
| Barrière d'erreur React | 860,61 kB | 265,10 kB | +2,29 kB |
| Barrière d'erreur en imports statiques | 860,18 kB | 264,98 kB | −0,43 kB |
| **Total v0.5.1** | **860,18 kB** | **264,98 kB** | **+4,49 kB (+1,48 kB gzip)** |

**Aucune dépendance n'a été ajoutée** pendant la v0.5.1 : ni bibliothèque
de gestion d'état, ni bibliothèque de performance, ni outil de mesure.
`package.json` est inchangé. L'augmentation de 1,48 kB gzip (+0,56 %)
correspond entièrement à du code applicatif écrit pour cette version.

### Imports dynamiques inefficaces : diagnostic et correction

Le build a un temps signalé deux `INEFFECTIVE_DYNAMIC_IMPORT` visant
`src/app/ErrorBoundary.tsx`. Le rapport d'analyse a confirmé le
diagnostic : `project-assembly` est déjà importé statiquement par `App`,
`TopBar` et `autosave`, et `import-export` par `TopBar` — les deux modules
sont donc dans le chunk initial quoi qu'il arrive, et l'`import()` de la
barrière ne déplaçait rien.

Ces imports sont repassés en statiques. Le gain n'est pas seulement
cosmétique : le sauvetage du projet ne dépend plus d'une résolution de
module effectuée *après* le plantage, ce qui est précisément le moment où
l'on veut le moins de dépendances possible. Le build a d'ailleurs légèrement
maigri (−0,43 kB), la machinerie d'import dynamique disparaissant avec eux.
Le build de production ne signale plus aucun import dynamique inefficace.
