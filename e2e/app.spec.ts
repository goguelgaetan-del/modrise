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
