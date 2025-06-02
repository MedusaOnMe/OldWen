import React, { Component, ErrorInfo, ReactNode, useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home, ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { performanceMonitor, getMemoryUsage } from '../utils/performance';

/**
 * Enterprise-grade error boundary and validation system
 * Provides comprehensive error handling, reporting, and recovery
 */

// Error types for better classification
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Enhanced error interface
export interface EnhancedError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  component?: string;
  context?: Record<string, any>;
  retryable: boolean;
  recoveryActions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean;
  error?: EnhancedError;
  errorHistory: EnhancedError[];
  retryCount: number;
  isRecovering: boolean;
}

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: EnhancedError, retry: () => void) => ReactNode;
  onError?: (error: EnhancedError) => void;
  level?: 'page' | 'component' | 'widget';
  retryLimit?: number;
  enableReporting?: boolean;
  context?: Record<string, any>;
}

// Generate session ID
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Global error store
class ErrorStore {
  private errors: EnhancedError[] = [];
  private listeners: Set<(errors: EnhancedError[]) => void> = new Set();

  addError(error: EnhancedError): void {
    this.errors.unshift(error);
    // Keep only last 100 errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(0, 100);
    }
    this.notifyListeners();
    this.reportError(error);
  }

  getErrors(): EnhancedError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
    this.notifyListeners();
  }

  subscribe(listener: (errors: EnhancedError[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.errors));
  }

  private async reportError(error: EnhancedError): Promise<void> {
    try {
      // In production, send to error reporting service
      console.group(`🚨 Error Report [${error.severity.toUpperCase()}]`);
      console.error('Error:', error.message);
      console.error('Type:', error.type);
      console.error('Component:', error.component);
      console.error('Context:', error.context);
      console.error('Stack:', error.stack);
      console.error('Memory:', getMemoryUsage());
      console.error('Performance:', performanceMonitor.getAllStats());
      console.groupEnd();

      // Send to monitoring service in production
      if (import.meta.env.PROD) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error)
        }).catch(() => {
          // Silently fail if error reporting is down
        });
      }
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError);
    }
  }
}

export const errorStore = new ErrorStore();

// Utility to create enhanced errors
export function createEnhancedError(
  error: Error | string,
  type: ErrorType = ErrorType.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  component?: string,
  context?: Record<string, any>
): EnhancedError {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;

  return {
    id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    message,
    stack,
    timestamp: new Date(),
    sessionId,
    userAgent: navigator.userAgent,
    url: window.location.href,
    component,
    context,
    retryable: [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.RATE_LIMIT].includes(type)
  };
}

// Main Error Boundary Component
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      errorHistory: [],
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const enhancedError = createEnhancedError(
      error,
      this.classifyError(error),
      this.determineSeverity(error),
      errorInfo.componentStack?.split('\n')[1]?.trim(),
      {
        ...this.props.context,
        componentStack: errorInfo.componentStack,
        errorBoundary: this.props.level || 'component'
      }
    );

    // Add recovery actions
    enhancedError.recoveryActions = this.getRecoveryActions(enhancedError);

    this.setState(prevState => ({
      error: enhancedError,
      errorHistory: [enhancedError, ...prevState.errorHistory].slice(0, 10)
    }));

    // Report error
    errorStore.addError(enhancedError);
    this.props.onError?.(enhancedError);

    // Auto-retry for retryable errors
    if (enhancedError.retryable && this.state.retryCount < (this.props.retryLimit || 3)) {
      this.scheduleRetry();
    }
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorType.PERMISSION;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT;
    }
    if (message.includes('server') || message.includes('internal')) {
      return ErrorType.SERVER;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    return ErrorType.CLIENT;
  }

  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('auth') || message.includes('permission')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('network') || message.includes('server')) {
      return ErrorSeverity.MEDIUM;
    }
    
    return ErrorSeverity.LOW;
  }

  private getRecoveryActions(error: EnhancedError): Array<{ label: string; action: () => void }> {
    const actions: Array<{ label: string; action: () => void }> = [];

    if (error.retryable) {
      actions.push({
        label: 'Retry',
        action: () => this.handleRetry()
      });
    }

    actions.push({
      label: 'Go Home',
      action: () => window.location.href = '/'
    });

    if (this.props.level === 'component') {
      actions.push({
        label: 'Reload Page',
        action: () => window.location.reload()
      });
    }

    return actions;
  }

  private scheduleRetry(): void {
    this.setState({ isRecovering: true });
    
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000); // Exponential backoff
    
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  }

  private handleRetry = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1,
      isRecovering: false
    }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorHistory={this.state.errorHistory}
          isRecovering={this.state.isRecovering}
          retryCount={this.state.retryCount}
          retryLimit={this.props.retryLimit || 3}
          level={this.props.level || 'component'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
}

// Error Display Component
interface ErrorDisplayProps {
  error: EnhancedError;
  errorHistory: EnhancedError[];
  isRecovering: boolean;
  retryCount: number;
  retryLimit: number;
  level: 'page' | 'component' | 'widget';
  onRetry: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorHistory,
  isRecovering,
  retryCount,
  retryLimit,
  level,
  onRetry
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'text-red-500 bg-red-500/20 border-red-500/50';
      case ErrorSeverity.HIGH: return 'text-orange-500 bg-orange-500/20 border-orange-500/50';
      case ErrorSeverity.MEDIUM: return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      case ErrorSeverity.LOW: return 'text-blue-500 bg-blue-500/20 border-blue-500/50';
    }
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.NETWORK: return '🌐';
      case ErrorType.AUTHENTICATION: return '🔐';
      case ErrorType.PERMISSION: return '🚫';
      case ErrorType.VALIDATION: return '⚠️';
      case ErrorType.SERVER: return '🖥️';
      default: return '❌';
    }
  };

  const handleSendFeedback = async () => {
    if (!userFeedback.trim()) return;

    try {
      const feedbackData = {
        errorId: error.id,
        feedback: userFeedback,
        timestamp: new Date().toISOString(),
        sessionId
      };

      // In production, send to feedback service
      console.log('User feedback:', feedbackData);
      
      setFeedbackSent(true);
      setUserFeedback('');
    } catch (err) {
      console.warn('Failed to send feedback:', err);
    }
  };

  const containerClasses = level === 'page' 
    ? 'min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-900/20 via-gray-900 to-red-900/20'
    : 'flex items-center justify-center p-4';

  const cardClasses = level === 'page' 
    ? 'max-w-2xl w-full'
    : 'max-w-md w-full';

  return (
    <div className={containerClasses}>
      <Card className={`${cardClasses} bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl`}>
        <CardHeader className="text-center space-y-4">
          <div className="text-6xl">{getErrorIcon()}</div>
          <div>
            <CardTitle className="text-2xl text-white flex items-center justify-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <span>Something went wrong</span>
            </CardTitle>
            <CardDescription className="text-gray-300 mt-2">
              {level === 'page' 
                ? "We're sorry, but this page encountered an error"
                : "This component has encountered an error"}
            </CardDescription>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <Badge className={getSeverityColor(error.severity)}>
              {error.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-gray-300 border-gray-500">
              {error.type.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Message */}
          <Alert className="bg-red-500/20 border-red-500/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              {error.message}
            </AlertDescription>
          </Alert>

          {/* Recovery Actions */}
          <div className="space-y-3">
            {error.retryable && retryCount < retryLimit && (
              <Button
                onClick={onRetry}
                disabled={isRecovering}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRecovering ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({retryLimit - retryCount} attempts left)
                  </>
                )}
              </Button>
            )}

            {error.recoveryActions?.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                variant="outline"
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                {action.label === 'Go Home' && <Home className="h-4 w-4 mr-2" />}
                {action.label === 'Reload Page' && <RefreshCw className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>

          {/* Technical Details Toggle */}
          <div className="border-t border-white/20 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-gray-400 hover:text-white"
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </Button>

            {showDetails && (
              <div className="mt-4 space-y-3">
                <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-300">
                  <div><strong>Error ID:</strong> {error.id}</div>
                  <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
                  <div><strong>Component:</strong> {error.component || 'Unknown'}</div>
                  <div><strong>Session:</strong> {error.sessionId}</div>
                  {error.context && (
                    <div><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</div>
                  )}
                </div>

                {error.stack && (
                  <details className="bg-black/30 rounded-lg p-4">
                    <summary className="text-gray-400 cursor-pointer font-medium">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}

                {errorHistory.length > 1 && (
                  <details className="bg-black/30 rounded-lg p-4">
                    <summary className="text-gray-400 cursor-pointer font-medium">
                      Error History ({errorHistory.length - 1} previous)
                    </summary>
                    <div className="mt-2 space-y-2">
                      {errorHistory.slice(1).map((historyError, index) => (
                        <div key={historyError.id} className="text-xs text-gray-500 border-l-2 border-gray-600 pl-2">
                          <div>{historyError.message}</div>
                          <div>{historyError.timestamp.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* User Feedback */}
          <div className="border-t border-white/20 pt-4 space-y-3">
            <h4 className="text-white font-medium flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Help us improve
            </h4>
            
            {!feedbackSent ? (
              <>
                <Textarea
                  value={userFeedback}
                  onChange={(e) => setUserFeedback(e.target.value)}
                  placeholder="What were you trying to do when this error occurred? (optional)"
                  className="bg-white/10 border-white/30 text-white placeholder-gray-400"
                  rows={3}
                />
                <Button
                  onClick={handleSendFeedback}
                  disabled={!userFeedback.trim()}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Send Feedback
                </Button>
              </>
            ) : (
              <div className="text-green-400 text-sm">
                ✓ Thank you for your feedback! This helps us fix the issue.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Global error handler hook
export function useErrorHandler() {
  const [errors, setErrors] = useState<EnhancedError[]>([]);

  useEffect(() => {
    return errorStore.subscribe(setErrors);
  }, []);

  const reportError = useCallback((
    error: Error | string,
    type?: ErrorType,
    severity?: ErrorSeverity,
    context?: Record<string, any>
  ) => {
    const enhancedError = createEnhancedError(error, type, severity, undefined, context);
    errorStore.addError(enhancedError);
  }, []);

  const clearErrors = useCallback(() => {
    errorStore.clearErrors();
  }, []);

  return {
    errors,
    reportError,
    clearErrors,
    hasErrors: errors.length > 0
  };
}

// Input validation utilities
export const validators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  solanaAddress: (value: string) => {
    if (!value || value.length < 32 || value.length > 44) {
      return 'Invalid Solana address format';
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) {
      return 'Solana address contains invalid characters';
    }
    return null;
  },

  url: (value: string) => {
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  minLength: (min: number) => (value: string) => {
    if (value.length < min) {
      return `Minimum length is ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number) => (value: string) => {
    if (value.length > max) {
      return `Maximum length is ${max} characters`;
    }
    return null;
  },

  numeric: (value: string) => {
    if (isNaN(Number(value))) {
      return 'Please enter a valid number';
    }
    return null;
  },

  range: (min: number, max: number) => (value: number) => {
    if (value < min || value > max) {
      return `Value must be between ${min} and ${max}`;
    }
    return null;
  }
};

// Form validation hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, Array<(value: any) => string | null>>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback((field: keyof T, value: any) => {
    const rules = validationRules[field];
    if (!rules) return null;

    for (const rule of rules) {
      const error = rule(value);
      if (error) return error;
    }
    return null;
  }, [validationRules]);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error || undefined }));
  }, [validateField]);

  const setTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field in validationRules) {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules, validateField]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  };
}

// Export all components and utilities
export { ErrorType, ErrorSeverity };
export type { EnhancedError, ErrorBoundaryProps };