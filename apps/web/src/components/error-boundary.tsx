'use client';
import React from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook for Sentry/observability — initialized at app root if DSN present.
    if (typeof window !== 'undefined') {
      const win = window as any;
      if (win.Sentry?.captureException) {
        win.Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      } else {
        // Fallback: console for now
        console.error('[ErrorBoundary]', error, info.componentStack);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-600 text-2xl">!</div>
            <h2 className="text-xl font-semibold">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">
              Erro inesperado nesta tela. O incidente foi registrado.
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="text-xs text-left bg-muted/40 rounded p-3 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
