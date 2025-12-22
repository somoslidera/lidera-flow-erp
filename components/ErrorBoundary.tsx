import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  darkMode?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { darkMode = false } = this.props;
      const bgColor = darkMode ? 'bg-zinc-950' : 'bg-slate-50';
      const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
      const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
      const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
      const errorColor = darkMode ? 'text-red-400' : 'text-red-600';

      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${bgColor}`}>
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl p-8 ${cardBg} border`}>
            <div className="text-center mb-6">
              <h1 className={`text-3xl font-bold mb-2 ${textColor}`}>⚠️ Erro no Aplicativo</h1>
              <p className={subText}>Ocorreu um erro inesperado. Por favor, recarregue a página.</p>
            </div>

            {this.state.error && (
              <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-red-950/20 border-red-800' : 'bg-red-50 border-red-200'} border`}>
                <p className={`font-semibold mb-2 ${errorColor}`}>Erro:</p>
                <p className={`text-sm ${subText} font-mono break-all`}>
                  {this.state.error.message || 'Erro desconhecido'}
                </p>
              </div>
            )}

            {this.state.errorInfo && (
              <details className={`mb-4 ${subText} text-sm`}>
                <summary className="cursor-pointer mb-2">Detalhes técnicos (clique para expandir)</summary>
                <pre className={`p-3 rounded bg-zinc-900 text-zinc-300 text-xs overflow-auto max-h-64 ${darkMode ? '' : 'bg-zinc-100 text-zinc-800'}`}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  darkMode 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

