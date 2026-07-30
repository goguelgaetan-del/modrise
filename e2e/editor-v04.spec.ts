import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('diagram-canvas')).toBeVisible();
  // Le diagramme d'exemple monte ses nœuds React Flow de façon asynchrone ;
  // attendre qu'une entité connue soit visible avant de compter les nœuds
  // évite de capturer un compte de 0 par une course avec ce montage.
  await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();
});

test.describe('historique (annuler/rétablir)', () => {
  test('Ctrl+Z / Ctrl+Shift+Z annulent et rétablissent la création d’une entité', async ({ page }) => {
    const nodesBefore = await page.locator('.react-flow__node').count();
    await page.getByTestId('add-entity').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);

    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore);

    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);
  });

  test('les boutons Annuler/Rétablir de la barre supérieure fonctionnent et affichent le libellé de l’action', async ({
    page,
  }) => {
    await page.getByTestId('add-association').click();
    const undoButton = page.getByRole('button', { name: /Annuler/ });
    await expect(undoButton).toBeEnabled();

    const nodesBefore = await page.locator('.react-flow__node').count();
    await undoButton.click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore - 1);
    await expect(page.getByRole('button', { name: /Rétablir/ })).toBeEnabled();
  });

  test('renommer une entité produit une seule entrée d’historique par session d’édition', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    const nameInput = page.getByTestId('entity-name-input');
    await nameInput.fill('CLIENTELE');
    await nameInput.blur();
    await expect(page.getByTestId('entity-node-CLIENTELE')).toBeVisible();

    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('entity-node-CLIENT')).toBeVisible();
  });

  test('un glissement continu ne produit qu’une seule entrée d’historique', async ({ page }) => {
    const node = page.getByTestId('entity-node-CLIENT');
    const before = (await node.boundingBox())!;

    await page.mouse.move(before.x + before.width / 2, before.y + 10);
    await page.mouse.down();
    // Plusieurs mouvements intermédiaires pendant le même glissement : ils ne
    // doivent produire aucune entrée d'historique séparée.
    await page.mouse.move(before.x + before.width / 2 + 40, before.y + 40, { steps: 4 });
    await page.mouse.move(before.x + before.width / 2 + 120, before.y + 90, { steps: 4 });
    await page.mouse.up();

    const afterDrag = (await node.boundingBox())!;
    expect(Math.abs(afterDrag.x - before.x)).toBeGreaterThan(50);

    // Un seul Ctrl+Z doit ramener le nœud exactement à sa position de départ
    // (et pas seulement partiellement, ce qui indiquerait plusieurs entrées).
    await page.keyboard.press('Control+z');
    const afterUndo = (await node.boundingBox())!;
    expect(Math.round(afterUndo.x)).toBe(Math.round(before.x));
    expect(Math.round(afterUndo.y)).toBe(Math.round(before.y));

    // Un deuxième Ctrl+Z ne doit rien changer de plus (rien d'autre à annuler).
    await page.keyboard.press('Control+z');
    const afterSecondUndo = (await node.boundingBox())!;
    expect(Math.round(afterSecondUndo.x)).toBe(Math.round(before.x));
  });

  test('undo/redo déclenche l’autosauvegarde', async ({ page }) => {
    await page.getByTestId('add-entity').click();
    await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement', {
      timeout: 10_000,
    });

    await page.keyboard.press('Control+z');
    await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement', {
      timeout: 10_000,
    });
  });
});

test.describe('raccourcis clavier ignorés dans les champs de saisie', () => {
  test('Ctrl+C/Ctrl+V dans le champ de nom ne déclenchent pas le presse-papiers interne', async ({
    page,
  }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    const nameInput = page.getByTestId('entity-name-input');
    await nameInput.click();
    await nameInput.selectText();

    const nodesBefore = await page.locator('.react-flow__node').count();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    // Aucun nouveau nœud collé : le raccourci applicatif n'a pas intercepté
    // le copier/coller natif du champ.
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore);
  });

  test('Ctrl+Z dans un champ de saisie n’annule pas une action de l’éditeur', async ({ page }) => {
    await page.getByTestId('add-entity').click();
    const nodesBefore = await page.locator('.react-flow__node').count();

    await page.getByTestId('project-name-input').click();
    await page.keyboard.press('Control+z');
    // Toujours le même nombre de nœuds : le Ctrl+Z n'a pas atteint le raccourci global.
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore);
  });
});

test.describe('presse-papiers (copier/coller/dupliquer)', () => {
  test('Ctrl+C puis Ctrl+V collent une copie décalée de la sélection', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    const nodesBefore = await page.locator('.react-flow__node').count();

    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);
  });

  test('Ctrl+D duplique la sélection sans passer par le presse-papiers utilisateur', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    const nodesBefore = await page.locator('.react-flow__node').count();

    await page.keyboard.press('Control+d');
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);
  });

  test('une association n’est copiée que si au moins deux participations sont sélectionnées', async ({ page }) => {
    // EFFECTUER relie CLIENT et RESERVATION : sélectionner seulement CLIENT + EFFECTUER
    // ne doit pas suffire à copier l'association (une seule participation présente).
    await page.getByTestId('entity-node-CLIENT').click();
    await page.getByTestId('association-node-EFFECTUER').click({ modifiers: ['Shift'] });
    await page.keyboard.press('Control+c');

    const nodesBefore = await page.locator('.react-flow__node').count();
    await page.keyboard.press('Control+v');
    // Seule l'entité CLIENT est copiable ici : un seul nouveau nœud apparaît.
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);
  });
});

test.describe('sélection multiple', () => {
  test('l’inspecteur affiche les actions groupées et duplique/supprime la sélection', async ({ page }) => {
    await page.getByTestId('entity-node-CLIENT').click();
    await page.getByTestId('entity-node-CHAMBRE').click({ modifiers: ['Shift'] });
    await expect(page.getByText(/éléments sélectionnés/)).toBeVisible();

    const nodesBefore = await page.locator('.react-flow__node').count();
    await page.getByRole('button', { name: 'Dupliquer' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 2);

    await page.getByRole('button', { name: 'Supprimer la sélection' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore);
  });

  test('Ctrl+A sélectionne tous les éléments puis Échap désélectionne', async ({ page }) => {
    await page.keyboard.press('Control+a');
    await expect(page.getByText(/éléments sélectionnés/)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByText(/éléments sélectionnés/)).not.toBeVisible();
  });
});

test.describe('commentaires graphiques', () => {
  test('ajoute, édite et supprime un commentaire sans toucher au modèle conceptuel', async ({ page }) => {
    await page.getByTestId('add-comment').click();
    const comment = page.locator('[data-testid^="comment-node-"]');
    await expect(comment).toBeVisible();

    await comment.dblclick();
    const textarea = page.getByTestId('comment-textarea');
    await textarea.fill('Note importante');
    await textarea.blur();
    await expect(comment).toContainText('Note importante');

    await comment.click();
    await page.keyboard.press('Delete');
    await expect(comment).toHaveCount(0);
  });
});

test.describe('menu contextuel', () => {
  test('le clic droit sur le canvas vide propose d’ajouter une entité', async ({ page }) => {
    const canvas = page.getByTestId('diagram-canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + 100, { button: 'right' });

    const menu = page.getByTestId('canvas-context-menu');
    await expect(menu).toBeVisible();

    const nodesBefore = await page.locator('.react-flow__node').count();
    await page.getByRole('menuitem', { name: 'Ajouter une entité' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(nodesBefore + 1);
    await expect(menu).not.toBeVisible();
  });

  test('Échap ferme le menu contextuel', async ({ page }) => {
    const canvas = page.getByTestId('diagram-canvas');
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + 100, { button: 'right' });
    await expect(page.getByTestId('canvas-context-menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('canvas-context-menu')).not.toBeVisible();
  });
});

test.describe('export SVG/PNG', () => {
  test('exporte un SVG vectoriel contenant les entités, associations et cardinalités', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter en image' }).click();
    await page.getByTestId('export-svg').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('gestion-d-hotel.mcd.svg');

    const content = await fs.readFile((await download.path())!, 'utf-8');
    expect(content).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(content).toContain('CLIENT');
    expect(content).toContain('EFFECTUER');
    expect(content).toMatch(/0,N|1,N|1,1/);
  });

  test('exporte un PNG non vide', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter en image' }).click();
    await page.getByTestId('export-png').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('gestion-d-hotel.mcd.png');

    const stats = await fs.stat((await download.path())!);
    expect(stats.size).toBeGreaterThan(1000);
  });
});

test('l’état vide s’affiche sur un projet sans élément et propose d’en ajouter un', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouveau' }).click();
  await page.getByRole('menuitem', { name: 'Projet vide' }).click();

  await expect(page.getByText('Commencez votre MCD')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter une entité' }).click();
  await expect(page.getByText('Commencez votre MCD')).not.toBeVisible();
});
