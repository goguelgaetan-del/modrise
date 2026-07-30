/**
 * Store d'historique (annuler / rétablir).
 *
 * Repose sur des instantanés structurés (`EditorSnapshot`) plutôt que sur des
 * commandes inverses : plus simple à maintenir correctement avec Zustand +
 * Immer, et suffisant à cette taille de projet tant que seuls les états
 * nécessaires sont enregistrés (voir `EditorSnapshot`). Le viewport, la
 * sélection, le statut de sauvegarde, les issues dérivées, le MLD et le SQL
 * ne sont jamais historisés : ce sont soit de l'état d'interface, soit des
 * vues dérivées recalculées automatiquement.
 *
 * `pushEntry` est appelée par `withHistory` (`src/features/history/`), qui
 * regroupe une action utilisateur complète (potentiellement plusieurs
 * mutations de store) en une seule entrée.
 */
import { create } from 'zustand';
import type { ConceptualModel } from '@/core/conceptual-model/types';
import type { DiagramComment, DiagramNode } from '@/core/diagram/types';

/** Ce qui doit être annulable : modèle conceptuel + positions/commentaires graphiques. */
export interface EditorSnapshot {
  conceptualModel: ConceptualModel;
  diagramNodes: DiagramNode[];
  diagramComments: DiagramComment[];
}

export interface HistoryEntry {
  id: string;
  label: string;
  before: EditorSnapshot;
  after: EditorSnapshot;
}

/** Au-delà de cette profondeur, les entrées les plus anciennes sont oubliées. */
export const MAX_HISTORY_ENTRIES = 100;

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;

  /** Ajoute une entrée et vide la pile de rétablissement. */
  pushEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  /** Retire et renvoie la dernière entrée annulable (undo), ou `undefined`. */
  popForUndo: () => HistoryEntry | undefined;
  /** Retire et renvoie la prochaine entrée rétablissable (redo), ou `undefined`. */
  popForRedo: () => HistoryEntry | undefined;
  /** Vide tout l'historique (ex. chargement d'un nouveau projet). */
  clear: () => void;
}

let sequence = 0;

function deriveFlags(past: HistoryEntry[], future: HistoryEntry[]) {
  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoLabel: past.at(-1)?.label,
    redoLabel: future.at(-1)?.label,
  };
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  undoLabel: undefined,
  redoLabel: undefined,

  pushEntry: (entry) => {
    sequence += 1;
    const full: HistoryEntry = { id: `history-${sequence}`, ...entry };
    const past = [...get().past, full].slice(-MAX_HISTORY_ENTRIES);
    set({ past, future: [], ...deriveFlags(past, []) });
  },

  popForUndo: () => {
    const { past, future } = get();
    const entry = past.at(-1);
    if (!entry) return undefined;
    const nextPast = past.slice(0, -1);
    const nextFuture = [...future, entry];
    set({ past: nextPast, future: nextFuture, ...deriveFlags(nextPast, nextFuture) });
    return entry;
  },

  popForRedo: () => {
    const { past, future } = get();
    const entry = future.at(-1);
    if (!entry) return undefined;
    const nextFuture = future.slice(0, -1);
    const nextPast = [...past, entry];
    set({ past: nextPast, future: nextFuture, ...deriveFlags(nextPast, nextFuture) });
    return entry;
  },

  clear: () => {
    set({ past: [], future: [], ...deriveFlags([], []) });
  },
}));
