/**
 * Presse-papiers interne à Modrise (état de session, jamais persisté).
 * `pasteOffset` compte les collages successifs depuis la dernière copie,
 * pour décaler chaque collage un peu plus que le précédent.
 */
import { create } from 'zustand';
import type { EditorClipboard } from '@/features/clipboard/types';

interface ClipboardState {
  clipboard: EditorClipboard | null;
  pasteOffset: number;
  setClipboard: (clipboard: EditorClipboard) => void;
  /** Renvoie le décalage à utiliser pour ce collage puis l'incrémente. */
  consumePasteOffset: () => number;
}

const PASTE_OFFSET_STEP_PX = 40;

export const useClipboardStore = create<ClipboardState>()((set, get) => ({
  clipboard: null,
  pasteOffset: 0,

  setClipboard: (clipboard) => {
    set({ clipboard, pasteOffset: 0 });
  },

  consumePasteOffset: () => {
    const step = get().pasteOffset;
    set({ pasteOffset: step + 1 });
    return (step + 1) * PASTE_OFFSET_STEP_PX;
  },
}));
