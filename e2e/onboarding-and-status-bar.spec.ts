import { expect, test } from '@playwright/test';

test.describe('aide de premier lancement', () => {
  test('se parcourt en 4 étapes puis se ferme définitivement', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('diagram-canvas')).toBeVisible();

    const help = page.getByTestId('onboarding-help');
    await expect(help).toBeVisible();
    await expect(page.getByText('Étape 1 / 4')).toBeVisible();

    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-next').click();
    await expect(page.getByText('Étape 4 / 4')).toBeVisible();
    await page.getByTestId('onboarding-next').click(); // "Terminer"
    await expect(help).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('diagram-canvas')).toBeVisible();
    await expect(page.getByTestId('onboarding-help')).toHaveCount(0);
  });

  test('le bouton fermer la referme définitivement sans attendre la fin', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('onboarding-dismiss').click();
    await expect(page.getByTestId('onboarding-help')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('onboarding-help')).toHaveCount(0);
  });

  test('ne recouvre pas les actions du panneau SQL', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.getByRole('tab', { name: 'SQL' }).click();
    await expect(page.getByTestId('sql-preview-panel')).toBeVisible();
    // L'aide reste affichée (premier lancement) mais ne doit pas intercepter
    // les clics sur les actions du panneau inférieur.
    await expect(page.getByTestId('onboarding-help')).toBeVisible();
    await page.getByTestId('sql-copy-button').click();
    await expect(page.getByText('SQL copié')).toBeVisible();
  });
});

test.describe('barre de statut', () => {
  test('affiche les comptes et le dialecte, et ouvre la validation au clic sur les erreurs', async ({
    page,
  }) => {
    await page.goto('/');
    const statusBar = page.getByTestId('status-bar');
    await expect(statusBar).toBeVisible();
    await expect(statusBar).toContainText('PostgreSQL');

    await page.getByTestId('status-bar-error-count').click();
    await expect(page.getByTestId('validation-panel')).toBeVisible();
  });
});
