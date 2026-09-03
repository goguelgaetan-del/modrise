/**
 * Vérifie qu'un build statique servi sous un sous-répertoire fonctionne
 * réellement dans un navigateur.
 *
 * C'est le point le plus fragile d'un déploiement GitHub Pages : l'application
 * n'est pas servie à la racine du domaine mais sous `/modrise/`. Une URL
 * absolue oubliée quelque part ne casse ni le build, ni `pnpm dev`, ni
 * `pnpm test:e2e` — elle ne casse que le site public. Ce script reproduit
 * exactement cette situation : build avec `base`, service du dossier `dist`
 * sous ce même préfixe, puis parcours dans Chromium.
 *
 * Le même parcours sert à vérifier le site déjà publié, avec `--url` : c'est
 * la vérification navigateur exigée par docs/release-checklist.md, exécutée
 * plutôt que constatée à l'œil.
 *
 * Toute requête en échec et toute erreur de console font échouer le script :
 * un asset introuvable ne doit pas passer inaperçu sous prétexte que la page
 * s'affiche quand même.
 *
 * Usage :
 *   node scripts/verify-static-build.mjs            # build + vérification
 *   node scripts/verify-static-build.mjs --no-build # réutilise `dist/`
 *   node scripts/verify-static-build.mjs --url https://exemple/modrise/
 *   BASE_PATH=/autre/ node scripts/verify-static-build.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, preview } from 'vite';
import { chromium } from '@playwright/test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const base = process.env.BASE_PATH ?? '/modrise/';
const skipBuild = process.argv.includes('--no-build');

/** URL déjà publiée à vérifier, ou `null` pour construire et servir en local. */
function resolveRemoteUrl(argv) {
  const index = argv.indexOf('--url');
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error('« --url » attend une URL.');
  // Une base sans barre finale ferait résoudre `favicon.svg` un cran trop haut.
  return value.endsWith('/') ? value : `${value}/`;
}

const remoteUrl = resolveRemoteUrl(process.argv);

/** Attend qu'un sélecteur devienne visible, avec un message d'échec lisible. */
async function expectVisible(page, testId, timeout = 15_000) {
  const locator = page.getByTestId(testId);
  try {
    await locator.waitFor({ state: 'visible', timeout });
  } catch {
    throw new Error(`« ${testId} » n'est jamais devenu visible (${String(timeout)} ms).`);
  }
}

/** Attend qu'un champ atteigne une valeur donnée. */
async function expectValue(page, testId, expected, timeout = 15_000) {
  const locator = page.getByTestId(testId);
  const deadline = Date.now() + timeout;
  let actual = null;
  while (Date.now() < deadline) {
    actual = await locator.inputValue().catch(() => null);
    if (actual === expected) return;
    await page.waitForTimeout(100);
  }
  throw new Error(
    `« ${testId} » vaut ${JSON.stringify(actual)} au lieu de ${JSON.stringify(expected)}.`,
  );
}

/**
 * Parcours commun au build local et au site publié : charger, créer un projet,
 * le retrouver après rechargement, atteindre le SQL, faire l'aller-retour
 * export/réimport d'un `.merise.json`, avoir une icône.
 */
async function runJourney(page, url, problems) {
  process.stdout.write(`Vérification de ${url}…\n`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. L'application se charge et s'installe localement.
  await expectVisible(page, 'diagram-canvas');
  await expectVisible(page, 'save-status');

  // 2. Un projet est créé, puis retrouvé après rechargement : c'est ce qui
  //    prouve qu'IndexedDB fonctionne sur l'origine réellement déployée.
  await page.getByRole('button', { name: 'Nouveau' }).click();
  await page.getByRole('menuitem', { name: 'Exemple : Bibliothèque' }).click();
  await expectValue(page, 'project-name-input', 'Bibliothèque');
  await expectVisible(page, 'entity-node-LIVRE');

  await page.reload({ waitUntil: 'networkidle' });
  await expectValue(page, 'project-name-input', 'Bibliothèque');
  await expectVisible(page, 'entity-node-LIVRE');

  // 3. Les morceaux chargés dynamiquement le sont aussi depuis la base :
  //    le panneau SQL et ses dialectes sont dans des chunks séparés.
  await page.getByRole('tab', { name: 'SQL' }).click();
  await expectVisible(page, 'sql-code');

  // 4. L'aller-retour d'un fichier : c'est le seul geste qui sort du bac à
  //    sable de la page — un téléchargement puis une lecture par `File`. Il
  //    dépend donc de l'origine réellement servie, pas seulement du bundle.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-button').click(),
  ]);
  const exportedPath = await download.path();
  if (!download.suggestedFilename().endsWith('.merise.json')) {
    problems.push(`export nommé « ${download.suggestedFilename()} », attendu *.merise.json`);
  }

  await page.getByRole('button', { name: 'Nouveau' }).click();
  await page.getByRole('menuitem', { name: 'Projet vide' }).click();
  await expectValue(page, 'project-name-input', 'Projet sans titre');

  await page.getByTestId('import-file-input').setInputFiles(exportedPath);
  await expectValue(page, 'project-name-input', 'Bibliothèque');
  await expectVisible(page, 'entity-node-LIVRE');

  // 5. L'icône déclarée dans `index.html` doit exister sous la base.
  const favicon = await page.request.get(new URL('favicon.svg', url).toString());
  if (!favicon.ok()) problems.push(`favicon absent : HTTP ${String(favicon.status())}`);
}

let server = null;
let url = remoteUrl;

if (!remoteUrl) {
  if (!skipBuild) {
    process.stdout.write(`Build avec base « ${base} »…\n`);
    await build({ root, configFile: join(root, 'vite.config.ts'), base, logLevel: 'warn' });
  }

  server = await preview({
    root,
    configFile: join(root, 'vite.config.ts'),
    base,
    preview: { port: 4173, strictPort: true },
    logLevel: 'warn',
  });

  url = server.resolvedUrls?.local?.[0];
  if (!url) throw new Error("Le serveur d'aperçu n'a pas d'URL locale.");
  if (!new URL(url).pathname.endsWith(base)) {
    throw new Error(`L'URL servie (${url}) ne correspond pas à la base « ${base} ».`);
  }
}

const browser = await chromium.launch();
const problems = [];

try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`exception: ${error.message}`));
  page.on('requestfailed', (request) => {
    problems.push(`requête échouée: ${request.url()} (${request.failure()?.errorText ?? '?'})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400)
      problems.push(`HTTP ${String(response.status())}: ${response.url()}`);
  });

  await runJourney(page, url, problems);
} catch (error) {
  // Le parcours s'arrête à la première étape manquante, mais les requêtes en
  // échec déjà collectées expliquent presque toujours pourquoi : on les
  // affiche ensemble plutôt que de laisser une pile d'appels seule.
  problems.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
  if (server) await server.close();
}

if (problems.length > 0) {
  process.stderr.write(`\n${String(problems.length)} problème(s) :\n`);
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.exitCode = 1;
} else if (remoteUrl) {
  process.stdout.write(`\nOK — site publié vérifié dans Chromium : ${url}\n`);
} else {
  process.stdout.write(`\nOK — build statique servi sous « ${base} » vérifié dans Chromium.\n`);
}
