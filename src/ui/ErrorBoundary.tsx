import React from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Name of the section for error reporting */
  sectionName?: string;
  /** Custom fallback UI */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic error boundary that catches rendering errors in child components.
 * Displays a user-friendly error message with a reload option.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const section = this.props.sectionName ?? 'Unknown';
    console.error(`[ErrorBoundary:${section}] Caught error:`, error);
    console.error(`[ErrorBoundary:${section}] Component stack:`, errorInfo.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const section = this.props.sectionName ?? 'This section';
      return (
        <div className="error-boundary">
          <div className="error-boundary__icon">⚠️</div>
          <div className="error-boundary__message">
            {section} encountered an error
          </div>
          <div className="error-boundary__details">
            {this.state.error?.message}
          </div>
          <button className="error-boundary__reload" onClick={this.handleReload}>
            Reload Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
