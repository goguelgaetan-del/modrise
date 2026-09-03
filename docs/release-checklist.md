# Liste de contrôle de sortie

À dérouler avant de publier une version. Les points « bloquants » de la
v1.0 sont listés dans [roadmap.md](roadmap.md) ; ce document décrit le
déroulé opérationnel, pas les fonctionnalités attendues.

## 1. État du dépôt

- [ ] `git status` propre, aucune modification non commitée
- [ ] Aucune branche de travail non fusionnée destinée à la version
- [ ] `git log origin/main..HEAD` vide : rien ne reste en local
- [ ] Aucune PR ouverte censée faire partie de la version

## 2. Vérifications automatiques

Toutes doivent passer localement **et** sur GitHub Actions, sur `main` :

- [ ] `pnpm lint`
- [ ] `pnpm typecheck` (les deux projets TypeScript : `tsconfig.app.json`
      et `tsconfig.node.json`)
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build`
- [ ] `pnpm analyze` — relever la taille du chunk initial et la comparer à
      la version précédente ; toute hausse notable doit être expliquée

## 3. Vérifications fonctionnelles manuelles

Sur le projet d'exemple **et** sur un modèle importé :

- [ ] Création d'entités, d'attributs, d'associations, de cardinalités
- [ ] Identifiants primaires, composés, alternatifs, promotion
- [ ] Commentaires, menu contextuel, raccourcis clavier
- [ ] Annuler / rétablir sur une dizaine d'actions successives
- [ ] Presse-papiers, duplication, sélection multiple
- [ ] Organisation automatique, alignement, distribution, verrouillage
- [ ] Onglets Validation / MLD / SQL, les trois dialectes
- [ ] Export SVG, export PNG, export `.merise.json`, réimport
- [ ] Rechargement de la page : le projet est retrouvé à l'identique
- [ ] Interface tablette (< 1200 px), panneaux redimensionnables

## 4. Compatibilité du format

- [ ] Un fichier de chaque version de format encore supportée s'ouvre
      correctement (v1, v2, v3)
- [ ] La version courante du format est documentée dans
      [file-format.md](file-format.md)
- [ ] Toute évolution du format est accompagnée d'une migration et d'un
      test de migration

## 5. Performance

- [ ] `e2e/drag-performance.spec.ts` passe (rapport grand/petit modèle sous
      le seuil)
- [ ] `e2e/large-model-performance.spec.ts` passe
- [ ] Vérification manuelle sur un modèle de ~100 entités : import,
      déplacement, organisation automatique, export — voir
      [canvas-performance.md](canvas-performance.md)

## 6. Documentation

- [ ] `README.md` à jour (fonctionnalités, prise en main, limites)
- [ ] `docs/roadmap.md` reflète l'état réel du projet
- [ ] Toute nouveauté de la version a sa page ou sa section

## 7. Publication

Procédure détaillée : [deployment.md](deployment.md).

- [ ] Numéro de version décidé selon la politique de versionnage annoncée
      ([versioning.md](versioning.md)), reportée dans `package.json`
- [ ] `pnpm verify:static` passe — build sous-répertoire servi et parcouru
      dans Chromium, sans requête en échec ni erreur de console
- [ ] GitHub Pages activé avec la source **GitHub Actions** (une seule fois
      dans la vie du dépôt)
- [ ] CI et E2E **vertes sur `main`** avant de poser l'étiquette : le
      workflow de déploiement ne les rejoue pas et publierait quand même
- [ ] Étiquette Git posée sur le commit de `main` réellement testé
- [ ] Release GitHub créée, avec les notes de version
- [ ] Déploiement statique effectué, puis **vérifié dans un navigateur sur
      l'URL publique** avec `pnpm verify:static --url <url>` : l'application
      se charge, ouvre un exemple, sauvegarde, recharge, génère du SQL et
      fait l'aller-retour export/réimport d'un `.merise.json`, sans requête
      en échec ni erreur de console
- [ ] URL publique renseignée dans `About` du dépôt et dans `README.md`

## Règle

Aucune case ne se coche sur une intention. Une vérification non exécutée
est une case non cochée, et une case non cochée est un point à signaler
dans les notes de version.
