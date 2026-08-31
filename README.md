# Modrise

Modrise est un éditeur Merise moderne, gratuit et open source, utilisable directement dans le navigateur.

> Modrise est une implémentation indépendante et moderne d'un outil de modélisation Merise. Le projet n'est pas affilié au logiciel AnalyseSI.

Modrise permet de concevoir des modèles conceptuels de données (MCD), de générer automatiquement leur modèle logique (MLD) et de produire les scripts SQL correspondants — le tout sans backend, sans compte et sans base distante : les projets sont stockés localement dans le navigateur (IndexedDB).

## Objectifs

- Un éditeur Merise **local-first** : aucune donnée ne quitte le navigateur.
- Un **moteur métier pur** (TypeScript sans dépendance UI), réutilisable plus tard dans une CLI, une API, une application desktop Tauri ou une extension VS Code.
- Un **format de fichier ouvert et versionné** (`.merise.json`) avec migrations.
- Un vrai produit logiciel : typé strictement, testé, documenté, évolutif.

## Fonctionnalités disponibles (v0.1 → v0.5)

- Création graphique d'entités et d'associations (React Flow).
- Attributs typés (integer, bigint, decimal, varchar, text, boolean, date, datetime, uuid) avec obligatoire / unique.
- **Identifiants alternatifs et composés** : éditeur complet dans l'inspecteur d'entité (créer, renommer, réordonner/retirer des attributs, promouvoir en primaire, supprimer), distinction visuelle icône + libellé entre clé primaire, identifiant alternatif et attribut simplement unique (jamais la seule couleur). Voir [docs/identifiers.md](docs/identifiers.md).
- Participations créées en traçant un lien entité ↔ association, cardinalités Merise (0,1 / 1,1 / 0,N / 1,N) et rôles.
- Associations binaires, n-aires et réflexives ; attributs portés par une association.
- Validation en continu (erreurs et avertissements Merise/SQL) avec sélection et recentrage de l'élément concerné.
- **Transformation MCD → MLD** (onglet « MLD ») : entités → tables, identifiants simples/composés/alternatifs → clés primaires/contraintes uniques, associations 1,N / N,N / 1,1 / réflexives / n-aires → clés étrangères ou tables associatives, nommage déterministe avec résolution de collisions. Recalculée automatiquement à chaque modification du MCD ; bloquée tant que le MCD contient des erreurs. Voir [docs/logical-transformation.md](docs/logical-transformation.md).
- **Génération SQL multi-dialecte** (onglet « SQL »), avec sélecteur fonctionnel : **PostgreSQL**, **MySQL/MariaDB** et **SQLite**. `CREATE TABLE`, clés primaires/uniques/étrangères simples ou composées, ordre déterministe, aperçu avec copie et téléchargement `.sql` (nom adapté au dialecte). Recalculée automatiquement à chaque modification du MCD, du MLD ou du dialecte choisi ; le dialecte sélectionné est persisté dans le projet et conservé à l'import/export. Voir [docs/postgresql-generation.md](docs/postgresql-generation.md), [docs/mysql-generation.md](docs/mysql-generation.md) et [docs/sqlite-generation.md](docs/sqlite-generation.md).
- Suppression protégée : une entité référencée n'est jamais supprimée silencieusement (suppression simple ou groupée).
- Sauvegarde automatique dans IndexedDB (statut affiché), rechargement du dernier projet.
- Import / export `.merise.json` validé par Zod, avec messages d'erreur clairs.
- Projet d'exemple « Gestion d'hôtel », thème clair / sombre.
- **Annuler / rétablir** (une entrée par geste, jamais par pixel ou par frappe) avec libellé de l'action affiché sur les boutons de la barre supérieure. Voir [docs/editor-history.md](docs/editor-history.md).
- **Presse-papiers interne** : copier / coller / dupliquer une sélection (entités, associations, commentaires), avec remappage complet des identifiants et décalage croissant à chaque collage. Voir [docs/clipboard.md](docs/clipboard.md).
- **Sélection multiple** (rectangle ou Shift-clic) avec déplacement, suppression, duplication et copie groupés.
- **Commentaires graphiques** : notes purement visuelles sur le canevas, jamais dans le modèle conceptuel.
- **Menu contextuel** (clic droit) sur le canevas vide, une entité, une association ou un commentaire.
- **Export SVG et PNG** du diagramme entier — le SVG reste réellement vectoriel (généré depuis le modèle, pas une capture d'écran) ; le PNG en est une rastérisation haute résolution. Voir [docs/diagram-export.md](docs/diagram-export.md).
- **Raccourcis clavier complets** : Ctrl/Cmd+Z / Maj+Z / Y (annuler/rétablir), Ctrl/Cmd+C/V/D/A (presse-papiers, tout sélectionner), Ctrl/Cmd+S/O/N (sauvegarder, importer, nouveau projet), Suppr/Retour, Échap, F (centrer) — tous ignorés dans un champ de saisie.
- **Garde-fou de fermeture d'onglet** : avertissement uniquement s'il existe de vraies modifications non enregistrées.
- **Organisation automatique du diagramme** (bouton « Organiser automatiquement », horizontal/vertical) : disposition déterministe via dagre, chargé à la demande, annulable en une seule action. Voir [docs/auto-layout.md](docs/auto-layout.md).
- **Alignement et distribution** de la sélection multiple (6 alignements, distribution horizontale/verticale à partir de 3 éléments), depuis l'inspecteur.
- **Verrouillage de nœuds** : un nœud verrouillé reste sélectionnable et éditable, mais n'est jamais déplacé — ni par glisser-déposer, ni par l'organisation automatique.
- **Panneaux redimensionnables** (bibliothèque, inspecteur, panneau inférieur), tailles persistées localement, réinitialisables par double-clic sur une séparation ; **interface tablette** (< 1200px) avec tiroirs non modaux, et message non bloquant sous 768px. Voir [docs/responsive-layout.md](docs/responsive-layout.md).
- **Navigation clavier entre problèmes de validation** (F8 / Maj+F8) : sélectionne, recentre et ouvre l'inspecteur sur le problème suivant/précédent.
- **Barre de statut** compacte (entités, associations, commentaires, erreurs, dialecte SQL, zoom, statut d'enregistrement) et **aide de premier lancement** (4 étapes, refermable définitivement).
- **Chargement différé** des dialectes SQL, des panneaux MLD/SQL, de l'export PNG et de la bibliothèque d'auto-layout (code-splitting) pour un chargement initial plus léger. Voir [docs/performance.md](docs/performance.md).
- **Déplacement fluide sur les grands diagrammes** : pendant un glisser-déposer, les positions vivent dans un état transitoire et ne sont écrites qu'au relâchement — une seule modification du projet, une seule entrée d'historique, une seule sauvegarde, aucun recalcul du MLD ni du SQL. Sur un modèle de 100 entités / 150 associations (250 nœuds), le coût d'un événement de déplacement passe de 162 ms à 25 ms (−85 %). Voir [docs/canvas-performance.md](docs/canvas-performance.md).

## Fonctionnalités prévues

- Application desktop Tauri, rétro-ingénierie SQL, héritage Merise, MCT, diagrammes de flux, collaboration… (voir [docs/roadmap.md](docs/roadmap.md)).

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
pnpm analyze      # build avec analyse de la taille des chunks (docs/performance.md)
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
│                  # historique (annuler/rétablir), presse-papiers, interface.
├── persistence/   # IndexedDB via Dexie : base, repository, autosauvegarde.
├── features/      # Fonctionnalités UI : diagramme (nœuds, arêtes, adaptateurs
│                  # React Flow), entités, associations, validation, projets.
├── components/    # Layout, composants communs et shadcn/ui.
└── app/           # Composition de l'application.
```

Principe central : **le modèle métier est la source de vérité**. React Flow n'est qu'une couche de rendu ; les positions graphiques (`DiagramModel`) sont séparées des données conceptuelles (`ConceptualModel`). Détails dans [docs/architecture.md](docs/architecture.md).

## Format de fichier

Les projets s'exportent en `.merise.json`, format JSON versionné (`formatVersion`, actuellement 3) avec pipeline d'import : lecture sans confiance → migration → validation Zod → chargement. Un fichier v1 (avant les commentaires graphiques du v0.4) ou v2 (avant le verrouillage de nœuds du v0.5) s'importe et se migre normalement, en chaînant les migrations nécessaires. Voir [docs/file-format.md](docs/file-format.md) et, pour ce qu'engage un numéro de version, [docs/versioning.md](docs/versioning.md). Un exemple complet est fourni dans [examples/gestion-hotel.merise.json](examples/gestion-hotel.merise.json).

## Contribution

Les contributions sont bienvenues — voir [CONTRIBUTING.md](CONTRIBUTING.md). La CI (GitHub Actions) exécute lint, typecheck, tests unitaires et build sur chaque push et pull request, plus un workflow Playwright séparé.

## Licence

Modrise est distribué sous licence [AGPL-3.0](LICENSE).

## Roadmap

Voir [docs/roadmap.md](docs/roadmap.md).
