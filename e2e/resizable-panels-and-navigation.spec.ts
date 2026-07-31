import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
});

test.describe('panneaux redimensionnables', () => {
  test('trois séparateurs sont présents et redimensionnent sans erreur console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const separators = page.locator('[data-separator]');
    await expect(separators).toHaveCount(3);

    const sep = separators.first();
    const box = (await sep.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    expect(errors).toEqual([]);
  });

  test('double-clic sur un séparateur restaure la taille par défaut', async ({ page }) => {
    const sidebarBefore = (await page.getByTestId('add-entity').boundingBox())!;

    const box = (await page.locator('[data-separator]').first().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const sidebarResized = (await page.getByTestId('add-entity').boundingBox())!;
    expect(sidebarResized.width).not.toBe(sidebarBefore.width);

    const boxAfterResize = (await page.locator('[data-separator]').first().boundingBox())!;
    const clickX = boxAfterResize.x + boxAfterResize.width / 2;
    const clickY = boxAfterResize.y + boxAfterResize.height / 2;
    await page.mouse.dblclick(clickX, clickY);

    const sidebarReset = (await page.getByTestId('add-entity').boundingBox())!;
    expect(Math.round(sidebarReset.width)).toBe(Math.round(sidebarBefore.width));
  });

  test('le panneau inférieur affiche le dialecte SQL courant', async ({ page }) => {
    await expect(page.getByTestId('bottom-panel-dialect-indicator')).toHaveText('PostgreSQL');
  });
});

test.describe('interface tablette (< 1200px)', () => {
  test.use({ viewport: { width: 1000, height: 800 } });

  test('la bibliothèque et l’inspecteur deviennent des tiroirs', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    // En mode tablette, seul le séparateur vertical (canevas / panneau
    // inférieur) existe : le groupe horizontal bibliothèque/canevas/
    // inspecteur n'est pas rendu (remplacé par les tiroirs).
    await expect(page.locator('[data-separator]')).toHaveCount(1);
    await expect(page.getByTestId('sidebar-drawer-toggle')).toBeVisible();

    await page.getByTestId('sidebar-drawer-toggle').click();
    await expect(page.getByTestId('sidebar-drawer')).toHaveClass(/translate-x-0/);
    await page.getByTestId('sidebar-drawer-toggle').click();
    await expect(page.getByTestId('sidebar-drawer')).not.toHaveClass(/translate-x-0/);

    await page.getByTestId('entity-node-CLIENT').click();
    await expect(page.getByTestId('inspector-drawer')).toHaveClass(/translate-x-0/);
  });
});

test.describe('écran trop étroit (< 768px)', () => {
  test.use({ viewport: { width: 600, height: 800 } });

  test('affiche un message non bloquant, sans rien désactiver', async ({ page }) => {
    await expect(page.getByTestId('narrow-screen-notice')).toBeVisible();
    // L'application reste utilisable : on peut toujours créer une entité.
    await page.getByTestId('sidebar-drawer-toggle').click();
    await page.getByTestId('add-entity').click();
    await expect(page.getByTestId('entity-node-NOUVELLE_ENTITE')).toBeVisible();
  });
});

test.describe('navigation entre problèmes de validation (F8)', () => {
  test('F8 sélectionne et centre le problème, ouvre la validation', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    await page.getByTestId('entity-name-input').fill('');
    await page.getByTestId('entity-name-input').blur();

    const canvasBox = (await page.getByTestId('diagram-canvas').boundingBox())!;
    await page.mouse.click(canvasBox.x + canvasBox.width - 50, canvasBox.y + canvasBox.height - 50);

    await page.keyboard.press('F8');
    await expect(page.getByTestId('validation-panel')).toBeVisible();
    await expect(page.locator('.react-flow__node.selected')).toHaveCount(1);
  });

  test('F8 est ignoré quand le focus est dans un champ de saisie', async ({ page }) => {
    await page.getByTestId('project-name-input').click();
    await page.keyboard.press('F8');
    // Toujours dans le champ : pas de navigation, le focus n'a pas bougé.
    await expect(page.getByTestId('project-name-input')).toBeFocused();
  });
});
