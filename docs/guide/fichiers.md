# Fichiers, sauvegarde et récupération

Modrise fonctionne sans serveur : votre travail est enregistré **dans votre
navigateur**, et n'en sort que si vous l'exportez vous-même.

## Sauvegarde automatique

Chaque modification déclenche une sauvegarde locale, un court instant après
que vous ayez arrêté d'agir (le temps de ne pas enregistrer à chaque pixel
d'un déplacement). L'indicateur de la barre supérieure dit toujours où vous
en êtes :

| Indicateur                       | Signification                              |
| -------------------------------- | ------------------------------------------ |
| _Modifications non enregistrées_ | La sauvegarde va partir                    |
| _Enregistrement…_                | En cours                                   |
| _Enregistré localement_          | Tout est écrit dans le navigateur          |
| _Erreur d'enregistrement_        | L'écriture a échoué — exportez sans tarder |

`Ctrl/Cmd+S` (ou l'icône disquette) force une sauvegarde immédiate. Si vous
fermez l'onglet alors que des modifications ne sont pas enregistrées, le
navigateur demande confirmation.

À la réouverture, Modrise recharge **le dernier projet ouvert**.

## Où sont stockés les projets

Dans **IndexedDB**, le stockage local du navigateur. Cela implique :

- le stockage est propre à **ce navigateur, sur cet appareil, pour ce profil**
  — un projet ouvert sur votre poste n'existe pas sur votre téléphone ;
- **vider les données de site**, désinstaller le navigateur ou utiliser une
  fenêtre de navigation privée fait disparaître les projets ;
- rien n'est envoyé sur un serveur, y compris en cas d'erreur : il n'y a ni
  compte, ni synchronisation, ni télémétrie.

**Conséquence pratique : le fichier `.merise.json` exporté est votre seule
vraie sauvegarde.** Exportez avant toute opération risquée, et gardez le
fichier ailleurs (dépôt Git, disque, sauvegarde habituelle).

## Exporter

**Exporter** produit un fichier `.merise.json` nommé d'après le projet
(« Gestion d'hôtel » → `gestion-d-hotel.merise.json`). Ce fichier contient
tout : modèle conceptuel, positions du diagramme, commentaires, réglages —
et **pas** le MLD ni le SQL, qui sont toujours recalculés.

Le menu image exporte le **diagramme** :

- **SVG** — réellement vectoriel, généré depuis le modèle : il reste net à
  toute échelle et s'ouvre dans un éditeur de dessin ;
- **PNG** — une image matricielle haute résolution.

Ces deux formats sont des illustrations : **ils ne se réimportent pas**. Pour
conserver un projet, c'est le `.merise.json`.

Le panneau SQL, lui, télécharge un fichier `.sql` correspondant au dialecte
sélectionné.

## Importer

**Importer** (ou `Ctrl/Cmd+O`) ouvre un `.merise.json`. Le fichier remplace le
projet affiché — exportez le vôtre d'abord si nécessaire.

Un fichier produit par une version antérieure de Modrise s'ouvre normalement :
son format est mis à jour automatiquement au chargement, en enchaînant les
conversions nécessaires. Vous pouvez le réexporter : il ressort au format
courant.

Rien n'est jamais chargé sans vérification. Si le fichier ne convient pas,
Modrise l'annonce en clair et **le projet en cours reste intact** :

| Situation                         | Ce que vous lisez                                    |
| --------------------------------- | ---------------------------------------------------- |
| Fichier vide                      | « Ce fichier est vide. »                             |
| Fichier illisible                 | « Ce fichier n'a pas pu être lu… »                   |
| Fichier de plus de 16 Mio         | La taille du fichier et la limite, en toutes lettres |
| Fichier tronqué, ou JSON invalide | « Ce fichier ne contient pas de JSON valide. »       |
| JSON valide, mais pas un projet   | « Ce fichier ne ressemble pas à un projet Modrise. » |
| Version de format plus récente    | Invitation à mettre Modrise à jour                   |
| Structure incorrecte              | Le nom du champ fautif                               |

La limite de 16 Mio est vérifiée **avant** toute lecture : un fichier
manifestement hors sujet est refusé sans jamais être chargé en mémoire. À
titre de repère, l'exemple _Gestion d'hôtel_ pèse environ 8 Kio, et un très
gros modèle (100 entités, 150 associations) environ 350 Kio.

Certains fichiers sont acceptés **avec un avertissement** plutôt que refusés :
un dialecte SQL inconnu, par exemple, est remplacé par PostgreSQL — et vous
en êtes informé, sans que le projet soit perdu pour autant.

## Quand quelque chose se passe mal

**Une erreur interrompt l'affichage.** Modrise ne montre pas une page
blanche : un écran « Modrise s'est interrompu » propose deux actions —
_Télécharger une copie du projet_, puis _Recharger l'application_. Faites-les
dans cet ordre : la copie est produite à partir de l'état en mémoire, y
compris ce qui n'était pas encore enregistré.

**L'indicateur affiche « Erreur d'enregistrement ».** Le stockage local est
indisponible (quota atteint, navigation privée, restriction du navigateur).
Exportez immédiatement en `.merise.json` : le travail en cours est encore là,
mais il ne survivra pas à la fermeture de l'onglet.

**Un import a échoué.** Rien n'a été touché : le projet affiché est celui
d'avant. Le message indique ce qui cloche dans le fichier.

**Le projet a disparu à la réouverture.** Les données de site ont
vraisemblablement été effacées, ou l'onglet était en navigation privée.
Réimportez votre dernier export — il n'existe pas de copie côté serveur, par
construction.
