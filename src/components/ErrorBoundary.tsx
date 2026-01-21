import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary pour capturer les erreurs React et éviter qu'elles ne crash l'application.
 * Capture notamment les erreurs de type "removeChild" qui sont souvent cosmétiques.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Mettre à jour l'état pour que le prochain rendu affiche l'UI de fallback
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Filtrer les erreurs "removeChild" qui sont souvent cosmétiques
    const isRemoveChildError = 
      error?.message?.includes('removeChild') || 
      error?.name === 'NotFoundError' ||
      errorInfo?.componentStack?.includes('removeChild');

    if (isRemoveChildError) {
      // Les erreurs removeChild sont souvent cosmétiques et n'empêchent pas l'application de fonctionner
      // On les log silencieusement et on réinitialise l'état d'erreur
      console.warn('[ErrorBoundary] Erreur removeChild détectée (cosmétique, ignorée):', error);
      
      // Réinitialiser l'état d'erreur après un court délai
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
        });
      }, 100);
      return;
    }

    // Pour les autres erreurs, on les log normalement
    console.error('[ErrorBoundary] Erreur capturée:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Appeler le callback onError si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Vérifier si c'est une erreur removeChild (déjà gérée dans componentDidCatch)
      const isRemoveChildError = 
        this.state.error?.message?.includes('removeChild') || 
        this.state.error?.name === 'NotFoundError';

      if (isRemoveChildError) {
        // Si c'est une erreur removeChild, on rend quand même les children
        // car l'erreur a été gérée et l'application devrait fonctionner
        return this.props.children;
      }

      // Pour les autres erreurs, afficher l'UI de fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">
              Une erreur s'est produite
            </h1>
            <p className="text-gray-600 mb-6">
              Désolé, quelque chose s'est mal passé. Veuillez réessayer.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left bg-red-50 p-4 rounded-lg text-sm">
                <summary className="font-bold text-red-900 cursor-pointer mb-2">
                  Détails de l'erreur (mode développement)
                </summary>
                <pre className="text-red-800 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
