# Guide d'utilisation de Modrise

Cette section s'adresse aux **personnes qui modélisent**, pas à celles qui
développent Modrise. Elle décrit l'outil tel qu'il fonctionne aujourd'hui, sans
anticiper sur ce qui est prévu.

1. [Démarrage rapide](demarrage-rapide.md) — d'un canevas vide au script SQL,
   en une dizaine de minutes.
2. [Ce que Modrise sait modéliser](modelisation.md) — entités, attributs,
   identifiants, associations et cardinalités réellement pris en charge.
3. [Fichiers, sauvegarde et récupération](fichiers.md) — sauvegarde locale,
   import, export, et que faire quand quelque chose se passe mal.
4. [Limites connues](limites.md) — ce que Modrise ne fait pas, sur quels
   navigateurs il est vérifié, et ce que « local-first » implique pour vos
   données.

Les documents de conception interne (architecture, règles de transformation,
performance, format de fichier) vivent un cran au-dessus, dans
[`docs/`](../). Ils ne sont pas nécessaires pour utiliser l'outil.

## Projets d'exemple

Trois projets complets sont livrés dans [`examples/`](../../examples/). Ils
s'ouvrent aussi directement depuis le menu **Nouveau** de l'application :

| Exemple               | Ce qu'il montre                                                                       |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Gestion d'hôtel**   | Le plus court : une relation 1,N et une association N,N porteuse d'un attribut.       |
| **Boutique en ligne** | Association réflexive avec rôles, identifiants alternatifs, ligne de commande en N,N. |
| **Bibliothèque**      | Association ternaire, et identifiant primaire composé propagé en clé étrangère.       |

Ouvrir un exemple **remplace le projet affiché**. Exportez le vôtre avant, si
vous y tenez (voir [Fichiers](fichiers.md)).
