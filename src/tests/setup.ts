import '@testing-library/jest-dom/vitest';
// IndexedDB simulé pour les tests de persistance (Dexie).
import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Sans `globals: true`, le cleanup automatique de Testing Library n'est pas
// enregistré : on le fait explicitement.
afterEach(() => {
  cleanup();
});

// jsdom n'implémente pas ces API de pointeur ni scrollIntoView, utilisées par
// les composants Radix (ex. Select) : sans ce polyfill minimal, toute
// interaction clavier/souris avec un <Select> plante en test.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
