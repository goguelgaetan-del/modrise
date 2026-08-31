# Format de fichier `.merise.json`

Les projets Modrise s'exportent dans un fichier JSON versionné portant
l'extension `.merise.json`. Implémentation :
`src/core/serialization/file-format.ts`.

## Structure (version 3)

```json
{
  "formatVersion": 3,
  "project": {
    "id": "…",
    "name": "Gestion d'hôtel",
    "description": "",
    "createdAt": "2026-07-29T12:00:00.000Z",
    "updatedAt": "2026-07-29T12:00:00.000Z"
  },
  "conceptualModel": {
    "entities": [],
    "associations": []
  },
  "diagram": {
    "nodes": [{ "id": "…", "modelId": "…", "nodeType": "entity", "position": { "x": 0, "y": 0 }, "locked": false }],
    "viewport": { "x": 0, "y": 0, "zoom": 1 },
    "comments": []
  },
  "settings": {
    "sqlDialect": "postgresql",
    "namingConvention": "snake_case",
    "gridEnabled": true,
    "snapToGrid": true
  }
}
```

`diagram.comments` (v2, v0.4) contient les commentaires graphiques
(`{ id, text }`) : purement visuels, ils n'existent jamais dans
`conceptualModel` et n'affectent ni la validation, ni le MLD, ni le SQL. Voir
[editor-history.md](editor-history.md) pour le reste des ajouts d'édition du
v0.4 (annuler/rétablir, presse-papiers).

`diagram.nodes[].locked` (v3, v0.5) : un nœud verrouillé reste sélectionnable
et éditable mais ne peut être déplacé ni par un glisser-déposer, ni par
l'auto-layout ou les outils d'alignement/distribution. Purement graphique,
comme les commentaires. Voir [auto-layout.md](auto-layout.md).

Un exemple complet : [`examples/gestion-hotel.merise.json`](../examples/gestion-hotel.merise.json).

## Pipeline d'import

Tout fichier importé est traité comme non fiable :

1. **taille**, vérifiée *avant* toute lecture (`assertImportableSize`) ;
2. lecture du texte (`File.text()`) — un échec de lecture devient un message,
   jamais une promesse rejetée ;
3. contenu vide (échec → message dédié, distinct de « JSON invalide ») ;
4. `JSON.parse` (échec → message « pas de JSON valide ») ;
5. structure de premier niveau (tableau, chaîne, nombre → refus) ;
6. lecture de `formatVersion` (absent → message dédié) ;
7. **migrations** jusqu'à la version courante (`src/core/migrations`) ;
8. **validation Zod** du document complet (échec → message nommant le champ
   fautif) ;
9. chargement dans l'application uniquement si tout est valide.

Les documents relus depuis IndexedDB suivent les étapes 3 à 9 : ils ne
passent pas par un `File`, donc ni par la limite de taille ni par la lecture.

Le découpage suit la règle d'architecture du projet : les étapes 1 et 3 à 9
sont des fonctions pures du noyau (`core/serialization`, testables sans
navigateur) ; seule l'étape 2 — obtenir du texte depuis un `File` — vit dans
`src/features/projects/import-export.ts`.

### Limite de taille

`MAX_PROJECT_FILE_BYTES` vaut **16 Mio**. La vérification a lieu sur
`file.size`, connu sans rien charger, parce que `File.text()` matérialise tout
le contenu en mémoire d'un coup et que `JSON.parse` en construit ensuite une
seconde représentation : un fichier de plusieurs centaines de mégaoctets
figerait l'onglet avant qu'un seul message ait pu s'afficher.

Le chiffre est calibré sur des mesures, pas choisi au hasard : le projet
d'exemple « Gestion d'hôtel » pèse **8,3 Kio** sérialisé, et le plus grand
modèle que Modrise revendique (100 entités, 150 associations, 250 nœuds —
voir [performance.md](performance.md)) pèse **356 Kio**. La limite laisse donc
une marge d'environ **46×** au-dessus du plafond documenté.

Un fichier au-delà est refusé avec les deux tailles dans le message (celle du
fichier et la limite), pas un « fichier trop gros » anonyme.

### Cas refusés, et leur message

| Cas                        | Message                                                     |
| -------------------------- | ----------------------------------------------------------- |
| Fichier vide (0 octet)     | « Ce fichier est vide. »                                     |
| Fichier illisible          | « Ce fichier n'a pas pu être lu… »                           |
| Au-delà de 16 Mio          | « Ce fichier fait X, au-delà de la limite d'import de 16 Mio… » |
| JSON invalide ou tronqué   | « Ce fichier ne contient pas de JSON valide. »                |
| JSON valide non-objet      | « Ce fichier ne ressemble pas à un projet Modrise. »          |
| `formatVersion` absent     | « Ce fichier ne déclare pas de version de format… »           |
| Version future             | « …plus récente que celle supportée. Mettez Modrise à jour. » |
| Structure invalide         | « …champ « conceptualModel.entities.0.name » : … »            |

Dans tous les cas l'application reste utilisable et le projet en cours
intact : l'import échoué ne remplace rien. Ces scénarios sont couverts en
tests unitaires (`file-format.test.ts`, `import-export.test.ts`) et en bout en
bout (`e2e/app.spec.ts`).

## Migrations

```ts
interface ProjectMigration {
  fromVersion: number;
  toVersion: number;
  migrate(data: unknown): unknown;
}
```

Toute évolution incompatible du format :

1. incrémente `CURRENT_FORMAT_VERSION` (`src/core/project/types.ts`) ;
2. ajoute une migration `n → n+1` dans `MIGRATIONS` ;
3. ajoute des tests dans `file-format.test.ts` — chaînage depuis la v1, et
   surtout un **fichier figé** de la version précédente déposé dans
   [`src/tests/fixtures/formats/`](../src/tests/fixtures/formats/README.md).

### Fixtures figées

Les versions passées sont testées à partir de fichiers écrits à la main et
**jamais régénérés** (`v1.merise.json`, `v2.merise.json`, `v3.merise.json`).
Un ancien format refabriqué en retirant deux champs au JSON produit
aujourd'hui hériterait silencieusement de toutes les évolutions faites
entre-temps : il testerait le sérialiseur courant contre lui-même, pas la
compatibilité avec un fichier réellement présent sur le disque d'un
utilisateur. Un test vérifie d'ailleurs que ces fixtures ne contiennent pas
les champs ajoutés par les migrations, pour qu'une régénération accidentelle
fasse échouer la suite au lieu de passer inaperçue.

Chaque fixture est testée deux fois : migration jusqu'au format courant, puis
stabilité après réexport/réimport (le résultat doit être un point fixe).

### Migrations livrées

**v1 → v2** (`addDiagramComments`, v0.4) : un fichier v1 n'a jamais de champ
`diagram.comments` ; la migration lui en ajoute un vide (`[]`), sans toucher
au modèle conceptuel ni aux positions existantes. Un fichier v1 exporté avant
le v0.4 s'importe donc normalement, et son ré-export produit un fichier v2
stable.

**v2 → v3** (`addNodeLocked`, v0.5) : un fichier v2 n'a jamais `locked` sur
ses nœuds ; la migration l'ajoute à `false` sur chacun (aucun nœud
verrouillé), sans toucher au reste. Un fichier v1 s'importe donc en
chaînant les deux migrations (v1 → v2 → v3) automatiquement.

Un fichier d'une version plus récente que celle supportée est refusé avec un
message invitant à mettre Modrise à jour.

## Compatibilité

- Le format est stable au sein d'une même `formatVersion` : les champs ne sont
  ni renommés ni supprimés sans migration.
- Les identifiants (`id`) sont opaques (UUID) et ne doivent pas être
  interprétés.
- L'ordre des tableaux est significatif (ordre des attributs, des
  participations).
- La politique de version — ce que `formatVersion` engage, et pourquoi les
  migrations ne vont que vers l'avant — est décrite dans
  [versioning.md](versioning.md).
