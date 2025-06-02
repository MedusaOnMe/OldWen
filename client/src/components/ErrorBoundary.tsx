import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-semibold">Something went wrong</p>
                  <p className="text-sm">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </p>
                  <Button 
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Try again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}