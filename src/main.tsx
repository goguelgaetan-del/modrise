import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app/App';
import { initPerformanceDiagnostics } from '@/lib/performance/diagnostics';

// Diagnostic local de développement, activé par `?debugPerformance=1`
// (voir docs/canvas-performance.md). Sans effet dans un build de production.
initPerformanceDiagnostics(window.location.search);

const root = document.getElementById('root');
if (!root) {
  throw new Error('Élément racine #root introuvable.');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
