import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OnboardingHelp } from './OnboardingHelp';

describe('OnboardingHelp', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('s’affiche au premier lancement et se referme définitivement à la fin du parcours', () => {
    render(<OnboardingHelp />);
    expect(screen.getByTestId('onboarding-help')).toBeInTheDocument();
    expect(screen.getByText('Étape 1 / 4')).toBeInTheDocument();

    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByTestId('onboarding-next'));
    }
    expect(screen.queryByTestId('onboarding-help')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('modrise-onboarding-dismissed')).toBe('1');
  });

  it('ne se réaffiche pas une fois fermée (bouton fermer)', () => {
    const { unmount } = render(<OnboardingHelp />);
    fireEvent.click(screen.getByTestId('onboarding-dismiss'));
    expect(screen.queryByTestId('onboarding-help')).not.toBeInTheDocument();
    unmount();

    render(<OnboardingHelp />);
    expect(screen.queryByTestId('onboarding-help')).not.toBeInTheDocument();
  });
});
