import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onError: (error: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const errorMessage = error.message || 'Erro desconhecido';
    const componentStack = errorInfo.componentStack?.split('\n')[1]?.trim() || 'N/A';
    const fullMessage = `${errorMessage}\n\nComponente: ${componentStack}`;
    this.props.onError(fullMessage);
  }

  render() {
    if (this.state.hasError) {
      // Return null to let the error modal handle the display
      // The error has already been reported via onError callback
      return null;
    }

    return this.props.children;
  }
}

