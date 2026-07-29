# Génération SQL SQLite

Implémentée dans `src/core/sql/sqlite/` (`identifier.ts`, `data-types.ts`,
`generate.ts`, `dialect.ts`), au-dessus du moteur partagé
(`src/core/sql/shared/`, voir sa description dans
[postgresql-generation.md](postgresql-generation.md)). Consomme
exclusivement un `LogicalModel`, jamais le MCD.

## Citation des identifiants

Doubles guillemets, sémantique strictement identique à PostgreSQL
(`quoteIdentifierWithDelimiter` partagé, avec un délimiteur `"` propre à
SQLite — pas de couplage artificiel entre les deux dialectes).

## Types et affinités

SQLite n'a pas de système de types strict : il applique des « affinités ».
Modrise choisit une affinité par type conceptuel plutôt que de prétendre à
une contrainte que SQLite ne peut pas garantir :

| Type conceptuel | Affinité SQLite | Remarque                                            |
| --------------- | --------------- | --------------------------------------------------- |
| `integer`       | `INTEGER`       |                                                     |
| `bigint`        | `INTEGER`       | SQLite n'a qu'un seul entier natif (64 bits)        |
| `decimal(p,s)`  | `NUMERIC`       | **précision et échelle non conservées dans le SQL** |
| `varchar(n)`    | `TEXT`          | **la longueur `n` n'est pas appliquée par SQLite**  |
| `text`          | `TEXT`          |                                                     |
| `boolean`       | `INTEGER`       | convention `0`/`1`, pas de type booléen natif       |
| `date`          | `TEXT`          | convention ISO 8601, pas de type date natif         |
| `datetime`      | `TEXT`          | idem                                                |
| `uuid`          | `TEXT`          |                                                     |

Documenté explicitement plutôt qu'affirmé : un `VARCHAR(50)` Modrise devient
un `TEXT` SQLite sans limite de longueur imposée par le moteur, et un
`DECIMAL(8,2)` devient un `NUMERIC` sans garantie d'arrondi identique à
PostgreSQL.

## Clés étrangères — mode `inline` imposé

SQLite ne permet pas d'ajouter une clé étrangère après coup
(`ALTER TABLE ... ADD CONSTRAINT` n'existe pas pour les FK) : le mode
`inline` est donc le seul répertorié dans `allowedForeignKeyModes`, et le
moteur partagé y retombe automatiquement quel que soit le mode demandé par
l'appelant.

```sql
CREATE TABLE "reservation" (
  "id_reservation" INTEGER NOT NULL,
  "client_id_client" INTEGER NOT NULL,
  CONSTRAINT "pk_reservation" PRIMARY KEY ("id_reservation"),
  CONSTRAINT "fk_reservation_client"
    FOREIGN KEY ("client_id_client")
    REFERENCES "client" ("id_client")
);
```

Les cycles entre tables et les associations réflexives sont pris en charge
sans difficulté : SQLite résout les références inline au moment de
l'exécution des instructions DML, pas à la création des tables.

## `PRAGMA foreign_keys`

Chaque script commence par :

```sql
PRAGMA foreign_keys = ON;
```

SQLite désactive la vérification des clés étrangères par défaut. **Ce
réglage n'est pas persisté dans le fichier de base de données : c'est un
paramètre par connexion.** Toute application qui ouvre ensuite ce fichier
(hors exécution directe du script généré) doit exécuter elle-même
`PRAGMA foreign_keys = ON;` sur sa propre connexion pour que les clés
étrangères soient réellement vérifiées. Vérifié expérimentalement (voir
« Validation réelle » ci-dessous) : une connexion séparée sans ce PRAGMA
laisse passer une clé étrangère invalide silencieusement.

## `DROP TABLE`

Quand activé, le bloc est encadré par un cycle OFF/ON supplémentaire :

```sql
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS "reservation";
DROP TABLE IF EXISTS "client";
PRAGMA foreign_keys = ON;
```

permettant de supprimer les tables dans un ordre quelconque. Aucun
`CASCADE` : cette clause n'existe pas sur `DROP TABLE` en SQLite.

## Limite de nom de contrainte

SQLite n'impose aucune limite pratique courte ; Modrise applique néanmoins
une limite large (1024 octets) pour garder le mécanisme de troncature et de
résolution de collision générique et testable, sans jamais produire de nom
déraisonnablement long.

## Validation réelle effectuée

`sqlite3` (CLI officiel) a été installé dans cet environnement et utilisé
pour valider le script généré du projet « Gestion d'hôtel » :

```bash
sqlite3 --version   # 3.46.1
sqlite3 /tmp/modrise-test.sqlite < hotel.sqlite.sql   # exécution sans erreur
sqlite3 /tmp/modrise-test.sqlite ".tables"             # 4 tables créées
sqlite3 /tmp/modrise-test.sqlite "PRAGMA foreign_key_list('reservation');"
sqlite3 /tmp/modrise-test.sqlite "PRAGMA foreign_key_check;"  # aucune violation
```

Un test d'application des contraintes a également été effectué dans une
même session (`PRAGMA foreign_keys = ON` actif) : une insertion référençant
un `client_id_client` inexistant est rejetée avec
`FOREIGN KEY constraint failed`, confirmant que les clés étrangères
générées sont fonctionnelles, pas seulement syntaxiquement valides.

## Limites actuelles

Pas d'action référentielle explicite, pas d'auto-incrément (SQLite gère déjà
`INTEGER PRIMARY KEY` comme alias de `rowid` auto-incrémenté nativement,
mais Modrise ne l'exploite pas explicitement tant que le MCD ne porte pas
cette information) — voir le tableau comparatif dans
[sql-dialects.md](sql-dialects.md).
