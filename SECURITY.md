# Politique de sécurité

## Modèle de menace

Modrise fonctionne entièrement dans le navigateur, sans backend ni compte utilisateur. Les données restent locales (IndexedDB). Les surfaces sensibles sont :

- l'**import de fichiers** `.merise.json` : les fichiers sont traités comme non fiables et validés par Zod avant chargement ;
- la **persistance locale** : les documents relus depuis IndexedDB repassent par le même pipeline de validation.

## Signaler une vulnérabilité

Merci de signaler toute vulnérabilité de manière responsable en ouvrant une **security advisory** GitHub (« Report a vulnerability ») plutôt qu'une issue publique.

Nous nous efforçons de répondre sous 7 jours.

## Versions supportées

Seule la dernière version publiée reçoit des correctifs de sécurité.
