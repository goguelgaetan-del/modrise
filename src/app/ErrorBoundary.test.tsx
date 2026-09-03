/**
 * La barrière d'erreur a une promesse simple : plus jamais de page blanche,
 * et jamais de travail perdu sans qu'on ait au moins proposé de le sauver.
 * C'est ce que ces tests vérifient — plus le fait qu'elle ne cache rien au
 * développeur.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const downloadProjectFile = vi.fn();
const assembleCurrentProject = vi.fn(() => ({ name: 'Projet' }));

vi.mock('@/features/projects/import-export', () => ({
  get downloadProjectFile() {
    return downloadProjectFile;
  },
}));
vi.mock('@/stores/project-assembly', () => ({
  get assembleCurrentProject() {
    return assembleCurrentProject;
  },
}));

function Exploding(): never {
  throw new Error('panne simulée');
}

beforeEach(() => {
  // React réémet l'erreur rattrapée sur la console : on la tait pour ne pas
  // polluer la sortie des tests, tout en vérifiant plus bas qu'elle est bien
  // émise.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  downloadProjectFile.mockClear();
  assembleCurrentProject.mockClear();
});

describe("barrière d'erreur", () => {
  it('laisse passer un arbre sain', () => {
    render(
      <ErrorBoundary>
        <p>contenu</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('contenu')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
  });

  it('affiche un message compréhensible au lieu d’une page blanche', () => {
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    const alert = screen.getByTestId('error-boundary');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent('Modrise s’est interrompu');
    expect(alert).toHaveTextContent('Votre projet n’a pas été perdu');
  });

  it('montre le détail technique en développement', () => {
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary')).toHaveTextContent('panne simulée');
  });

  it("n'expose aucune pile d'appels en production", () => {
    vi.stubEnv('DEV', false);

    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    const alert = screen.getByTestId('error-boundary');
    expect(alert).toHaveTextContent('Modrise s’est interrompu');
    expect(alert).not.toHaveTextContent('panne simulée');
    expect(alert.querySelector('pre')).toBeNull();

    vi.unstubAllEnvs();
  });

  it("n'avale pas l'erreur : elle reste lisible dans la console", () => {
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      'Erreur non rattrapée dans le rendu :',
      expect.objectContaining({ message: 'panne simulée' }),
      expect.anything(),
    );
  });

  it('propose de recharger', async () => {
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-reload')).toBeVisible();
  });

  it('télécharge une copie du projet à la demande', async () => {
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByTestId('error-boundary-export'));

    expect(assembleCurrentProject).toHaveBeenCalledTimes(1);
    expect(downloadProjectFile).toHaveBeenCalledWith({ name: 'Projet' });
    expect(await screen.findByText('Copie téléchargée.')).toBeVisible();
  });

  it("signale l'échec de la copie plutôt que de le taire", async () => {
    assembleCurrentProject.mockImplementationOnce(() => {
      throw new Error('stores vides');
    });
    render(
      <ErrorBoundary>
        <Exploding />
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByTestId('error-boundary-export'));

    expect(downloadProjectFile).not.toHaveBeenCalled();
    expect(await screen.findByText(/n’a pas pu être produite/)).toBeVisible();
  });
});
