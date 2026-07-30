import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/stores/ui-store';
import { startUnsavedChangesGuard } from './unsaved-changes-guard';

function dispatchBeforeUnload(): BeforeUnloadEvent {
  const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

describe('startUnsavedChangesGuard', () => {
  let stop: () => void;

  beforeEach(() => {
    stop = startUnsavedChangesGuard();
  });

  afterEach(() => {
    stop();
    useUiStore.getState().setSaveStatus('idle');
  });

  it("avertit quand des modifications sont en attente ('dirty')", () => {
    useUiStore.getState().setSaveStatus('dirty');
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(true);
  });

  it('avertit pendant une sauvegarde en cours', () => {
    useUiStore.getState().setSaveStatus('saving');
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(true);
  });

  it("n'avertit pas une fois la sauvegarde terminée", () => {
    useUiStore.getState().setSaveStatus('saved');
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ne fait plus rien après arrêt du garde-fou', () => {
    useUiStore.getState().setSaveStatus('dirty');
    stop();
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);
  });
});
