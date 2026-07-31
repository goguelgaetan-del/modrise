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
