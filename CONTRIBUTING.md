# Contribuer à Modrise

Merci de votre intérêt pour Modrise !

## Démarrage

```bash
pnpm install
pnpm dev
```

## Avant d'ouvrir une pull request

Assurez-vous que ces commandes passent localement :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Et si votre changement touche l'interface :

```bash
pnpm exec playwright install chromium   # une seule fois
pnpm test:e2e
```

## Règles du projet

- **TypeScript strict** : pas de `any` non justifié, pas de `@ts-ignore` ni `@ts-nocheck`.
- **Le moteur métier reste pur** : rien dans `src/core` ne doit importer React, React Flow, Zustand ou Dexie. Les objets graphiques (positions, viewport) ne sont jamais la source de vérité métier.
- **Chaque règle métier est testée** : toute nouvelle règle de validation ou de transformation arrive avec ses tests Vitest.
- **Pas de fonctionnalité simulée** : un bouton inactif doit annoncer « Fonctionnalité prévue dans une prochaine version », jamais faire semblant.
- **Format de fichier** : toute évolution incompatible du format `.merise.json` incrémente `CURRENT_FORMAT_VERSION` et ajoute une migration testée (`src/core/migrations`).
- Formatage Prettier (`pnpm format`) et conventions ESLint du dépôt.

## Structure

Voir [docs/architecture.md](docs/architecture.md) pour la carte du code et les décisions structurantes.

## Signaler un bug

Ouvrez une issue avec : version, navigateur, étapes de reproduction et, si possible, un export `.merise.json` minimal reproduisant le problème.

## Licence

En contribuant, vous acceptez que votre contribution soit distribuée sous licence AGPL-3.0.
