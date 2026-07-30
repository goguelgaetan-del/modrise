# Format de fichier `.merise.json`

Les projets Modrise s'exportent dans un fichier JSON versionné portant
l'extension `.merise.json`. Implémentation :
`src/core/serialization/file-format.ts`.

## Structure (version 2)

```json
{
  "formatVersion": 2,
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
    "nodes": [],
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

Un exemple complet : [`examples/gestion-hotel.merise.json`](../examples/gestion-hotel.merise.json).

## Pipeline d'import

Tout fichier importé est traité comme non fiable :

1. lecture du texte ;
2. `JSON.parse` (échec → message « pas de JSON valide ») ;
3. lecture de `formatVersion` (absent → message dédié) ;
4. **migrations** jusqu'à la version courante (`src/core/migrations`) ;
5. **validation Zod** du document complet (échec → message nommant le champ
   fautif) ;
6. chargement dans l'application uniquement si tout est valide.

Les documents relus depuis IndexedDB suivent le même pipeline.

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
3. ajoute des tests (chaînage testé dans `file-format.test.ts`, y compris un
   vrai fixture de l'ancienne version — pas seulement des migrations factices
   — pour vérifier l'import réel d'anciens fichiers).

**v1 → v2** (`addDiagramComments`, v0.4) : un fichier v1 n'a jamais de champ
`diagram.comments` ; la migration lui en ajoute un vide (`[]`), sans toucher
au modèle conceptuel ni aux positions existantes. Un fichier v1 exporté avant
le v0.4 s'importe donc normalement, et son ré-export produit un fichier v2
stable.

Un fichier d'une version plus récente que celle supportée est refusé avec un
message invitant à mettre Modrise à jour.

## Compatibilité

- Le format est stable au sein d'une même `formatVersion` : les champs ne sont
  ni renommés ni supprimés sans migration.
- Les identifiants (`id`) sont opaques (UUID) et ne doivent pas être
  interprétés.
- L'ordre des tableaux est significatif (ordre des attributs, des
  participations).
