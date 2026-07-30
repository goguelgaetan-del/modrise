import { beforeEach, describe, expect, it } from 'vitest';
import type { EditorClipboard } from '@/features/clipboard/types';
import { useClipboardStore } from './clipboard-store';

function emptyClipboard(): EditorClipboard {
  return { entities: [], associations: [], comments: [], nodes: [] };
}

describe('clipboard-store', () => {
  beforeEach(() => {
    useClipboardStore.setState({ clipboard: null, pasteOffset: 0 });
  });

  it('démarre vide', () => {
    expect(useClipboardStore.getState().clipboard).toBeNull();
  });

  it('setClipboard remplit le presse-papiers et réinitialise le décalage', () => {
    useClipboardStore.getState().consumePasteOffset();
    useClipboardStore.getState().setClipboard(emptyClipboard());
    expect(useClipboardStore.getState().clipboard).not.toBeNull();
    expect(useClipboardStore.getState().pasteOffset).toBe(0);
  });

  it('consumePasteOffset augmente à chaque appel', () => {
    const first = useClipboardStore.getState().consumePasteOffset();
    const second = useClipboardStore.getState().consumePasteOffset();
    const third = useClipboardStore.getState().consumePasteOffset();
    expect(first).toBeLessThan(second);
    expect(second).toBeLessThan(third);
  });

  it('une nouvelle copie remet le décalage à zéro', () => {
    useClipboardStore.getState().consumePasteOffset();
    useClipboardStore.getState().consumePasteOffset();
    useClipboardStore.getState().setClipboard(emptyClipboard());
    const offsetAfterRecopy = useClipboardStore.getState().consumePasteOffset();
    expect(offsetAfterRecopy).toBeLessThan(useClipboardStore.getState().consumePasteOffset());
  });
});
