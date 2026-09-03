/**
 * Comportement fonctionnel du glisser-déposer après le passage à la
 * transaction transitoire (v0.5.1, voir docs/canvas-performance.md).
 *
 * Le garde-fou de performance vit dans `drag-performance.spec.ts` ; ici on
 * vérifie que l'optimisation n'a rien changé de ce que l'utilisateur
 * constate : le déplacement est visible, annulable en un seul Ctrl+Z,
 * respecte les nœuds verrouillés, ne perturbe pas les panneaux dérivés, et
 * ne persiste que la position finale.
 */
import { expect, test, type Page } from '@playwright/test';
import { writeLargeModelFixture } from './fixtures/large-model.ts';

test.setTimeout(120_000);

/**
 * Transformation CSS du conteneur React Flow d'un nœud : c'est elle qui
 * porte la position à l'écran, et elle change dès que le nœud bouge.
 */
async function nodeTransform(page: Page, nodeId: string): Promise<string> {
  return page
    .locator(`.react-flow__node[data-id="${nodeId}"]`)
    .evaluate((element: unknown) => (element as { style: { transform: string } }).style.transform);
}

/**
 * Position du nœud dans le repère du diagramme, extraite de sa
 * transformation. On ne compare pas des pixels d'écran : un recadrage
 * automatique change le zoom et fausserait les écarts relatifs.
 */
async function nodePosition(page: Page, nodeId: string): Promise<{ x: number; y: number }> {
  const transform = await nodeTransform(page, nodeId);
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(transform);
  if (!match) throw new Error(`transformation illisible pour ${nodeId} : « ${transform} »`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

/**
 * Déplace un nœud en plusieurs étapes, comme le ferait un utilisateur : ce
 * sont ces étapes intermédiaires qui produisaient autrefois une écriture du
 * store par image.
 */
async function dragNodeBy(
  page: Page,
  nodeId: string,
  dx: number,
  dy: number,
  steps = 12,
): Promise<void> {
  const box = await page.locator(`.react-flow__node[data-id="${nodeId}"]`).boundingBox();
  if (!box) throw new Error(`nœud ${nodeId} introuvable`);
  const startX = box.x + box.width / 2;
  const startY = box.y + 12;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(startX + (dx * step) / steps, startY + (dy * step) / steps);
  }
  await page.mouse.up();
}

async function openFixture(page: Page, options: Parameters<typeof writeLargeModelFixture>[0]) {
  const { filePath, fixture } = writeLargeModelFixture(options);
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
  await page.getByTestId('import-file-input').setInputFiles(filePath);
  await expect(page.locator('.react-flow__node')).toHaveCount(fixture.nodeCount);
  return fixture;
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
});

test('déplacement simple : visible, annulable et rétablissable en une action', async ({ page }) => {
  await openFixture(page, { entityCount: 100, associationCount: 150, zoom: 1 });

  const before = await nodeTransform(page, 'n-e-0');
  await dragNodeBy(page, 'n-e-0', 160, 90);

  const after = await nodeTransform(page, 'n-e-0');
  expect(after).not.toBe(before);

  // Un déplacement continu ne produit qu'une entrée d'historique : un seul
  // Ctrl+Z suffit à revenir exactement à la position de départ.
  await page.keyboard.press('Control+z');
  expect(await nodeTransform(page, 'n-e-0')).toBe(before);

  await page.keyboard.press('Control+Shift+z');
  expect(await nodeTransform(page, 'n-e-0')).toBe(after);
});

test('déplacement groupé : positions relatives préservées et annulation unique', async ({
  page,
}) => {
  await openFixture(page, { entityCount: 12, associationCount: 6, columns: 4, zoom: 1 });

  const ids = ['n-e-0', 'n-e-1', 'n-e-4'];
  const initialTransforms = await Promise.all(ids.map((id) => nodeTransform(page, id)));
  const initialPositions = await Promise.all(ids.map((id) => nodePosition(page, id)));

  await page.locator('.react-flow__node[data-id="n-e-0"]').click();
  await page.locator('.react-flow__node[data-id="n-e-1"]').click({ modifiers: ['Shift'] });
  await page.locator('.react-flow__node[data-id="n-e-4"]').click({ modifiers: ['Shift'] });

  await dragNodeBy(page, 'n-e-0', 140, 70);

  const movedPositions = await Promise.all(ids.map((id) => nodePosition(page, id)));
  for (const [index, id] of ids.entries()) {
    expect(await nodeTransform(page, id), `${id} devait bouger`).not.toBe(
      initialTransforms[index],
    );
  }

  // Le groupe s'est translaté en bloc : les écarts entre nœuds sont intacts.
  for (let index = 1; index < ids.length; index += 1) {
    expect(Math.round(movedPositions[index]!.x - movedPositions[0]!.x)).toBe(
      Math.round(initialPositions[index]!.x - initialPositions[0]!.x),
    );
    expect(Math.round(movedPositions[index]!.y - movedPositions[0]!.y)).toBe(
      Math.round(initialPositions[index]!.y - initialPositions[0]!.y),
    );
  }

  // Trois nœuds déplacés, une seule entrée d'historique.
  await page.keyboard.press('Control+z');
  for (const [index, id] of ids.entries()) {
    expect(await nodeTransform(page, id)).toBe(initialTransforms[index]);
  }
});

test('nœud verrouillé : immobile dans une sélection qui se déplace', async ({ page }) => {
  await openFixture(page, {
    entityCount: 12,
    associationCount: 6,
    columns: 4,
    zoom: 1,
    lockedEntityIndexes: [0],
  });

  const lockedBefore = await nodeTransform(page, 'n-e-0');
  const freeBefore = await nodeTransform(page, 'n-e-1');

  await page.locator('.react-flow__node[data-id="n-e-0"]').click();
  await page.locator('.react-flow__node[data-id="n-e-1"]').click({ modifiers: ['Shift'] });

  // On saisit le nœud libre : React Flow n'entraîne pas le nœud verrouillé,
  // et la transaction l'exclut de toute façon au démarrage.
  await dragNodeBy(page, 'n-e-1', 150, 80);

  expect(await nodeTransform(page, 'n-e-0')).toBe(lockedBefore);
  expect(await nodeTransform(page, 'n-e-1')).not.toBe(freeBefore);
});

test('stabilité des panneaux : le SQL n’est pas régénéré pendant un déplacement', async ({
  page,
}) => {
  await openFixture(page, { entityCount: 12, associationCount: 6, columns: 4, zoom: 1 });

  await page.getByRole('tab', { name: 'SQL' }).click();
  await expect(page.getByTestId('sql-preview-panel')).toBeVisible();
  const sqlBefore = await page.getByTestId('sql-code').innerText();
  expect(sqlBefore).toContain('CREATE TABLE');

  await dragNodeBy(page, 'n-e-1', 140, 60);

  // Une position n'appartient pas au modèle conceptuel : ni le dialecte ne
  // se recharge, ni le SQL ne change.
  await expect(page.getByTestId('sql-preview-panel')).toBeVisible();
  await expect(page.getByTestId('sql-dialect-loading')).toHaveCount(0);
  expect(await page.getByTestId('sql-code').innerText()).toBe(sqlBefore);
});

test('sauvegarde : seule la position finale du déplacement est persistée', async ({ page }) => {
  await openFixture(page, { entityCount: 12, associationCount: 6, columns: 4, zoom: 1 });
  await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement', {
    timeout: 10_000,
  });

  const box = await page.locator('.react-flow__node[data-id="n-e-2"]').boundingBox();
  if (!box) throw new Error('nœud n-e-2 introuvable');
  const startX = box.x + box.width / 2;
  const startY = box.y + 12;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let step = 1; step <= 20; step += 1) {
    await page.mouse.move(startX + step * 8, startY + step * 4);
  }
  // Aucune position intermédiaire n'a atteint le store : le projet est
  // toujours considéré comme enregistré au moment du relâchement.
  await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement');
  await page.mouse.up();

  const finalTransform = await nodeTransform(page, 'n-e-2');
  await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement', {
    timeout: 10_000,
  });

  await page.reload();
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
  await expect(page.locator('.react-flow__node[data-id="n-e-2"]')).toBeVisible();
  expect(await nodeTransform(page, 'n-e-2')).toBe(finalTransform);
});
