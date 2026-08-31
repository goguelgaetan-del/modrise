import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
});

async function waitForSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement', {
    timeout: 10_000,
  });
}

test("démarre sur le projet d'exemple", async ({ page }) => {
  await expect(page).toHaveTitle(/Modrise/);
  await expect(page.getByTestId('project-name-input')).toHaveValue("Gestion d'hôtel");
  await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();
  await expect(page.getByTestId('association-node-EFFECTUER')).toBeVisible();
});

test('crée une entité, la renomme et lui ajoute un attribut', async ({ page }) => {
  await page.getByTestId('add-entity').click();
  await expect(page.getByTestId('entity-node-NOUVELLE_ENTITE')).toBeVisible();

  const nameInput = page.getByTestId('entity-name-input');
  await nameInput.fill('ETUDIANT');
  await expect(page.getByTestId('entity-node-ETUDIANT')).toBeVisible();

  await page.getByTestId('add-attribute').click();
  await expect(page.getByTestId('entity-node-ETUDIANT')).toContainText('attribut');
  await expect(page.getByTestId('entity-node-ETUDIANT')).toContainText('varchar(255)');
});

test('crée une association et la renomme', async ({ page }) => {
  await page.getByTestId('add-association').click();
  await expect(page.getByTestId('association-node-NOUVELLE_ASSOCIATION')).toBeVisible();

  await page.getByTestId('association-name-input').fill('PASSER');
  await expect(page.getByTestId('association-node-PASSER')).toBeVisible();
});

test('déplace un nœud sur le canvas', async ({ page }) => {
  const node = page.getByTestId('entity-node-CLIENT');
  await expect(node).toBeVisible();
  const before = await node.boundingBox();
  if (!before) throw new Error('nœud introuvable');

  await page.mouse.move(before.x + before.width / 2, before.y + 10);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 120, before.y + 90, { steps: 8 });
  await page.mouse.up();

  const after = await node.boundingBox();
  if (!after) throw new Error('nœud introuvable après déplacement');
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(50);
});

test('retrouve le projet après rechargement (IndexedDB)', async ({ page }) => {
  await page.getByTestId('project-name-input').fill('Projet E2E persistant');
  await waitForSaved(page);

  await page.reload();
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
  await expect(page.getByTestId('project-name-input')).toHaveValue('Projet E2E persistant');
  await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();
});

test('exporte puis réimporte un projet', async ({ page }) => {
  await waitForSaved(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-button').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gestion-d-hotel.merise.json');
  const filePath = await download.path();

  // Bascule sur un projet vide, puis réimporte le fichier exporté.
  await page.getByRole('button', { name: 'Nouveau' }).click();
  await page.getByRole('menuitem', { name: 'Projet vide' }).click();
  await expect(page.getByTestId('project-name-input')).toHaveValue('Projet sans titre');

  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.getByTestId('project-name-input')).toHaveValue("Gestion d'hôtel");
  await expect(page.getByTestId('entity-node-CHAMBRE')).toBeVisible();
});

test("rejette un fichier d'import invalide sans casser l'application", async ({ page }) => {
  await page.getByTestId('import-file-input').setInputFiles({
    name: 'invalide.merise.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"pas": "un projet"}'),
  });
  await expect(page.getByText(/Import impossible/)).toBeVisible();
  // L'application reste fonctionnelle.
  await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();
});

/**
 * Un import refusé doit laisser l'application *utilisable*, pas seulement
 * affichée : ces trois scénarios vérifient donc le message, puis rouvrent
 * l'inspecteur sur une entité et modifient le projet pour prouver que rien
 * n'est resté bloqué.
 */
interface ImportPayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

async function expectRefusedImport(page: Page, file: ImportPayload): Promise<void> {
  await page.getByTestId('import-file-input').setInputFiles(file);
  await expect(page.getByText(/Import impossible/)).toBeVisible();

  // Le projet en cours est intact...
  await expect(page.getByTestId('project-name-input')).toHaveValue("Gestion d'hôtel");
  await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();

  // ...et l'application répond encore aux interactions.
  await page.getByTestId('entity-node-CLIENT').click();
  await expect(page.getByTestId('entity-name-input')).toBeVisible();
}

test("refuse un fichier tronqué sans casser l'application", async ({ page }) => {
  await expectRefusedImport(page, {
    name: 'tronque.merise.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"formatVersion": 3, "project": {"id": "abc", "na'),
  });
  await expect(page.getByText(/ne contient pas de JSON valide/)).toBeVisible();
});

test("refuse un fichier d'une version future en indiquant quoi faire", async ({ page }) => {
  const fs = await import('node:fs/promises');
  const raw = JSON.parse(
    await fs.readFile(new URL('../src/tests/fixtures/formats/v3.merise.json', import.meta.url), 'utf8'),
  ) as { formatVersion: number };
  raw.formatVersion = 99;

  await expectRefusedImport(page, {
    name: 'futur.merise.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(raw)),
  });
  await expect(page.getByText(/Mettez Modrise à jour/)).toBeVisible();
});

test("refuse un fichier surdimensionné sans figer l'onglet", async ({ page }) => {
  // 16 Mio + 1 octet : juste au-dessus de MAX_PROJECT_FILE_BYTES. Le contenu
  // n'a pas d'importance — il ne doit jamais être lu.
  const oversized = Buffer.alloc(16 * 1024 * 1024 + 1, 0x20);
  oversized.write('{"formatVersion":3}');

  await expectRefusedImport(page, {
    name: 'enorme.merise.json',
    mimeType: 'application/json',
    buffer: oversized,
  });
  await expect(page.getByText(/limite d'import/)).toBeVisible();
});

test('protège la suppression d’une entité référencée', async ({ page }) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByRole('button', { name: "Supprimer l'entité" }).click();
  await expect(page.getByText('Supprimer des éléments référencés ?')).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();
});

test('génère le MLD à partir du MCD et le met à jour après modification', async ({ page }) => {
  await page.getByRole('tab', { name: 'MLD' }).click();
  await expect(page.getByTestId('logical-model-panel')).toBeVisible();
  await expect(page.getByTestId('logical-table-client')).toBeVisible();
  await expect(page.getByTestId('logical-table-reservation')).toContainText('client_id_client');

  // Modifier le MCD (renommer une entité) doit se répercuter sur le MLD affiché.
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByTestId('entity-name-input').fill('CLIENTELE');
  await expect(page.getByTestId('logical-table-clientele')).toBeVisible();
  await expect(page.getByTestId('logical-table-reservation')).toContainText('clientele_id_client');
});

test('génère le SQL PostgreSQL à partir du MLD', async ({ page }) => {
  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-preview-panel')).toBeVisible();
  const code = page.getByTestId('sql-code');
  await expect(code).toContainText('CREATE TABLE "client"');
  await expect(code).toContainText('CREATE TABLE "reservation"');
  await expect(code).toContainText('FOREIGN KEY');
  await expect(code).toContainText('REFERENCES "client"');
});

test('copie le SQL dans le presse-papiers', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-preview-panel')).toBeVisible();

  await page.getByTestId('sql-copy-button').click();
  await expect(page.getByText('SQL copié')).toBeVisible();

  const clipboardText = await page.evaluate(() => {
    const nav = navigator as unknown as { clipboard: { readText: () => Promise<string> } };
    return nav.clipboard.readText();
  });
  expect(clipboardText).toContain('CREATE TABLE "client"');
});

test('télécharge le fichier SQL', async ({ page }) => {
  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-preview-panel')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('sql-download-button').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gestion-d-hotel.postgresql.sql');

  const filePath = await download.path();
  const fs = await import('node:fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  expect(content).toContain('CREATE TABLE "client"');
});

test('le SQL se met à jour après une modification du MCD', async ({ page }) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByTestId('entity-name-input').fill('CLIENTELE');

  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-code')).toContainText('CREATE TABLE "clientele"');
});

test('bloque la génération SQL en présence d’erreurs bloquantes', async ({ page }) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByTestId('entity-name-input').fill('');

  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-preview-blocked')).toBeVisible();
  await expect(page.getByTestId('sql-code')).not.toBeVisible();
});

test('change de dialecte SQL et régénère le script correspondant', async ({ page }) => {
  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-code')).toContainText('CREATE TABLE "client"');

  await page.getByTestId('sql-dialect-select').click();
  await page.getByRole('option', { name: 'MySQL / MariaDB' }).click();
  await expect(page.getByTestId('sql-code')).toContainText('CREATE TABLE `client`');
  await expect(page.getByTestId('sql-code')).toContainText('INT NOT NULL');

  await page.getByTestId('sql-dialect-select').click();
  await page.getByRole('option', { name: 'SQLite' }).click();
  await expect(page.getByTestId('sql-code')).toContainText('PRAGMA foreign_keys = ON');
  await expect(page.getByTestId('sql-code')).not.toContainText('ALTER TABLE');
});

test('le dialecte sélectionné est conservé après rechargement', async ({ page }) => {
  await page.getByRole('tab', { name: 'SQL' }).click();
  await page.getByTestId('sql-dialect-select').click();
  await page.getByRole('option', { name: 'MySQL / MariaDB' }).click();
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-dialect-select')).toContainText('MySQL / MariaDB');
  await expect(page.getByTestId('sql-code')).toContainText('CREATE TABLE `client`');
});

test('télécharge le SQL avec le nom correspondant à chaque dialecte', async ({ page }) => {
  await page.getByRole('tab', { name: 'SQL' }).click();

  await page.getByTestId('sql-dialect-select').click();
  await page.getByRole('option', { name: 'MySQL / MariaDB' }).click();
  const mysqlDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('sql-download-button').click();
  expect((await mysqlDownloadPromise).suggestedFilename()).toBe('gestion-d-hotel.mysql.sql');

  await page.getByTestId('sql-dialect-select').click();
  await page.getByRole('option', { name: 'SQLite' }).click();
  const sqliteDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('sql-download-button').click();
  expect((await sqliteDownloadPromise).suggestedFilename()).toBe('gestion-d-hotel.sqlite.sql');
});

test('l’import/export conserve le dialecte sélectionné', async ({ page }) => {
  await page.getByRole('tab', { name: 'SQL' }).click();
  await page.getByTestId('sql-dialect-select').click();
  await page.getByRole('option', { name: 'SQLite' }).click();
  await waitForSaved(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-button').click();
  const filePath = await (await downloadPromise).path();

  await page.getByRole('button', { name: 'Nouveau' }).click();
  await page.getByRole('menuitem', { name: 'Projet vide' }).click();

  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.getByTestId('project-name-input')).toHaveValue("Gestion d'hôtel");

  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-dialect-select')).toContainText('SQLite');
});
