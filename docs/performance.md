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

**Limite résiduelle, non résolue ici :** glisser-déposer un nœud sur ce
modèle à 250 nœuds reste perceptiblement plus lent qu'un modèle vide (de
l'ordre de la seconde pour quelques pas de déplacement, contre quelques
dizaines de millisecondes à vide, mesuré via Playwright). Les deux
correctifs ci-dessus n'ont réduit ce coût que marginalement ; un profilage
CPU sommaire montre du temps passé dans le rendu React Flow lui-même
(mesures de dimensions, reconstruction du tableau d'arêtes complet à
chaque pas de déplacement) plutôt que dans le code de Modrise. Une
optimisation plus profonde (ne recalculer que les arêtes touchant le nœud
déplacé, découpler la position affichée pendant le glisser de l'écriture
immédiate dans le store) est un candidat naturel pour une prochaine passe
dédiée, mais dépasse le cadre d'un contrôle de non-régression. Aucun
blocage bloquant l'usage n'a été observé (pas de gel, pas de timeout) —
seulement une latence perceptible sur cette taille de modèle largement
supérieure aux projets réels visés par l'outil.

**Autres parcours vérifiés sans anomalie** sur ce modèle : import du
fichier, changement d'onglet Validation/MLD/SQL, organisation automatique
(dagre, ~1,2 s pour 250 nœuds), sauvegarde locale, export SVG — tous sous
la seconde à quelques secondes, sans blocage prolongé ni ré-exécution
visible en boucle.
