# Architecture de Modrise

## Principe directeur

Modrise sépare strictement sept responsabilités :

1. **le modèle métier Merise** (`src/core/conceptual-model`) ;
2. **le modèle graphique** (`src/core/diagram`) ;
3. **le moteur de validation** (`src/core/validation`) ;
4. **le moteur de transformation MCD → MLD** (`src/core/transformations`, v0.2) ;
5. **les générateurs SQL** (`src/core/sql`, v0.3) ;
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
│   ├── diagram/            # DiagramModel : nœuds (positions), viewport
│   ├── project/            # ModriseProject, ProjectSettings, fabrique
│   ├── validation/         # validateConceptualModel + codes de règles
│   ├── logical-model/      # LogicalModel (tables, colonnes, FK, contraintes)
│   ├── transformations/    # transformToLogicalModel (TODO v0.2, règles documentées)
│   ├── sql/                # interface SqlDialect (impl. v0.3), nommage SQL,
│   │                       # mots réservés
│   ├── serialization/      # format .merise.json : serialize / parse (Zod)
│   ├── migrations/         # ProjectMigration + applyMigrations
│   ├── examples/           # projet d'exemple « Gestion d'hôtel »
│   └── id.ts               # génération d'identifiants
├── stores/                 # Zustand + Immer
│   ├── project-store.ts    # identité du projet, modèle conceptuel, paramètres
│   ├── diagram-store.ts    # positions, viewport, sélection (non persistée)
│   ├── history-store.ts    # annuler/rétablir (TODO v0.4)
│   ├── ui-store.ts         # thème, panneaux, statut de sauvegarde, notifications
│   └── project-assembly.ts # assemblage stores ⇄ ModriseProject
├── persistence/
│   ├── database.ts         # Dexie : tables projects + settings
│   ├── project-repository.ts # CRUD ; relecture validée par Zod
│   └── autosave.ts         # sauvegarde debouncée + statut
├── features/
│   ├── diagram/            # canvas React Flow, EntityNode, AssociationNode,
│   │                       # ParticipationEdge, adaptateurs, suppression protégée
│   ├── entities/           # inspecteur d'entité
│   ├── associations/       # inspecteur d'association
│   ├── validation/         # panneau de validation, ancrage des problèmes
│   └── projects/           # import / export de fichiers
├── components/
│   ├── layout/             # TopBar, SidebarLeft, InspectorPanel, BottomPanel
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
- **Fonctionnalités à venir affichées honnêtement** : MLD, SQL, undo/redo et
  commentaires sont présentés comme « Fonctionnalité prévue dans une prochaine
  version », jamais simulés.

## Extraction future en packages

Les modules de `src/core` n'utilisent que des imports relatifs entre eux et
`zod` comme unique dépendance externe : ils peuvent être déplacés vers des
packages (`@modrise/core`, `@modrise/sql`…) sans réécriture.
