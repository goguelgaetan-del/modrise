/**
 * Filet de sécurité de dernier recours.
 *
 * Une erreur non rattrapée pendant un rendu React démonte tout l'arbre : sans
 * cette barrière, l'utilisateur se retrouve devant une page blanche, sans
 * explication et — c'est le point important pour une application locale —
 * avec son travail encore présent en mémoire mais inatteignable.
 *
 * Trois principes :
 *
 * 1. **Ne rien cacher.** L'erreur est toujours écrite dans la console, avec sa
 *    pile, en développement comme en production. La barrière change ce que
 *    l'utilisateur voit, pas ce que le développeur peut lire.
 * 2. **Ne pas exposer de pile à l'utilisateur.** Le message affiché est en
 *    français et compréhensible ; le détail technique n'apparaît que sous
 *    `import.meta.env.DEV`, éliminé du build de production.
 * 3. **Ne pas perdre le travail.** Le projet vit dans les stores en mémoire,
 *    qui survivent au démontage de l'arbre : un bouton propose donc de le
 *    télécharger au format `.merise.json` avant de recharger.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { downloadProjectFile } from '@/features/projects/import-export';
import { assembleCurrentProject } from '@/stores/project-assembly';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** Un export a-t-il été tenté, et avec quel résultat ? */
  exportState: 'idle' | 'done' | 'failed';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, exportState: 'idle' };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Volontairement conservé en production : une erreur silencieuse est
    // une erreur qu'on ne corrigera jamais.
    console.error('Erreur non rattrapée dans le rendu :', error, info.componentStack);
  }

  /**
   * Imports statiques, et c'est délibéré. Ces deux modules sont de toute façon
   * déjà dans le chunk initial (`project-assembly` via `App`, `TopBar` et
   * l'autosauvegarde ; `import-export` via `TopBar`) — `pnpm analyze` le
   * confirme. Les importer dynamiquement ne déplaçait donc rien, et faisait
   * dépendre le sauvetage d'une résolution de module survenant *après* le
   * plantage : exactement le moment où l'on veut le moins de dépendances
   * possible.
   */
  private handleExport = (): void => {
    try {
      downloadProjectFile(assembleCurrentProject());
      this.setState({ exportState: 'done' });
    } catch (error) {
      console.error("Échec de l'export de secours :", error);
      this.setState({ exportState: 'failed' });
    }
  };

  override render(): ReactNode {
    const { error, exportState } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        data-testid="error-boundary"
        className="flex h-screen w-screen items-center justify-center bg-background p-6 text-foreground"
      >
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-lg font-semibold">Modrise s’est interrompu</h1>
          <p className="text-sm text-muted-foreground">
            Une erreur inattendue a interrompu l’affichage. Votre projet n’a pas été perdu : il
            reste enregistré localement, et vous pouvez en télécharger une copie avant de
            recharger.
          </p>
          {import.meta.env.DEV && (
            <pre className="max-h-48 overflow-auto rounded border bg-muted p-2 text-xs">
              {error.stack ?? error.message}
            </pre>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="error-boundary-reload"
              onClick={() => window.location.reload()}
              className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              Recharger l’application
            </button>
            <button
              type="button"
              data-testid="error-boundary-export"
              onClick={this.handleExport}
              className="rounded border px-3 py-2 text-sm hover:bg-accent"
            >
              Télécharger une copie du projet
            </button>
          </div>
          {exportState === 'done' && (
            <p className="text-sm text-muted-foreground">Copie téléchargée.</p>
          )}
          {exportState === 'failed' && (
            <p className="text-sm text-destructive">
              La copie n’a pas pu être produite. Rechargez : la dernière sauvegarde locale est
              conservée.
            </p>
          )}
        </div>
      </div>
    );
  }
}
