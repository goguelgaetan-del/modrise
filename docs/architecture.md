# Architecture de Modrise

## Principe directeur

Modrise sépare strictement sept responsabilités :

1. **le modèle métier Merise** (`src/core/conceptual-model`) ;
2. **le modèle graphique** (`src/core/diagram`) ;
3. **le moteur de validation** (`src/core/validation`) ;
4. **le moteur de transformation MCD → MLD** (`src/core/transformations`, v0.2) ;
5. **les générateurs SQL** (`src/core/sql`, PostgreSQL/MySQL/SQLite en v0.3.2) ;
6. **la persistance locale** (`src/persistence`) ;
7. **l'interface React** (`src/app`, `src/components`, `src/features`, `src/stores`).

Règle intangible : **rien dans `src/core` n'importe React, React Flow, Zustand ou Dexie.** Le moteur métier est constitué de types et de fonctions pures, testables sans interface, et pourra être extrait plus tard en packages indépendants (CLI, API, Tauri, extension VS Code).

## Carte du code

```text
src/
├── core/
│   ├── conceptual-model/   # Entity, Attribute, Identifier, Association,
│   │                       # Participation, Cardinality + schémas Zod,
│   │                       # fabriques et opérations pures
│   ├── diagram/            # DiagramModel : nœuds (positions, verrouillage
│   │                       # v0.5), viewport, commentaires (v0.4) ;
│   │                       # drag-transaction.ts : état transitoire d'un
│   │                       # déplacement en cours (v0.5.1, voir
│   │                       # docs/canvas-performance.md) ;
│   │                       # geometry.ts (centre/bord d'un nœud), bounds.ts
│   │                       # (rectangle englobant), align.ts (alignement/
│   │                       # distribution purs, v0.5)
│   ├── project/            # ModriseProject, ProjectSettings, fabrique
│   ├── validation/         # validateConceptualModel + codes de règles
│   ├── logical-model/      # LogicalModel (tables, colonnes, FK, contraintes)
│   ├── transformations/    # transformToLogicalModel : entités, 1,N, 1,1,
│   │                       # N,N/n-aire, nommage déterministe (voir
│   │                       # docs/logical-transformation.md)
│   ├── sql/                # interface SqlDialect (dialect.ts) + registre à
│   │   │                   # chargement dynamique (registry.ts,
│   │   │                   # dialect-labels.ts, v0.5)
│   │   ├── shared/         # moteur de génération mutualisé : validation,
│   │   │                   # registre de contraintes, échappement générique,
│   │   │                   # assemblage du script (generate-script.ts)
│   │   ├── postgresql/     # dialecte PostgreSQL : échappement, types,
│   │   │                   # DialectSyntax (ALTER TABLE par défaut)
│   │   ├── mysql/          # dialecte MySQL/MariaDB (accents graves,
│   │   │                   # FOREIGN_KEY_CHECKS)
│   │   ├── sqlite/         # dialecte SQLite (FK inline imposé, PRAGMA
│   │   │                   # foreign_keys)
│   │   ├── naming.ts       # nommage conceptuel → identifiants physiques
│   │   └── reserved-words.ts
│   ├── serialization/      # format .merise.json : serialize / parse (Zod)
│   ├── migrations/         # ProjectMigration + applyMigrations
│   ├── export/             # to-svg.ts : rendu SVG vectoriel pur du
│   │                       # diagramme (v0.4, voir docs/diagram-export.md)
│   ├── examples/           # projet d'exemple « Gestion d'hôtel »
│   └── id.ts               # génération d'identifiants
├── stores/                 # Zustand + Immer
│   ├── project-store.ts    # identité du projet, modèle conceptuel, paramètres
│   ├── diagram-store.ts    # positions, viewport, commentaires, sélection
│   │                       # (sélection non persistée), verrouillage de
│   │                       # nœuds (v0.5 — `moveNode` ignore un nœud
│   │                       # verrouillé) ; `moveNodes` applique un
│   │                       # déplacement groupé en une seule notification
│   │                       # (v0.5.1)
│   ├── history-store.ts    # annuler/rétablir (v0.4, voir
│   │                       # docs/editor-history.md)
│   ├── clipboard-store.ts  # presse-papiers interne (v0.4, voir
│   │                       # docs/clipboard.md)
│   ├── ui-store.ts         # thème, panneaux, statut de sauvegarde, notifications
│   └── project-assembly.ts # assemblage stores ⇄ ModriseProject
├── persistence/
│   ├── database.ts         # Dexie : tables projects + settings
│   ├── project-repository.ts # CRUD ; relecture validée par Zod
│   ├── autosave.ts         # sauvegarde debouncée + statut
│   └── unsaved-changes-guard.ts # garde-fou beforeunload (v0.4)
├── features/
│   ├── diagram/            # canvas React Flow, EntityNode, AssociationNode,
│   │                       # CommentNode, ParticipationEdge, adaptateurs,
│   │                       # menu contextuel, raccourcis clavier, suppression
│   │                       # protégée (simple ou groupée), export/,
│   │                       # OnboardingHelp (v0.5) ; layout/ : auto-layout.ts
│   │                       # (dagre, chargé dynamiquement) et
│   │                       # alignment-actions.ts (v0.5)
│   ├── history/            # withHistory, useFieldHistory (v0.4, voir
│   │                       # docs/editor-history.md)
│   ├── clipboard/          # logique pure de copier/coller/dupliquer (v0.4,
│   │                       # voir docs/clipboard.md)
│   ├── entities/           # inspecteur d'entité, IdentifiersEditor (v0.5,
│   │                       # voir docs/identifiers.md)
│   ├── associations/       # inspecteur d'association
│   ├── validation/         # panneau de validation, ancrage des problèmes,
│   │                       # navigation F8/Maj+F8 (v0.5)
│   ├── logical-model/      # useLogicalModel (hook dérivé mémoïsé), panneau MLD
│   ├── sql-preview/        # useSqlGeneration, panneau SQL (sélecteur de
│   │                       # dialecte, aperçu, copier, télécharger)
│   ├── projects/           # import / export de fichiers, nouveau projet
│   └── diagnostics/        # PerformanceDebugPanel (développement seul,
│                           # ?debugPerformance=1, v0.5.1)
├── lib/                    # use-media-query.ts (points de rupture
│                           # responsive, v0.5, voir docs/responsive-layout.md) ;
│                           # performance/diagnostics.ts (instrumentation
│                           # locale de développement, v0.5.1, voir
│                           # docs/canvas-performance.md)
├── components/
│   ├── layout/             # TopBar, SidebarLeft, InspectorPanel, BottomPanel,
│   │                       # StatusBar (v0.5), InspectorDrawer et
│   │                       # NarrowScreenNotice (tablette, v0.5) — panneaux
│   │                       # redimensionnables via react-resizable-panels
│   ├── common/             # éditeurs partagés, notifications
│   └── ui/                 # composants shadcn/ui générés
└── app/                    # App, providers (React Flow, tooltips, thème)
```

## Flux de données

```text
        actions utilisateur (canvas, inspecteur, barre supérieure)
                              │
                              ▼
                stores Zustand (project / diagram)
                    │                      │
       dérivation mémoïsée          abonnement debouncé
                    │                      │
                    ▼                      ▼
      nœuds/arêtes React Flow      autosave → Dexie (IndexedDB)
      (couche de rendu uniquement)
```

- Les nœuds et arêtes React Flow sont **recalculés** depuis les stores par les
  adaptateurs (`features/diagram/adapters`) ; ils ne sont jamais une source de
  vérité. Les interactions (déplacement, sélection, connexion) sont retraduites
  en actions de store.
- Une connexion tracée entre une entité et une association crée une
  **participation** dans le modèle conceptuel ; toute autre connexion est
  refusée avec une notification explicative.
- La validation est recalculée de manière mémoïsée à chaque changement du
  modèle conceptuel et alimente à la fois le panneau de validation et la mise
  en évidence des nœuds/arêtes en erreur.
- Le **modèle logique (MLD)** est une **vue dérivée**, jamais une seconde
  source de vérité : `useLogicalModel` recalcule `transformToLogicalModel`
  via `useMemo` à chaque changement du modèle conceptuel ou de la convention
  de nommage, et n'est stocké dans aucun store. La transformation appelle le
  moteur de validation existant et refuse de produire un MLD tant que le MCD
  contient des erreurs bloquantes ; le panneau MLD redirige alors vers
  l'onglet de validation plutôt que de dupliquer les règles.
- Le **SQL** suit le même principe de vue dérivée : `useSqlGeneration`
  mémoïse `getSqlDialect(project.settings.sqlDialect).generate(logicalModel,
options)` (pipeline complet `ConceptualModel → Validation → LogicalModel →
SqlDialect sélectionné → SQL`) et n'est jamais persisté. Chaque dialecte
  revalide défensivement la structure du modèle logique avant de produire
  quoi que ce soit et ne lève jamais d'exception (voir
  docs/postgresql-generation.md, docs/mysql-generation.md,
  docs/sqlite-generation.md). Le dialecte choisi, lui, est persisté
  (`ProjectSettings.sqlDialect`, sérialisé dans `.merise.json`) : c'est un
  paramètre du projet, pas une donnée dérivée.

## Décisions structurantes

- **`src/core/project`** (absent de l'arborescence initialement proposée) :
  `ModriseProject` est partagé par la sérialisation, la persistance et les
  stores sans appartenir au modèle conceptuel ni au diagramme ; il a donc son
  propre module.
- **Sélection non persistée** : la sélection vit dans le store diagramme
  (état d'interaction) mais est exclue du document sauvegardé
  (`selectPersistedDiagram`).
- **Suppression protégée** : la suppression d'une entité référencée passe par
  une confirmation listant les associations impactées ; la cascade retire les
  participations, jamais silencieusement.
- **Import sans confiance** : fichiers importés et documents IndexedDB suivent
  le même pipeline parse → migration → validation Zod.
- **Fonctionnalités à venir affichées honnêtement** : toute fonctionnalité
  non implémentée est présentée comme « Fonctionnalité prévue dans une
  prochaine version » (seul le bouton Paramètres l'est encore en v0.4),
  jamais simulée.
- **Historique par instantanés, pas par commandes inverses** : l'annuler/
  rétablir (v0.4) compare des instantanés structurés du modèle et du
  diagramme plutôt que d'enregistrer une commande et son inverse par action
  — voir [editor-history.md](editor-history.md).
- **Presse-papiers interne, jamais système** : copier/coller/dupliquer (v0.4)
  passent par un presse-papiers propre à Modrise avec remappage complet des
  identifiants, sans jamais toucher au presse-papiers du système
  d'exploitation — voir [clipboard.md](clipboard.md).
- **Export vectoriel, pas une capture d'écran** : l'export SVG (v0.4) est un
  document généré depuis le modèle par une fonction pure du noyau, et
  l'export PNG rastérise ce même document — jamais une capture du DOM React
  Flow — voir [diagram-export.md](diagram-export.md).
- **Nommage déterministe et sans aléatoire** : la transformation MCD → MLD ne
  génère aucun id ni nom aléatoire ; `LogicalNameRegistry` résout les
  collisions par suffixe numérique stable et signale chaque résolution par un
  avertissement (jamais silencieuse).

## Extraction future en packages

Les modules de `src/core` n'utilisent que des imports relatifs entre eux et
`zod` comme unique dépendance externe : ils peuvent être déplacés vers des
packages (`@modrise/core`, `@modrise/sql`…) sans réécriture.
