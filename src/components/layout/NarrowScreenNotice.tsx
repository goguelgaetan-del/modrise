/**
 * Bandeau non bloquant sous une largeur d'écran trop faible (< 768px) : rien
 * n'est désactivé, l'application reste utilisable, on informe simplement
 * que l'expérience est pensée pour un écran plus large.
 */
import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useIsNarrowScreen } from '@/lib/use-media-query';
import { Button } from '@/components/ui/button';

export function NarrowScreenNotice() {
  const isNarrow = useIsNarrowScreen();
  const [dismissed, setDismissed] = useState(false);

  if (!isNarrow || dismissed) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center gap-2 border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground"
      data-testid="narrow-screen-notice"
    >
      <Info aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">Modrise est plus confortable sur un écran large.</span>
      <Button
        size="icon-sm"
        variant="ghost"
        className="h-5 w-5"
        aria-label="Fermer ce message"
        onClick={() => setDismissed(true)}
      >
        <X aria-hidden className="h-3 w-3" />
      </Button>
    </div>
  );
}
