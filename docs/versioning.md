# Politique de versionnage

Modrise porte **deux numéros de version indépendants** : celui de
l'application et celui du format de fichier `.merise.json`. Les confondre
serait une erreur — une nouvelle version majeure de l'application n'oblige
pas à casser les fichiers existants, et un changement de format n'oblige pas
à repartir de zéro côté application.

## Version de l'application (`package.json`)

Versionnage sémantique classique, `MAJEURE.MINEURE.CORRECTIVE`.

| Incrément | Signification |
| --- | --- |
| **Corrective** (`0.5.0 → 0.5.1`) | Corrections et améliorations internes — performance, robustesse, documentation. Aucune fonctionnalité retirée, aucun fichier existant invalidé. |
| **Mineure** (`0.4.0 → 0.5.0`) | Nouvelles fonctionnalités de modélisation ou d'édition. Les projets créés avec la version précédente restent ouvrables. |
| **Majeure** (`0.x → 1.0`) | Rupture assumée : retrait d'une fonctionnalité, changement du sens d'une règle Merise déjà livrée, ou modification incompatible d'une API publique du noyau. |

Avant la `1.0`, la position de Modrise est explicite : l'outil est utilisable
mais son périmètre bouge encore, et le préfixe `0.` le dit. Le passage à
`1.0` n'est pas un jalon marketing — il engage sur les points listés comme
bloquants dans [roadmap.md](roadmap.md), en particulier la durabilité du
format.

## Version du format de fichier (`CURRENT_FORMAT_VERSION`)

Un **entier monotone**, défini dans `src/core/project/types.ts`, sans lien
avec le numéro de l'application. Valeur courante : **3**.

Il s'incrémente dès qu'une donnée persistée change de structure, et
seulement dans ce cas :

- `1 → 2` : ajout des nœuds de commentaire (v0.4) ;
- `2 → 3` : ajout du verrouillage de nœuds (v0.5).

Les deux incréments sont arrivés dans des versions **mineures** de
l'application, ce qui illustre l'indépendance des deux numéros.

### Règle de modification

Aucun ancien format n'est modifié rétroactivement. Tout changement de
structure persistée arrive avec :

1. un incrément de `CURRENT_FORMAT_VERSION` ;
2. une migration enregistrée dans `src/core/migrations/index.ts` ;
3. un test Vitest couvrant cette migration et son chaînage depuis la
   version 1.

### Sens des migrations : vers l'avant uniquement

**Modrise sait ouvrir un fichier ancien, pas produire un fichier ancien.**
`applyMigrations` avance de version en version jusqu'à la version courante
(`while (version < targetVersion)`) ; il n'existe aucune migration
descendante, et il n'est pas prévu d'en écrire.

Concrètement :

- un fichier en version 1, 2 ou 3 s'ouvre dans la version courante et est
  réenregistré en version 3 ;
- un fichier produit par une version **future** de Modrise est refusé avec
  un message explicite invitant à mettre à jour, jamais silencieusement
  tronqué ni ouvert de travers.

C'est une limite assumée, pas un oubli. Le coût d'une rétro-migration
fidèle (que faire d'un commentaire ou d'un verrouillage qui n'existe pas
dans le format cible ?) dépasse le service rendu pour un outil local dont
l'utilisateur contrôle sa propre version.

## Engagement de compatibilité

- Un fichier ouvert par une version de Modrise reste ouvrable par toutes
  les versions ultérieures.
- Un fichier n'est jamais rejeté pour cause d'ancienneté ; il l'est
  seulement s'il est invalide, corrompu, ou plus récent que l'application.
- La suppression d'une migration passée est un changement **majeur** de
  l'application, jamais un simple nettoyage.
