# Démarrage rapide

Objectif : construire un premier MCD, puis obtenir le script SQL
correspondant. Aucun compte, aucune installation : tout se passe dans le
navigateur.

## 1. Ouvrir un projet

Au premier lancement, Modrise ouvre le projet d'exemple **Gestion d'hôtel**.
Pour repartir de zéro : **Nouveau → Projet vide**. Pour regarder un modèle
plus complet avant de commencer : **Nouveau → Exemple : Bibliothèque**.

Renommez le projet en cliquant sur son nom, à gauche de la barre supérieure.

> Ouvrir un nouveau projet remplace celui qui est affiché. Il n'existe pas
> encore de liste des projets précédents : si le projet en cours compte,
> exportez-le d'abord (**Exporter**).

## 2. Créer deux entités

Une **entité**, c'est un objet du monde réel dont on veut mémoriser des
informations : un client, une commande, un livre.

- Depuis la **bibliothèque**, à gauche : bouton _Entité_.
- Ou par **clic droit sur le canevas** → _Ajouter une entité_.

Créez `CLIENT` et `COMMANDE`. Sélectionnez `CLIENT` : l'**inspecteur**
s'ouvre à droite.

Ajoutez-y des attributs (_Ajouter un attribut_), en choisissant leur type :

| Attribut    | Type         | Obligatoire |
| ----------- | ------------ | ----------- |
| `id_client` | integer      | oui         |
| `nom`       | varchar(100) | oui         |
| `courriel`  | varchar(255) | non         |

Puis, dans la section **Identifiants**, mettez `id_client` dans l'identifiant
primaire. Faites de même pour `COMMANDE` (`id_commande`, `date_commande`,
`montant_total`).

Une entité sans identifiant primaire est signalée comme une erreur : c'est
volontaire, elle ne pourrait pas devenir une table.

## 3. Relier les entités par une association

En Merise, deux entités ne se relient jamais directement : elles passent par
une **association**, qui porte un verbe.

1. Créez une association `PASSER` (bibliothèque, ou clic droit sur le canevas).
2. Tracez un lien de `CLIENT` vers `PASSER` : cela crée une **participation**.
3. Tracez un lien de `COMMANDE` vers `PASSER`.

Sélectionnez `PASSER` : l'inspecteur liste ses deux participations. Réglez
les **cardinalités** :

- `CLIENT` — `0,N` : un client peut passer plusieurs commandes, ou aucune.
- `COMMANDE` — `1,1` : une commande est passée par exactement un client.

C'est le cas le plus fréquent (une « relation 1,N »). Les quatre
cardinalités disponibles sont détaillées dans
[Ce que Modrise sait modéliser](modelisation.md).

## 4. Vérifier la validation

Le panneau du bas, onglet **Validation**, liste en continu les erreurs et
avertissements : identifiant manquant, nom réservé en SQL, association sans
participation, cardinalité incohérente…

Cliquez sur un problème pour sélectionner et recentrer l'élément concerné.
Au clavier, `F8` et `Maj+F8` passent au problème suivant / précédent.

Tant qu'il reste une **erreur**, le MLD n'est pas calculé. Les
**avertissements**, eux, ne bloquent rien.

## 5. Lire le modèle logique

Onglet **MLD** du panneau du bas. Modrise y traduit automatiquement le MCD :

- chaque entité devient une table ;
- l'identifiant primaire devient la clé primaire ;
- la participation `1,1` de `COMMANDE` fait descendre `id_client` dans la
  table `commande`, en clé étrangère ;
- une association `N,N` deviendrait, elle, une table à part entière.

Vous ne modifiez jamais le MLD à la main : il est recalculé à chaque
changement du MCD. C'est le MCD qui fait foi.

## 6. Obtenir le SQL

Onglet **SQL**. Choisissez le dialecte — **PostgreSQL**, **MySQL / MariaDB** ou
**SQLite** — puis :

- **Copier** met le script dans le presse-papiers ;
- **Télécharger** produit un fichier `.sql`.

Trois options sont proposées au-dessus du script : **En-tête** (bandeau de
commentaire en tête de fichier), **DROP TABLE** (suppression préalable des
tables) et **Majuscules** (casse des mots-clés SQL). Le dialecte choisi est enregistré avec le
projet et conservé à l'export.

## 7. Mettre au propre, et garder

- **Organiser automatiquement** (barre supérieure) place les nœuds sans
  chevauchement, en disposition horizontale ou verticale. C'est une seule
  action annulable.
- **Exporter** enregistre le projet en `.merise.json` — le format à
  conserver et à réimporter.
- L'icône image exporte le **diagramme** en SVG (vectoriel) ou en PNG. Ce
  sont des images : elles ne se réimportent pas.

La sauvegarde locale, elle, est automatique — voir
[Fichiers, sauvegarde et récupération](fichiers.md).

## Raccourcis utiles

| Raccourci                        | Action                                     |
| -------------------------------- | ------------------------------------------ |
| `Ctrl/Cmd+Z`                     | Annuler                                    |
| `Ctrl/Cmd+Maj+Z` ou `Ctrl/Cmd+Y` | Rétablir                                   |
| `Ctrl/Cmd+C` / `V` / `D`         | Copier / coller / dupliquer la sélection   |
| `Ctrl/Cmd+A`                     | Tout sélectionner                          |
| `Ctrl/Cmd+S`                     | Enregistrer maintenant                     |
| `Ctrl/Cmd+O`                     | Importer un fichier                        |
| `Ctrl/Cmd+N`                     | Nouveau projet vide                        |
| `Suppr` / `Retour arrière`       | Supprimer la sélection                     |
| `F`                              | Recentrer le diagramme                     |
| `F8` / `Maj+F8`                  | Problème de validation suivant / précédent |

Tous sont ignorés pendant la saisie dans un champ de texte.
