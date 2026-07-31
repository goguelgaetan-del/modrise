/**
 * Aide de premier lancement : 4 étapes courtes, non modales (le canevas
 * reste utilisable pendant que la carte est affichée), refermables à tout
 * moment. Une fois fermée (bouton ou fin du parcours), elle ne réapparaît
 * plus sur cet appareil (persistée dans localStorage). Positionnée en
 * absolu dans le conteneur du canevas (pas en fixe sur toute la fenêtre)
 * pour ne jamais recouvrir l'inspecteur ou le panneau inférieur.
 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'modrise-onboarding-dismissed';

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Construisez votre MCD',
    body: "Ajoutez des entités et des associations depuis la bibliothèque à gauche, ou par clic droit sur le canevas.",
  },
  {
    title: 'Reliez vos éléments',
    body: 'Tracez un lien entre une entité et une association pour créer une participation, puis définissez sa cardinalité.',
  },
  {
    title: 'Suivez le MLD et le SQL',
    body: 'Le panneau du bas traduit automatiquement votre MCD en modèle logique puis en SQL, dans le dialecte de votre choix.',
  },
  {
    title: 'Organisez et exportez',
    body: 'Organisation automatique, alignement/distribution, et export SVG/PNG sont accessibles depuis la barre supérieure.',
  },
];

function readDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Stockage indisponible (navigation privée, quota) : rien à faire, la
    // carte réapparaîtra simplement à la prochaine session.
  }
}

export function OnboardingHelp() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const [step, setStep] = useState(0);

  if (dismissed) return null;

  const dismiss = () => {
    persistDismissed();
    setDismissed(true);
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <div
      role="dialog"
      aria-label="Aide de démarrage"
      data-testid="onboarding-help"
      className="pointer-events-auto absolute bottom-4 right-4 z-10 w-72 rounded-lg border bg-card p-4 text-card-foreground shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          Étape {step + 1} / {STEPS.length}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer l'aide"
          data-testid="onboarding-dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-sm font-semibold">{current.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{current.body}</p>
      <div className="mt-3 flex items-center justify-between">
        <Button
          size="sm"
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((value) => Math.max(0, value - 1))}
        >
          <ChevronLeft aria-hidden />
          Précédent
        </Button>
        <Button
          size="sm"
          variant="outline"
          data-testid="onboarding-next"
          onClick={() => (isLast ? dismiss() : setStep((value) => value + 1))}
        >
          {isLast ? 'Terminer' : 'Suivant'}
          {!isLast && <ChevronRight aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
