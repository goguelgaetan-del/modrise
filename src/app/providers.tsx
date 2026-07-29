/**
 * Providers globaux : React Flow (état partagé du canvas), tooltips et thème.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { useUiStore } from '@/stores/ui-store';

function ThemeEffect() {
  const theme = useUiStore((state) => state.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <TooltipProvider delayDuration={300}>
        <ThemeEffect />
        {children}
      </TooltipProvider>
    </ReactFlowProvider>
  );
}
