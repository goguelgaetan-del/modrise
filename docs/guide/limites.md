# Limites connues

Cette page dit ce que Modrise **ne fait pas**, dans quel cadre il est vérifié,
et ce que « local-first » signifie concrètement pour vos données. Elle décrit
l'état actuel, pas une intention.

## Un seul projet à la fois

L'éditeur affiche un projet, et un seul. Ouvrir un nouveau projet, un exemple
ou un fichier importé **remplace** celui en cours. Il n'existe pas encore de
liste des projets précédents ni de moyen d'en rouvrir un depuis l'interface.

Exportez vos projets en `.merise.json` : c'est aujourd'hui la façon de garder
plusieurs modèles côte à côte, et la seule sauvegarde réellement fiable
(voir [Fichiers](fichiers.md)).

## Notions Merise non couvertes

- **Héritage** (spécialisation / généralisation) : pas de sur-type ni de
  sous-type.
- **Contraintes ensemblistes** entre associations (exclusion, totalité,
  partition, inclusion).
- **MCT / MOT** : Modrise modélise les _données_, pas les traitements. Pas de
  diagrammes de flux, pas de processus.
- **Cardinalités personnalisées** : les quatre cardinalités Merise sont
  disponibles, mais pas de bornes libres du type `2,5`.
- **Dictionnaire des données** ou modèle physique détaillé (tablespaces,
  partitionnement, index métier).

## Ce que la génération SQL couvre — et pas

Modrise produit la **structure** : `CREATE TABLE`, types, `NOT NULL`, clés
primaires, contraintes uniques et clés étrangères, dans les trois dialectes
PostgreSQL, MySQL / MariaDB et SQLite.

Il ne produit **pas** : index métier, vues, déclencheurs, procédures,
séquences configurables, droits, ni jeu de données. Aucune connexion à une
base : le script est à vous d'exécuter, et rien n'est jamais envoyé nulle
part.

Le sens inverse — **partir d'une base existante pour retrouver un MCD** — n'est
pas disponible.

## Taille des modèles

Les performances sont mesurées et documentées sur un modèle de **100 entités,
150 associations, 250 nœuds** ; à cette taille, l'édition et le déplacement
restent fluides (voir [performance.md](../performance.md)). Au-delà, rien
n'empêche de continuer, mais plus rien n'est vérifié.

Deux limites sont fixes :

- un fichier importé ne peut dépasser **16 Mio** (environ 46 fois le plus grand
  modèle documenté) ;
- un nom de plus de **64 caractères** déclenche un avertissement.

## Interface

- **Français uniquement** : l'interface n'est pas traduite.
- **Pensée pour un écran d'ordinateur.** En dessous de 1200 px de large, les
  panneaux latéraux deviennent des tiroirs ; en dessous de 768 px, un message
  signale que l'écran est trop étroit pour modéliser confortablement — sans
  bloquer l'application. Il n'y a pas d'édition tactile dédiée.
- **Pas de mode hors-ligne installable** : Modrise est une page web, sans
  service worker ni application desktop. Une fois la page chargée, elle
  fonctionne sans réseau, mais il faut pouvoir la recharger.

## Navigateurs

Modrise a besoin d'un navigateur récent, avec **IndexedDB** disponible : sans
lui, la sauvegarde automatique échoue et seul l'export manuel protège votre
travail (c'est notamment le cas dans certaines fenêtres de navigation privée).

Les tests de bout en bout sont exécutés en continu sur **Chromium**. Firefox et
Safari récents utilisent les mêmes API standard et devraient fonctionner, mais
ce n'est pas vérifié automatiquement : signalez tout écart.

## Confidentialité : ce que « local-first » veut dire

- **Aucune donnée ne quitte votre navigateur.** Pas de compte, pas de serveur
  d'application, pas de base distante.
- **Aucune télémétrie**, aucun traceur, aucun rapport d'erreur envoyé — y
  compris quand l'application s'interrompt.
- Vos projets vivent dans IndexedDB, sous le contrôle du navigateur : ils sont
  aussi accessibles, et aussi effaçables, que n'importe quelle donnée de site.
- Les seules données qui sortent sont celles que **vous** exportez :
  `.merise.json`, `.sql`, `.svg`, `.png`.

Le revers est direct : personne ne peut restaurer un projet perdu à votre
place. Exportez régulièrement.

## Et la suite

Les fonctions absentes ci-dessus ne sont pas toutes abandonnées : la
[roadmap](../roadmap.md) indique lesquelles sont envisagées. L'interface
annonce explicitement ce qui n'est pas encore disponible — rien n'y est
simulé.
