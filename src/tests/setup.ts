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
