import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Caught error in ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="max-w-lg w-full border border-border rounded-lg p-6 bg-card text-foreground">
              <h1 className="text-xl font-semibold mb-2">حدث خطأ في التطبيق</h1>
              <p className="text-sm text-muted-foreground mb-4">
                نواجه مشكلة أثناء عرض الصفحة. سنواصل العمل على إصلاحها.
              </p>
              <pre className="text-xs overflow-auto bg-accent/20 p-3 rounded">
                {this.state.error?.message}
              </pre>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;