# Roadmap

## v0.1 — Socle (en cours)

- [x] Création d'entités et d'attributs typés
- [x] Identifiants primaires simples ou composés
- [x] Création d'associations (binaires, n-aires, réflexives) et cardinalités
- [x] Attributs portés par une association, rôles de participation
- [x] Validation continue (erreurs + avertissements)
- [x] Sauvegarde locale automatique (IndexedDB) et rechargement du dernier projet
- [x] Import / export `.merise.json` validé
- [ ] Gestion complète des identifiants alternatifs dans l'inspecteur
- [ ] Nœuds de commentaire

## v0.2 — Modèle logique

- [ ] Transformation MCD → MLD (règles documentées dans
      [logical-transformation.md](logical-transformation.md))
- [ ] Affichage du modèle logique dans le panneau inférieur
- [ ] Tests exhaustifs par type d'association (1,N / N,N / 1,1 / réflexive / n-aire)

## v0.3 — SQL

- [ ] Générateur PostgreSQL
- [ ] Générateur MySQL / MariaDB
- [ ] Générateur SQLite
- [ ] Aperçu SQL avec coloration, copie et téléchargement `.sql`
- [ ] Tests snapshot des sorties SQL

## v0.4 — Expérience utilisateur

- [ ] Annuler / rétablir (une entrée par geste, pas par pixel)
- [ ] Copier-coller, duplication
- [ ] Raccourcis clavier complets
- [ ] Export PNG / SVG (diagramme entier, SVG vectoriel)
- [ ] Menu contextuel, panneaux redimensionnables

## v1.0 — Stabilisation

- [ ] Documentation complète
- [ ] Couverture de tests renforcée
- [ ] Exemples supplémentaires (e-commerce, bibliothèque…)
- [ ] Déploiement public (hébergement statique)
- [ ] Engagement de compatibilité durable du format de fichier

## Versions futures

- Application desktop Tauri
- Rétro-ingénierie SQL / import depuis une base existante
- Héritage Merise, MCT, diagrammes de flux
- Partage de projet, collaboration, historique cloud
- Extension Visual Studio Code
