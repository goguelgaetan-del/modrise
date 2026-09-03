import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { initPerformanceDiagnostics } from '@/lib/performance/diagnostics';

// Diagnostic local de développement, activé par `?debugPerformance=1`
// (voir docs/canvas-performance.md). Sans effet dans un build de production.
initPerformanceDiagnostics(window.location.search);

const root = document.getElementById('root');
if (!root) {
  throw new Error('Élément racine #root introuvable.');
}

createRoot(root).render(
  // La barrière est *au-dessus* de `App` : une erreur survenant dans le
  // démarrage de l'application elle-même doit être rattrapée, or un
  // composant ne rattrape jamais sa propre erreur de rendu.
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
