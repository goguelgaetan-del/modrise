/**
 * Notifications éphémères, annoncées aux lecteurs d'écran (aria-live).
 */
import { X } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Notifications() {
  const notifications = useUiStore((state) => state.notifications);
  const dismiss = useUiStore((state) => state.dismissNotification);

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2 rounded-md border bg-background p-3 text-sm shadow-lg',
            notification.kind === 'error' && 'border-destructive text-destructive',
          )}
        >
          <span className="flex-1">{notification.message}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Fermer la notification"
            onClick={() => dismiss(notification.id)}
          >
            <X aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}
