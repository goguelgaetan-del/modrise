/**
 * Vérification d'un grand modèle (~100 entités, ~150 associations, 250
 * nœuds de diagramme) : pas un banc de mesure scientifique, mais un
 * contrôle de non-régression contre les blocages évidents (import, édition,
 * navigation entre panneaux, organisation automatique, sauvegarde, export).
 * Les seuils sont volontairement larges — ils détectent un blocage réel,
 * pas une variation de quelques millisecondes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { createProject } from '../src/core/project/types';
import { serializeProject } from '../src/core/serialization/file-format';
import { largeModel } from '../src/tests/fixtures/models';
import type { DiagramNode } from '../src/core/diagram/types';

function buildLargeProjectFile(): string {
  const model = largeModel({ entityCount: 100, associationCount: 150, attributesPerEntity: 5 });
  const project = createProject({ name: 'Grand modele' });
  project.conceptualModel = model;

  const nodes: DiagramNode[] = [];
  const cols = 16;
  let index = 0;
  for (const entity of model.entities) {
    nodes.push({
      id: `n-e-${index}`,
      modelId: entity.id,
      nodeType: 'entity',
      position: { x: (index % cols) * 260 + 40, y: Math.floor(index / cols) * 220 + 100 },
      width: 200,
      height: 160,
    });
    index += 1;
  }
  for (const association of model.associations) {
    nodes.push({
      id: `n-a-${index}`,
      modelId: association.id,
      nodeType: 'association',
      position: { x: (index % cols) * 260 + 40, y: Math.floor(index / cols) * 220 + 100 },
      width: 160,
      height: 60,
    });
    index += 1;
  }
  project.diagram.nodes = nodes;
  project.diagram.viewport = { x: 0, y: 0, zoom: 0.5 };

  const filePath = path.join(os.tmpdir(), `modrise-large-model-${Date.now()}.merise.json`);
  fs.writeFileSync(filePath, serializeProject(project));
  return filePath;
}

test.setTimeout(60_000);

test('large model (~100 entities, ~150 associations) stays responsive', async ({ page }) => {
  // Grande fenêtre : le fitView initial n'a alors pas besoin de descendre
  // sous le plancher minZoom=0.2 du canevas pour cette disposition en grille
  // brute, ce qui garderait sinon les premières lignes hors du cadre visible
  // (limite du canevas, pas un défaut de ce fixture ni de l'application).
  await page.setViewportSize({ width: 2400, height: 1600 });

  const filePath = buildLargeProjectFile();
  try {
    await page.goto('/');
    await expect(page.getByTestId('diagram-canvas')).toBeVisible();

    await page.getByTestId('import-file-input').setInputFiles(filePath);
    await expect(page.getByTestId('project-name-input')).toHaveValue('Grand modele');
    await expect(page.locator('.react-flow__node')).toHaveCount(250);

    await expect(page.getByTestId('entity-node-ENTITE_0')).toBeInViewport();

    // Renommer une entité : lecture clavier -> re-rendu.
    await page.getByTestId('entity-node-ENTITE_0').click();
    const nameInput = page.getByTestId('entity-name-input');
    let t0 = Date.now();
    await nameInput.fill('ENTITE_0_RENOMMEE');
    await expect(page.getByTestId('entity-node-ENTITE_0_RENOMMEE')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(5_000);

    // Déplacer un nœud (glisser-déposer).
    t0 = Date.now();
    await page.mouse.move(900, 700);
    await page.mouse.down();
    await page.mouse.move(700, 600, { steps: 10 });
    await page.mouse.up();
    expect(Date.now() - t0).toBeLessThan(10_000);

    // Onglets Validation / MLD / SQL.
    t0 = Date.now();
    await page.getByRole('tab', { name: 'Validation' }).click();
    await expect(page.getByTestId('validation-panel')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(5_000);

    t0 = Date.now();
    await page.getByRole('tab', { name: 'MLD' }).click();
    await expect(page.getByTestId('logical-model-panel')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(5_000);

    t0 = Date.now();
    await page.getByRole('tab', { name: 'SQL' }).click();
    await expect(page.getByTestId('sql-code')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(5_000);

    // Organisation automatique (dagre) sur les 250 nœuds.
    t0 = Date.now();
    await page.getByTestId('auto-layout-button').click();
    await page.getByTestId('auto-layout-horizontal').click();
    await page.waitForTimeout(600);
    await expect(page.locator('.react-flow__node')).toHaveCount(250);
    expect(Date.now() - t0).toBeLessThan(10_000);

    // Sauvegarde.
    t0 = Date.now();
    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('save-status')).toHaveText('Enregistré localement', {
      timeout: 15_000,
    });
    expect(Date.now() - t0).toBeLessThan(15_000);

    // Export SVG.
    t0 = Date.now();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter en image' }).click();
    await page.getByTestId('export-svg').click();
    await downloadPromise;
    expect(Date.now() - t0).toBeLessThan(10_000);
  } finally {
    fs.rmSync(filePath, { force: true });
  }
});
