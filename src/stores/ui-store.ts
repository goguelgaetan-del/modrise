/**
 * Store d'interface : thème, panneaux, statut de sauvegarde, notifications.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type BottomTab = 'validation' | 'mld' | 'sql';
export type Theme = 'light' | 'dark';

export interface UiNotification {
  id: number;
  kind: 'info' | 'error';
  message: string;
}

interface UiState {
  theme: Theme;
  bottomTab: BottomTab;
  bottomPanelOpen: boolean;
  saveStatus: SaveStatus;
  notifications: UiNotification[];
  /** Id du problème de validation actuellement ciblé par F8/Shift+F8. */
  focusedIssueId?: string;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setBottomTab: (tab: BottomTab) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setFocusedIssueId: (id: string | undefined) => void;
  setSaveStatus: (status: SaveStatus) => void;
  notify: (kind: UiNotification['kind'], message: string) => void;
  dismissNotification: (id: number) => void;
}

let notificationSequence = 0;

function preferredTheme(): Theme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    theme: preferredTheme(),
    bottomTab: 'validation',
    bottomPanelOpen: true,
    saveStatus: 'idle',
    notifications: [],

    setTheme: (theme) => {
      set((state) => {
        state.theme = theme;
      });
    },

    toggleTheme: () => {
      set((state) => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
      });
    },

    setBottomTab: (tab) => {
      set((state) => {
        state.bottomTab = tab;
        state.bottomPanelOpen = true;
      });
    },

    setBottomPanelOpen: (open) => {
      set((state) => {
        state.bottomPanelOpen = open;
      });
    },

    setFocusedIssueId: (id) => {
      set((state) => {
        state.focusedIssueId = id;
      });
    },

    setSaveStatus: (status) => {
      set((state) => {
        state.saveStatus = status;
      });
    },

    notify: (kind, message) => {
      set((state) => {
        notificationSequence += 1;
        state.notifications.push({ id: notificationSequence, kind, message });
      });
      const id = notificationSequence;
      // Les notifications disparaissent seules ; elles restent annoncées aux
      // lecteurs d'écran via la zone aria-live du composant Notifications.
      setTimeout(() => {
        useUiStore.getState().dismissNotification(id);
      }, 6000);
    },

    dismissNotification: (id) => {
      set((state) => {
        state.notifications = state.notifications.filter((n) => n.id !== id);
      });
    },
  })),
);
