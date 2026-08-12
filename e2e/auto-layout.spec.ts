import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
});

async function nodeTransform(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((el: unknown) => {
    const node = (el as { closest: (selector: string) => { style: { transform: string } } }).closest(
      '.react-flow__node',
    );
    return node?.style.transform ?? '';
  });
}

test('organise automatiquement le diagramme (horizontal) en une seule entrée d’historique', async ({
  page,
}) => {
  const before = await nodeTransform(page, 'entity-node-CLIENT');

  await page.getByTestId('auto-layout-button').click();
  await page.getByTestId('auto-layout-horizontal').click();

  await expect
    .poll(() => nodeTransform(page, 'entity-node-CLIENT'))
    .not.toBe(before);

  await page.keyboard.press('Control+z');
  await expect.poll(() => nodeTransform(page, 'entity-node-CLIENT')).toBe(before);
});

test('la disposition verticale produit un agencement différent de l’horizontale', async ({ page }) => {
  await page.getByTestId('auto-layout-button').click();
  await page.getByTestId('auto-layout-horizontal').click();
  await expect.poll(() => nodeTransform(page, 'entity-node-RESERVATION')).not.toBe('');
  const afterHorizontal = await nodeTransform(page, 'entity-node-RESERVATION');
  // Laisse l'animation de recentrage (fitView) se stabiliser avant de rouvrir
  // le menu, sans quoi le clic peut viser un nœud du DOM en cours de re-rendu.
  await page.waitForTimeout(400);

  await page.getByTestId('auto-layout-button').click();
  await page.getByTestId('auto-layout-vertical').click();
  await expect
    .poll(() => nodeTransform(page, 'entity-node-RESERVATION'))
    .not.toBe(afterHorizontal);
});

test('organise un diagramme comportant un commentaire sans erreur', async ({ page }) => {
  await page.getByTestId('add-comment').click();
  await expect(page.locator('[data-testid^="comment-node-"]')).toBeVisible();

  await page.getByTestId('auto-layout-button').click();
  await page.getByTestId('auto-layout-horizontal').click();
  await expect(page.locator('[data-testid^="comment-node-"]')).toBeVisible();
  // Toujours cohérent : aucune erreur de validation introduite par le layout.
  await page.getByRole('tab', { name: 'Validation' }).click();
  await expect(page.getByText('Aucun problème à afficher')).toBeVisible();
});
