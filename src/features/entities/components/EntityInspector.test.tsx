import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createProject } from '@/core/project/types';
import { useProjectStore } from '@/stores/project-store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EntityInspector } from './EntityInspector';

/** Reproduit l'usage réel : l'inspecteur reçoit l'entité depuis le store. */
function Harness() {
  const entity = useProjectStore((state) => state.conceptualModel.entities[0]);
  if (!entity) return null;
  return (
    <TooltipProvider>
      <EntityInspector entity={entity} onRequestDelete={() => {}} />
    </TooltipProvider>
  );
}

function setup() {
  useProjectStore.getState().loadProject(createProject());
  useProjectStore.getState().addEntity();
  render(<Harness />);
  return { current: () => useProjectStore.getState().conceptualModel.entities[0] };
}

describe('EntityInspector', () => {
  it("modifie le nom de l'entité dans le store", async () => {
    const user = userEvent.setup();
    const { current } = setup();
    const input = screen.getByTestId('entity-name-input');
    await user.clear(input);
    await user.type(input, 'CLIENT');
    expect(current()?.name).toBe('CLIENT');
  });

  it('ajoute un attribut', async () => {
    const user = userEvent.setup();
    const { current } = setup();
    await user.click(screen.getByTestId('add-attribute'));
    expect(current()?.attributes).toHaveLength(2);
  });
});
