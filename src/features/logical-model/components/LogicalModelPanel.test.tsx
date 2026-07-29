import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { createEntity } from '@/core/conceptual-model/factories';
import { createProject } from '@/core/project/types';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import { LogicalModelPanel } from './LogicalModelPanel';

function loadProject(project: ReturnType<typeof createProject>) {
  useProjectStore.getState().loadProject(project);
}

describe('LogicalModelPanel', () => {
  it('affiche les tables, leurs colonnes et les badges PK/FK', () => {
    loadProject(createHotelExampleProject());
    render(<LogicalModelPanel />);

    expect(screen.getByTestId('logical-table-client')).toBeInTheDocument();
    expect(screen.getByTestId('logical-table-reservation')).toBeInTheDocument();
    expect(screen.getByTestId('logical-table-reservation')).toHaveTextContent('client_id_client');
    expect(screen.getAllByLabelText('Clé primaire').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Clé étrangère').length).toBeGreaterThan(0);
  });

  it('affiche la contrainte unique sur email dans la table client', () => {
    loadProject(createHotelExampleProject());
    render(<LogicalModelPanel />);
    const clientTable = screen.getByTestId('logical-table-client');
    expect(clientTable).toHaveTextContent('uq_client_email');
  });

  it('affiche un message bloquant quand le MCD contient des erreurs', () => {
    const project = createProject();
    const entity = createEntity({ name: '' }); // nom vide → erreur de validation
    project.conceptualModel.entities.push(entity);
    loadProject(project);
    render(<LogicalModelPanel />);
    expect(screen.getByTestId('logical-model-blocked')).toBeInTheDocument();
    expect(screen.queryByTestId('logical-model-panel')).not.toBeInTheDocument();
  });

  it('le bouton du message bloquant bascule vers l’onglet validation', async () => {
    const project = createProject();
    project.conceptualModel.entities.push(createEntity({ name: '' }));
    loadProject(project);
    useUiStore.getState().setBottomTab('mld');
    render(<LogicalModelPanel />);
    screen.getByRole('button', { name: 'Ouvrir la validation' }).click();
    expect(useUiStore.getState().bottomTab).toBe('validation');
  });

  it('se met à jour après une modification du modèle conceptuel', () => {
    loadProject(createProject());
    const entity = useProjectStore.getState().addEntity();
    useProjectStore.getState().updateEntity(entity.id, { name: 'PRODUIT' });
    const { rerender } = render(<LogicalModelPanel />);
    expect(screen.getByTestId('logical-table-produit')).toBeInTheDocument();

    useProjectStore.getState().updateEntity(entity.id, { name: 'ARTICLE' });
    rerender(<LogicalModelPanel />);
    expect(screen.getByTestId('logical-table-article')).toBeInTheDocument();
    expect(screen.queryByTestId('logical-table-produit')).not.toBeInTheDocument();
  });

  it('affiche un message d’aide quand le modèle est vide', () => {
    loadProject(createProject());
    render(<LogicalModelPanel />);
    expect(screen.getByText(/Ajoutez une entité/)).toBeInTheDocument();
  });
});
