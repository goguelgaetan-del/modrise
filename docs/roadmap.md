# Roadmap

## v0.1 — Socle (terminé)

- [x] Création d'entités et d'attributs typés
- [x] Identifiants primaires simples ou composés
- [x] Création d'associations (binaires, n-aires, réflexives) et cardinalités
- [x] Attributs portés par une association, rôles de participation
- [x] Validation continue (erreurs + avertissements)
- [x] Sauvegarde locale automatique (IndexedDB) et rechargement du dernier projet
- [x] Import / export `.merise.json` validé
- [x] Gestion complète des identifiants alternatifs dans l'inspecteur (livré
      en v0.5, voir plus bas)
- [x] Nœuds de commentaire (livré en v0.4)

## v0.2 — Modèle logique (terminé)

- [x] Transformation MCD → MLD (règles documentées dans
      [logical-transformation.md](logical-transformation.md)) : entités,
      identifiants simples/composés/alternatifs, 1,N, N,N, 1,1, réflexif,
      n-aire, nommage déterministe avec résolution de collisions
- [x] Affichage du modèle logique dans le panneau inférieur (onglet MLD),
      recalculé automatiquement à chaque modification du MCD
- [x] Tests exhaustifs par type d'association (1,N / N,N / 1,1 / réflexive / n-aire)

## v0.3.1 — SQL PostgreSQL (terminé)

- [x] Générateur PostgreSQL (règles documentées dans
      [postgresql-generation.md](postgresql-generation.md)) : types,
      clés primaires simples/composées, contraintes uniques, clés étrangères
      (`ALTER TABLE` par défaut, `inline` disponible), réflexif, cycles,
      validation défensive, nommage déterministe de contraintes
- [x] Aperçu SQL avec copie et téléchargement `.sql`, options fonctionnelles
      (en-tête, `DROP TABLE`, casse des mots-clés)
- [x] Tests unitaires exhaustifs + snapshots par fixture

## v0.3.2 — SQL multi-dialecte (terminé)

- [x] Moteur de génération SQL mutualisé (`src/core/sql/shared/`),
      extrait du dialecte PostgreSQL sans changer son comportement ni ses
      snapshots
- [x] Générateur MySQL / MariaDB (règles documentées dans
      [mysql-generation.md](mysql-generation.md))
- [x] Générateur SQLite, clés étrangères inline imposées, `PRAGMA
    foreign_keys` (règles documentées dans
      [sqlite-generation.md](sqlite-generation.md)), validé réellement via
      le CLI `sqlite3`
- [x] Sélecteur de dialecte fonctionnel dans l'interface, persisté dans
      `ProjectSettings.sqlDialect` et conservé à l'import/export
- [ ] Coloration syntaxique du SQL (si légère)

## v0.4 — Expérience utilisateur (terminé)

- [x] Annuler / rétablir (une entrée par geste, pas par pixel — voir
      [editor-history.md](editor-history.md))
- [x] Copier-coller, duplication (presse-papiers interne, voir
      [clipboard.md](clipboard.md))
- [x] Sélection multiple : déplacement/suppression/duplication/copie groupés
- [x] Commentaires graphiques (nœuds purement visuels, migration de format
      v1 → v2)
- [x] Menu contextuel (canvas vide, entité, association, commentaire)
- [x] Raccourcis clavier complets (annuler/rétablir, presse-papiers,
      sélection, fichiers)
- [x] Export PNG / SVG (diagramme entier, SVG réellement vectoriel — voir
      [diagram-export.md](diagram-export.md))
- [x] Garde-fou de fermeture d'onglet (modifications non enregistrées),
      état vide du canvas

## v0.5 — Modélisation, disposition et performance (terminé)

- [x] Éditeur complet d'identifiants alternatifs/composés dans l'inspecteur
      d'entité (créer, renommer, réordonner/retirer des attributs, promouvoir
      en primaire, supprimer) — voir [identifiers.md](identifiers.md)
- [x] Organisation automatique du diagramme (dagre, horizontal/vertical,
      une seule entrée d'historique) — voir [auto-layout.md](auto-layout.md)
- [x] Alignement (6 directions) et distribution (horizontale/verticale) de
      la sélection multiple
- [x] Verrouillage de nœuds (sélectionnable/éditable mais jamais déplacé,
      ni par glisser-déposer ni par l'auto-layout), migration de format
      v2 → v3
- [x] Panneaux redimensionnables (bibliothèque, inspecteur, panneau
      inférieur) avec persistance locale, et interface tablette (< 1200px,
      tiroirs non modaux) — voir [responsive-layout.md](responsive-layout.md)
- [x] Navigation clavier entre problèmes de validation (F8 / Maj+F8)
- [x] Code-splitting (dialectes SQL, panneaux MLD/SQL, export PNG,
      bibliothèque d'auto-layout) et script `pnpm analyze` — voir
      [performance.md](performance.md)
- [x] Barre de statut compacte et aide de premier lancement (4 étapes,
      refermable)
- [x] Mémoïsation ciblée des nœuds/arêtes du diagramme et sélecteurs
      Zustand resserrés, vérifiés sur un modèle de ~100 entités / 150
      associations

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
