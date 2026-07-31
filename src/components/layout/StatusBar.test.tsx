import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createHotelExampleProject } from '@/core/examples/hotel';
import { loadProjectIntoStores } from '@/stores/project-assembly';
import { useProjectStore } from '@/stores/project-store';
import { useUiStore } from '@/stores/ui-store';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('affiche les comptes d’entités, associations, commentaires et erreurs', () => {
    loadProjectIntoStores(createHotelExampleProject());
    render(<StatusBar />);

    const bar = screen.getByTestId('status-bar');
    const { conceptualModel } = useProjectStore.getState();
    expect(bar).toHaveTextContent(String(conceptualModel.entities.length));
    expect(bar).toHaveTextContent(String(conceptualModel.associations.length));
    expect(bar).toHaveTextContent('PostgreSQL');
  });

  it('ouvre l’onglet validation au clic sur le nombre d’erreurs', () => {
    loadProjectIntoStores(createHotelExampleProject());
    useUiStore.getState().setBottomTab('mld');
    render(<StatusBar />);

    fireEvent.click(screen.getByTestId('status-bar-error-count'));
    expect(useUiStore.getState().bottomTab).toBe('validation');
  });
});
