# Déploiement

Modrise est une application entièrement statique : le build produit un dossier
`dist/` composé de HTML, de JavaScript, de CSS et de deux images. Il n'y a ni
serveur applicatif, ni base de données, ni variable d'environnement secrète —
les projets vivent dans l'IndexedDB du navigateur et n'en sortent jamais
(voir [guide/limites.md](guide/limites.md)).

N'importe quel hébergeur de fichiers statiques convient donc. Le dépôt est
configuré pour GitHub Pages, qui a l'avantage de ne dépendre d'aucun compte
supplémentaire. Le site est publié à l'adresse
<https://goguelgaetan-del.github.io/modrise/>.

## Le seul vrai piège : le chemin de base

GitHub Pages sert un dépôt de projet sous un sous-répertoire —
`https://<compte>.github.io/modrise/` — et non à la racine du domaine. Une URL
absolue (`/assets/index.js`) y renvoie un 404, alors que la même application
fonctionne parfaitement en `pnpm dev`, en `pnpm preview` et sous Playwright,
qui servent tous à la racine.

`vite.config.ts` expose donc un chemin de base configurable :

```ts
const base = resolveBase(process.env.BASE_PATH); // « / » par défaut
```

- non défini → `/` : développement, aperçu local, tests end-to-end, et tout
  hébergement sur un domaine dédié ;
- `BASE_PATH=/modrise` ou `/modrise/` → `/modrise/` : site de projet GitHub
  Pages. La normalisation est faite dans la configuration parce que
  `actions/configure-pages` renvoie `/modrise` pour un site de projet mais `/`
  pour un domaine dédié ; concaténer une barre oblique à l'aveugle produirait
  `//`.

Vite réécrit alors le `<script>`, la feuille de style, les `modulepreload`,
les imports dynamiques et le `href` du favicon. Aucun chemin absolu n'est
écrit à la main dans `src/` : c'est une contrainte à préserver.

## Vérifier avant de publier

```bash
pnpm verify:static
```

Le script `scripts/verify-static-build.mjs` reconstruit l'application avec
`base = /modrise/`, sert `dist/` sous ce même préfixe, puis la parcourt dans
Chromium :

1. l'application se charge et l'indicateur de sauvegarde apparaît ;
2. un exemple est ouvert depuis le menu **Nouveau** ;
3. la page est rechargée et le projet est retrouvé — ce qui prouve
   qu'IndexedDB fonctionne sur l'origine réellement servie ;
4. l'onglet SQL est ouvert, ce qui force le chargement des morceaux
   découpés dynamiquement ;
5. le projet est exporté en `.merise.json`, puis réimporté dans un projet
   vide — le seul geste qui sorte du bac à sable de la page ;
6. le favicon est demandé sous la base.

Toute requête en échec, toute réponse `>= 400` et toute erreur de console font
échouer le script : un asset introuvable ne passe pas inaperçu au prétexte que
la page finit par s'afficher. `--no-build` réutilise le `dist/` existant, ce
qui permet aussi de vérifier qu'un build fait à la racine échoue bien sous un
sous-répertoire.

Le même parcours s'applique à un site déjà publié :

```bash
pnpm verify:static --url https://goguelgaetan-del.github.io/modrise/
```

Ni build ni serveur local dans ce mode : Chromium visite l'URL donnée. C'est
la vérification exigée après publication, exécutée plutôt que constatée à
l'œil.

## Le workflow

`.github/workflows/deploy.yml` s'exécute sur `main` uniquement, plus à la
demande (`workflow_dispatch`) pour rejouer un déploiement sans nouveau commit.
Il installe les dépendances, demande son chemin de base à
`actions/configure-pages`, construit, téléverse `dist/` comme artefact Pages
et le publie.

Le déclenchement est volontairement restreint à `main` : une branche de
travail ne doit jamais remplacer le site public. Le workflow ne rejoue pas
lint, typecheck, tests et build unitaires — `ci.yml` et `e2e.yml` s'exécutent
déjà sur le même `push`, et les dupliquer allongerait le déploiement sans rien
vérifier de plus. La contrepartie est explicite : **le workflow de déploiement
publie même si la CI échoue.** La liste de contrôle de sortie exige donc une
CI verte sur `main` avant de poser une étiquette.

## Activer Pages la première fois

C'est fait sur ce dépôt depuis la v1.0 ; la procédure reste ici pour un fork
ou un autre dépôt. À faire une seule fois, par une personne ayant les droits
d'administration :

1. `Settings` → `Pages` → `Build and deployment` → `Source` : **GitHub
   Actions** (et non « Deploy from a branch ») ;
2. fusionner sur `main` — ou lancer le workflow **Déploiement** à la main ;
3. relever l'URL publiée dans le résumé du workflow, ou avec
   `gh api repos/:owner/:repo/pages --jq .html_url` ;
4. renseigner cette URL dans `About` du dépôt et dans `README.md`.

En ligne de commande, l'étape 1 s'écrit :

```bash
gh api -X POST repos/:owner/:repo/pages -f build_type=workflow
```

Tant que Pages n'est pas activé, le workflow s'arrête dès l'étape
`configure-pages`, qui ne trouve pas de site à configurer. L'échec est
explicite et aucun site n'est publié par accident.

## Vérification après publication

La liste de contrôle demande une vérification **dans un navigateur**, pas la
lecture d'un journal vert. Un déploiement `success` prouve seulement qu'un
artefact a été téléversé, jamais qu'il s'exécute sous sa base.

```bash
pnpm verify:static --url https://goguelgaetan-del.github.io/modrise/
```

Le script rejoue sur l'URL publique le parcours décrit plus haut — chargement,
ouverture d'un exemple, rechargement qui retrouve le projet, onglet SQL,
aller-retour export/réimport, favicon — et échoue sur toute requête perdue ou
erreur de console. Il a été exécuté avec succès sur le site publié de la
v1.0.0.

## Autre hébergeur

Sur Netlify, Cloudflare Pages, un seau S3 ou un simple Nginx :

- commande de build : `pnpm build` (sans `BASE_PATH` si le site est à la
  racine du domaine) ;
- dossier publié : `dist` ;
- aucune redirection SPA n'est nécessaire : l'application n'a pas de routeur,
  tout se joue sur `index.html` ;
- servir en HTTPS, faute de quoi certains navigateurs restreignent
  IndexedDB.
