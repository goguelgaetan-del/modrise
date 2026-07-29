/**
 * Store d'historique (annuler / rétablir).
 *
 * TODO(v0.4) : implémenter un historique par commandes inverses ou par
 * instantanés structurés du couple (modèle conceptuel, diagramme), avec :
 * - regroupement d'un déplacement continu en une seule entrée (enregistrée
 *   au relâchement du nœud, jamais à chaque pixel) ;
 * - limite de profondeur ;
 * - raccourcis Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.
 *
 * Tant que ce n'est pas implémenté, `canUndo`/`canRedo` restent faux et
 * l'interface présente les boutons comme « Fonctionnalité prévue dans une
 * prochaine version » (désactivés), sans simuler de comportement.
 */
import { create } from 'zustand';

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

export const useHistoryStore = create<HistoryState>()(() => ({
  canUndo: false,
  canRedo: false,
}));
