/**
 * Confirmation de suppression d'éléments référencés : jamais de suppression
 * silencieuse d'une entité utilisée par des associations.
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DeletionApi } from '../hooks/use-deletion';

export function DeleteConfirmationDialog({ deletion }: { deletion: DeletionApi }) {
  return (
    <AlertDialog
      open={deletion.pendingDeletion !== null}
      onOpenChange={(open) => {
        if (!open) deletion.cancelPendingDeletion();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer des éléments référencés ?</AlertDialogTitle>
          <AlertDialogDescription>
            {deletion.pendingDeletion && (
              <>
                {deletion.pendingDeletion.blockedEntityNames.join(', ')} participe(nt) aux
                associations : {deletion.pendingDeletion.impactedAssociationNames.join(', ')}. La
                suppression retirera aussi ces participations.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={deletion.confirmPendingDeletion}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
