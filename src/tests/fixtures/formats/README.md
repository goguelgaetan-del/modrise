# Fixtures de format figées

Ces fichiers sont des **projets `.merise.json` réels, écrits à la main**, un
par version passée du format. Ils sont **immuables** : on ne les régénère
jamais, on n'y ajoute jamais un champ apparu après leur version, et on ne les
« corrige » pas pour faire passer un test.

## Pourquoi

Un ancien format refabriqué en retirant deux champs au JSON produit
aujourd'hui par `serializeProject` hérite silencieusement de toutes les
évolutions survenues entre-temps. Il teste donc le sérialiseur courant contre
lui-même, jamais la compatibilité avec un fichier que quelqu'un a réellement
sur son disque depuis 2025. C'est exactement la régression que ces fixtures
existent pour attraper.

Le garde-fou est explicite : `src/core/serialization/file-format.test.ts`
vérifie que `v1.merise.json` ne contient ni `comments` ni `locked`, et que
`v2.merise.json` ne contient pas `locked`. Une régénération accidentelle fait
donc échouer la suite au lieu de passer inaperçue.

## Contenu

Les trois fichiers décrivent délibérément **le même MCD** — `PERSONNE`,
`VEHICULE`, association `CONDUIT` portant un attribut, cardinalités `0,N` et
`1,1`, rôle sur une participation — pour qu'un test puisse vérifier qu'après
migration les trois convergent vers un modèle conceptuel identique.

| Fichier           | Version | Particularités                                                    |
| ----------------- | ------- | ----------------------------------------------------------------- |
| `v1.merise.json`  | 1       | ni `diagram.comments`, ni `locked`, ni `settings.sqlDialect`       |
| `v2.merise.json`  | 2       | commentaires graphiques présents, pas de `locked` ; dialecte MySQL |
| `v3.merise.json`  | 3       | `locked` présent (dont un nœud verrouillé) ; dialecte SQLite       |

`v1` omet aussi `settings.sqlDialect`, qui n'existait pas encore : c'est le
seul moyen de vérifier que le repli sur PostgreSQL fonctionne sur un vrai
fichier ancien, et qu'il ne produit pas d'avertissement (une valeur absente
n'est pas une valeur invalide).

## Ajouter une version

Quand `CURRENT_FORMAT_VERSION` passe à N :

1. exporter un projet depuis la version de Modrise qui vient d'être publiée ;
2. le déposer ici sous `v<N-1>.merise.json` **sans le retoucher ensuite** ;
3. l'ajouter aux tests de migration et d'aller-retour ;
4. ne jamais modifier les fixtures existantes.

Voir [docs/versioning.md](../../../../docs/versioning.md) et
[docs/file-format.md](../../../../docs/file-format.md).
