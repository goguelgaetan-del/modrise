import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
});

async function nodeTransform(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((el: unknown) => {
    const node = (el as { closest: (s: string) => { style: { transform: string } } }).closest(
      '.react-flow__node',
    );
    return node?.style.transform ?? '';
  });
}

async function dragNode(page: Page, testId: string) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 100, box.y + 100, { steps: 5 });
  await page.mouse.up();
}

test.describe('verrouillage de nœuds', () => {
  test('un nœud verrouillé ne bouge ni au glisser-déposer ni à l’auto-layout', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Verrouiller' }).click();
    const before = await nodeTransform(page, 'entity-node-CLIENT');

    await dragNode(page, 'entity-node-CLIENT');
    expect(await nodeTransform(page, 'entity-node-CLIENT')).toBe(before);

    await page.getByTestId('auto-layout-button').click();
    await page.getByTestId('auto-layout-horizontal').click();
    await page.waitForTimeout(300);
    expect(await nodeTransform(page, 'entity-node-CLIENT')).toBe(before);
  });

  test('déverrouiller un nœud lui permet à nouveau d’être déplacé', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Verrouiller' }).click();
    const before = await nodeTransform(page, 'entity-node-CLIENT');

    await page.getByTestId('entity-node-CLIENT').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Déverrouiller' }).click();
    await dragNode(page, 'entity-node-CLIENT');
    expect(await nodeTransform(page, 'entity-node-CLIENT')).not.toBe(before);
  });

  test('verrouiller/déverrouiller est annulable', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Verrouiller' }).click();
    const before = await nodeTransform(page, 'entity-node-CLIENT');

    await page.keyboard.press('Control+z');
    // Déverrouillé à nouveau : le glisser-déposer doit fonctionner.
    await dragNode(page, 'entity-node-CLIENT');
    expect(await nodeTransform(page, 'entity-node-CLIENT')).not.toBe(before);
  });
});

test.describe('alignement et distribution', () => {
  test('aligne trois entités à gauche et affiche les actions dès deux éléments sélectionnés', async ({
    page,
  }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    await expect(page.getByRole('button', { name: 'Aligner à gauche' })).not.toBeVisible();

    await page.getByTestId('entity-node-CHAMBRE').click({ modifiers: ['Shift'] });
    await expect(page.getByRole('button', { name: 'Aligner à gauche' })).toBeVisible();

    await page.getByRole('button', { name: 'Aligner à gauche' }).click();
    const clientBox = (await page.getByTestId('entity-node-CLIENT').boundingBox())!;
    const chambreBox = (await page.getByTestId('entity-node-CHAMBRE').boundingBox())!;
    expect(Math.round(clientBox.x)).toBe(Math.round(chambreBox.x));
  });

  test('la distribution n’apparaît qu’à partir de trois éléments sélectionnés', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    await page.getByTestId('entity-node-CHAMBRE').click({ modifiers: ['Shift'] });
    await expect(page.getByRole('button', { name: 'Distribuer horizontalement' })).not.toBeVisible();

    await page.getByTestId('entity-node-RESERVATION').click({ modifiers: ['Shift'] });
    await expect(page.getByRole('button', { name: 'Distribuer horizontalement' })).toBeVisible();
  });

  test('alignement et distribution sont annulables en une seule action chacun', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    await page.getByTestId('entity-node-RESERVATION').click({ modifiers: ['Shift'] });
    const before = await nodeTransform(page, 'entity-node-RESERVATION');

    await page.getByRole('button', { name: 'Aligner à gauche' }).click();
    expect(await nodeTransform(page, 'entity-node-RESERVATION')).not.toBe(before);

    await page.keyboard.press('Control+z');
    expect(await nodeTransform(page, 'entity-node-RESERVATION')).toBe(before);
  });
});
