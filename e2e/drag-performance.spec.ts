/**
 * Garde-fou de performance du glisser-déposer (v0.5.1, voir
 * docs/canvas-performance.md).
 *
 * Le test ne fixe pas de budget en millisecondes — trop dépendant de la
 * machine de CI — mais compare le coût d'un déplacement sur un grand
 * diagramme à celui du *même* déplacement sur un diagramme minuscule, mesuré
 * dans la même session. Ce rapport est la grandeur qui s'était dégradée :
 * 8,7× avant la passe de performance, 1,3× après. Le seuil de 4× détecte un
 * retour à l'architecture précédente sans se déclencher pour quelques
 * millisecondes de variation.
 */
import { expect, test, type Page } from '@playwright/test';
import { writeLargeModelFixture } from './fixtures/large-model.ts';

test.setTimeout(180_000);

const DRAG_STEPS = 40;
/** Rapport maximal toléré entre le grand diagramme et le petit. */
const MAX_RATIO = 4;

async function dragFirstNode(page: Page, steps: number): Promise<number> {
  const box = await page.locator('.react-flow__node').first().boundingBox();
  if (!box) throw new Error('aucun nœud à déplacer');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const started = Date.now();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(startX + step * 2, startY + step);
  }
  const elapsed = Date.now() - started;
  await page.mouse.up();
  return elapsed;
}

test('le déplacement sur un grand diagramme reste proche du coût sur un petit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });

  const { filePath: largePath } = writeLargeModelFixture();
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
  await page.getByTestId('import-file-input').setInputFiles(largePath);
  await expect(page.locator('.react-flow__node')).toHaveCount(250);
  await page.waitForTimeout(1_500);
  const largeMs = await dragFirstNode(page, DRAG_STEPS);

  const { filePath: smallPath } = writeLargeModelFixture({
    entityCount: 2,
    associationCount: 1,
    projectName: 'Petit modele',
  });
  await page.goto('/');
  await page.getByTestId('import-file-input').setInputFiles(smallPath);
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await page.waitForTimeout(800);
  const smallMs = await dragFirstNode(page, DRAG_STEPS);

  const ratio = largeMs / Math.max(smallMs, 1);
  // Diagnostic imprimé par le rapporteur : utile quand le rapport dérive.
  console.log(
    `glisser-déposer : 250 nœuds ${largeMs} ms, 3 nœuds ${smallMs} ms, rapport ${ratio.toFixed(1)}×`,
  );
  expect(ratio).toBeLessThan(MAX_RATIO);
});
