import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional fallback component to render on error */
  fallback?: ReactNode;
  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Page identifier for error reporting */
  page?: string;
  /** Whether to show detailed error info (development mode) */
  showDetails?: boolean;
}

/**
 * State for ErrorBoundary component
 */
interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error: Error | null;
  /** Additional error information */
  errorInfo: ErrorInfo | null;
  /** Error ID for tracking */
  errorId: string | null;
}

/**
 * Error Boundary Component for React Error Handling
 * 
 * This component catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary page="dashboard" onError={logError}>
 *   <DashboardContent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  /**
   * Static method called when an error is thrown in child components
   * @param error - The error that was thrown
   * @returns New state or null to indicate no state update
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate a unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  /**
   * Lifecycle method called when an error is caught
   * @param error - The error that was thrown
   * @param errorInfo - Information about the component stack
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      page: this.props.page,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error('Error in ErrorBoundary onError callback:', callbackError);
      }
    }

    // Report error to monitoring service (in production)
    this.reportError(error, errorInfo);
  }

  /**
   * Report error to external monitoring service
   * @param error - The error that occurred
   * @param errorInfo - Component stack information
   */
  private reportError = async (error: Error, errorInfo: ErrorInfo): Promise<void> => {
    try {
      // In a real application, you would send this to your error monitoring service
      // like Sentry, Bugsnag, or LogRocket
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        page: this.props.page,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
      };

      // Simulate error reporting (replace with actual service call)
      console.log('Error reported:', errorReport);
      
      // Example: await errorMonitoringService.report(errorReport);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  /**
   * Get current user ID for error context
   * @returns User ID or null
   */
  private getUserId = (): string | null => {
    // In a real app, get this from your auth context
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : null;
    } catch {
      return null;
    }
  };

  /**
   * Get current session ID for error context
   * @returns Session ID or null
   */
  private getSessionId = (): string | null => {
    try {
      return sessionStorage.getItem('sessionId') || null;
    } catch {
      return null;
    }
  };

  /**
   * Retry rendering the component
   */
  private handleRetry = (): void => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  };

  /**
   * Navigate to home page
   */
  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  /**
   * Reload the current page
   */
  private handleReload = (): void => {
    window.location.reload();
  };

  /**
   * Copy error details to clipboard
   */
  private handleCopyError = async (): Promise<void> => {
    try {
      const errorDetails = JSON.stringify({
        errorId: this.state.errorId,
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        page: this.props.page,
        timestamp: new Date().toISOString(),
      }, null, 2);

      await navigator.clipboard.writeText(errorDetails);
      alert('Error details copied to clipboard');
    } catch (error) {
      console.error('Failed to copy error details:', error);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
              <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. 
                {this.state.errorId && (
                  <span className="block mt-2 font-mono text-xs">
                    Error ID: {this.state.errorId}
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-4">
              {this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.retryCount} attempts left)
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Homepage
              </button>

              <button
                onClick={this.handleReload}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </button>
            </div>

            {/* Development/Debug Information */}
            {(this.props.showDetails || process.env.NODE_ENV === 'development') && this.state.error && (
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-red-800">
                    Error Details (Development Only)
                  </h3>
                  <button
                    onClick={this.handleCopyError}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    <Bug className="h-3 w-3 inline mr-1" />
                    Copy Details
                  </button>
                </div>
                
                <div className="mt-2 text-xs text-red-700">
                  <div className="font-mono bg-white p-2 rounded border overflow-auto max-h-32">
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  
                  {this.state.error.stack && (
                    <div className="mt-2 font-mono bg-white p-2 rounded border overflow-auto max-h-32">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 font-mono bg-white p-2 rounded border overflow-auto max-h-32">
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center">
              <p className="text-xs text-gray-500">
                If this problem persists, please contact support with the error ID above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 * @param WrappedComponent - Component to wrap
 * @param options - Error boundary options
 * @returns Component wrapped with error boundary
 */
export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<ErrorBoundaryProps, 'children'> = {}
) => {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

export default ErrorBoundary;