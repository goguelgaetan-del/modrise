/**
 * Panneau de diagnostic de performance (§28) : il doit rester invisible pour
 * un utilisateur normal.
 *
 * Ces tests s'exécutent sur le serveur de développement, donc avec
 * `import.meta.env.DEV` à vrai : ils vérifient la garde d'URL. La seconde
 * garde — l'absence pure et simple du panneau d'un build de production — se
 * vérifie sur le bundle et non dans un navigateur (voir
 * docs/canvas-performance.md).
 */
import { expect, test } from '@playwright/test';

test('le panneau de diagnostic reste caché sans paramètre', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();

  await expect(page.getByTestId('performance-debug-panel')).toHaveCount(0);
});

test('le panneau de diagnostic apparaît avec ?debugPerformance=1', async ({ page }) => {
  await page.goto('/?debugPerformance=1');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();

  const panel = page.getByTestId('performance-debug-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Rendus du canvas');
  await expect(panel).toContainText('Nœuds');
});
