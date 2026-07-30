import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
});

test('crée un identifiant alternatif sur CLIENT.email et le voit reflété en UNIQUE dans le MLD et le SQL', async ({
  page,
}) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await expect(page.getByTestId('identifier-card-primary')).toBeVisible();

  await page.getByTestId('add-alternate-identifier').click();
  const alternateCard = page.locator('[data-testid^="identifier-card-"]').nth(1);
  await alternateCard.getByRole('button', { name: 'Ajouter un attribut' }).click();
  await page.getByRole('menuitem', { name: 'email' }).click();
  await expect(alternateCard).toContainText('email');

  await page.getByRole('tab', { name: 'MLD' }).click();
  await expect(page.getByTestId('logical-table-client')).toContainText('email');

  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-code')).toContainText('UNIQUE ("email")');
});

test('promeut un identifiant alternatif en primaire : le MLD et le SQL se mettent à jour immédiatement', async ({
  page,
}) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByTestId('add-alternate-identifier').click();
  const alternateCard = page.locator('[data-testid^="identifier-card-"]').nth(1);
  await alternateCard.getByRole('button', { name: 'Ajouter un attribut' }).click();
  await page.getByRole('menuitem', { name: 'email' }).click();

  await page.getByRole('tab', { name: 'MLD' }).click();
  await expect(page.getByTestId('logical-table-client')).toContainText('id_client');

  await alternateCard.getByRole('button', { name: 'Promouvoir en identifiant primaire' }).click();
  await expect(page.getByTestId('identifier-card-primary')).toContainText('email');

  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-code')).toContainText('PRIMARY KEY ("email")');

  // Undo ramène l'ancien identifiant primaire (la sélection n'étant pas
  // historisée, elle est réinitialisée : on resélectionne l'entité).
  await page.keyboard.press('Control+z');
  await page.getByTestId('entity-node-CLIENT').click();
  await expect(page.getByTestId('identifier-card-primary')).toContainText('id_client');
});

test('supprime un identifiant alternatif, mais jamais le primaire', async ({ page }) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByTestId('add-alternate-identifier').click();
  const alternateCard = page.locator('[data-testid^="identifier-card-"]').nth(1);

  await alternateCard.getByRole('button', { name: "Supprimer l'identifiant alternatif" }).click();
  await expect(page.locator('[data-testid^="identifier-card-"]')).toHaveCount(1);
  await expect(page.getByTestId('identifier-card-primary')).toBeVisible();
});

test('rejette un identifiant vide via la validation', async ({ page }) => {
  await page.getByTestId('entity-node-CLIENT').click();
  await page.getByTestId('add-alternate-identifier').click();

  await page.getByRole('tab', { name: 'Validation' }).click();
  await expect(page.getByText(/ne référence aucun attribut/)).toBeVisible();
});
