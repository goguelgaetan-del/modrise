# Modrise

Modrise est un éditeur Merise moderne, gratuit et open source, utilisable directement dans le navigateur.

> Modrise est une implémentation indépendante et moderne d'un outil de modélisation Merise. Le projet n'est pas affilié au logiciel AnalyseSI.

Modrise permet de concevoir des modèles conceptuels de données (MCD), de générer automatiquement leur modèle logique (MLD) et de produire les scripts SQL correspondants — le tout sans backend, sans compte et sans base distante : les projets sont stockés localement dans le navigateur (IndexedDB).

## Objectifs

- Un éditeur Merise **local-first** : aucune donnée ne quitte le navigateur.
- Un **moteur métier pur** (TypeScript sans dépendance UI), réutilisable plus tard dans une CLI, une API, une application desktop Tauri ou une extension VS Code.
- Un **format de fichier ouvert et versionné** (`.merise.json`) avec migrations.
- Un vrai produit logiciel : typé strictement, testé, documenté, évolutif.

## Fonctionnalités disponibles (v0.1 → v0.3.2)

- Création graphique d'entités et d'associations (React Flow).
- Attributs typés (integer, bigint, decimal, varchar, text, boolean, date, datetime, uuid) avec obligatoire / unique.
- Identifiants primaires simples ou composés (icône clé dans le diagramme).
- Participations créées en traçant un lien entité ↔ association, cardinalités Merise (0,1 / 1,1 / 0,N / 1,N) et rôles.
- Associations binaires, n-aires et réflexives ; attributs portés par une association.
- Validation en continu (erreurs et avertissements Merise/SQL) avec sélection et recentrage de l'élément concerné.
- **Transformation MCD → MLD** (onglet « MLD ») : entités → tables, identifiants simples/composés/alternatifs → clés primaires/contraintes uniques, associations 1,N / N,N / 1,1 / réflexives / n-aires → clés étrangères ou tables associatives, nommage déterministe avec résolution de collisions. Recalculée automatiquement à chaque modification du MCD ; bloquée tant que le MCD contient des erreurs. Voir [docs/logical-transformation.md](docs/logical-transformation.md).
- **Génération SQL multi-dialecte** (onglet « SQL »), avec sélecteur fonctionnel : **PostgreSQL**, **MySQL/MariaDB** et **SQLite**. `CREATE TABLE`, clés primaires/uniques/étrangères simples ou composées, ordre déterministe, aperçu avec copie et téléchargement `.sql` (nom adapté au dialecte). Recalculée automatiquement à chaque modification du MCD, du MLD ou du dialecte choisi ; le dialecte sélectionné est persisté dans le projet et conservé à l'import/export. Voir [docs/postgresql-generation.md](docs/postgresql-generation.md), [docs/mysql-generation.md](docs/mysql-generation.md) et [docs/sqlite-generation.md](docs/sqlite-generation.md).
- Suppression protégée : une entité référencée n'est jamais supprimée silencieusement.
- Sauvegarde automatique dans IndexedDB (statut affiché), rechargement du dernier projet.
- Import / export `.merise.json` validé par Zod, avec messages d'erreur clairs.
- Projet d'exemple « Gestion d'hôtel », thème clair / sombre, raccourcis de base (Ctrl+S, Suppr, Échap, F).

## Fonctionnalités prévues

- v0.4 : annuler/rétablir, copier-coller, duplication, export PNG/SVG — expérience d'édition.
- Ensuite : application desktop Tauri, rétro-ingénierie SQL, héritage Merise, MCT, collaboration… (voir [docs/roadmap.md](docs/roadmap.md)).

L'interface annonce explicitement les fonctionnalités non disponibles (« Fonctionnalité prévue dans une prochaine version ») : rien n'est simulé.

## Installation et lancement

Prérequis : [Node.js](https://nodejs.org) ≥ 20 et [pnpm](https://pnpm.io) ≥ 9.

```bash
pnpm install
pnpm dev
```

Puis ouvrez l'URL affichée (par défaut http://localhost:5173).

## Commandes

```bash
pnpm install      # installer les dépendances
pnpm dev          # serveur de développement
pnpm build        # build de production (typecheck inclus)
pnpm lint         # ESLint
pnpm typecheck    # vérification TypeScript
pnpm test         # tests unitaires (Vitest)
pnpm test:e2e     # tests de bout en bout (Playwright)
pnpm format       # formatage Prettier
```

Pour les tests e2e, installez d'abord le navigateur : `pnpm exec playwright install chromium`.

## Architecture générale

```text
src/
├── core/          # Moteur métier pur : modèle conceptuel, validation,
│                  # modèle logique, transformations, SQL, sérialisation,
│                  # migrations. Aucune dépendance à React / React Flow / Zustand.
├── stores/        # État applicatif (Zustand + Immer) : projet, diagramme,
│                  # historique, interface.
├── persistence/   # IndexedDB via Dexie : base, repository, autosauvegarde.
├── features/      # Fonctionnalités UI : diagramme (nœuds, arêtes, adaptateurs
│                  # React Flow), entités, associations, validation, projets.
├── components/    # Layout, composants communs et shadcn/ui.
└── app/           # Composition de l'application.
```

Principe central : **le modèle métier est la source de vérité**. React Flow n'est qu'une couche de rendu ; les positions graphiques (`DiagramModel`) sont séparées des données conceptuelles (`ConceptualModel`). Détails dans [docs/architecture.md](docs/architecture.md).

## Format de fichier

Les projets s'exportent en `.merise.json`, format JSON versionné (`formatVersion`) avec pipeline d'import : lecture sans confiance → migration → validation Zod → chargement. Voir [docs/file-format.md](docs/file-format.md). Un exemple complet est fourni dans [examples/gestion-hotel.merise.json](examples/gestion-hotel.merise.json).

## Contribution

Les contributions sont bienvenues — voir [CONTRIBUTING.md](CONTRIBUTING.md). La CI (GitHub Actions) exécute lint, typecheck, tests unitaires et build sur chaque push et pull request, plus un workflow Playwright séparé.

## Licence

Modrise est distribué sous licence [AGPL-3.0](LICENSE).

## Roadmap

Voir [docs/roadmap.md](docs/roadmap.md).
