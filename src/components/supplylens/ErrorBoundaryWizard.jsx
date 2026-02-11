import React from 'react';
import { AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

class ErrorBoundaryWizard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: this.generateCorrelationId()
    };
  }

  generateCorrelationId = () => {
    return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  componentDidCatch(error, errorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo
    });

    // Log for debugging
    console.error('[ErrorBoundaryWizard] Caught error:', error);
    console.error('[ErrorBoundaryWizard] Error Info:', errorInfo);
  }

  copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  render() {
    if (this.state.hasError) {
      const { error, correlationId } = this.state;
      const errorMessage = error?.message || 'Unknown error occurred';
      const stepMatch = this.props.currentStep ? ` (Step ${this.props.currentStep})` : '';

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-red-300 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 border-b-2 border-red-300 p-6">
                <div className="flex items-center gap-4">
                  <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  <div>
                    <h1 className="text-lg font-semibold text-red-900">
                      Wizard Error
                    </h1>
                    <p className="text-sm text-red-800 mt-1">
                      An unexpected error occurred{stepMatch}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Error Message */}
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">Error Message:</p>
                  <code className="text-xs text-red-800 bg-white p-3 rounded block font-mono break-words">
                    {errorMessage}
                  </code>
                </div>

                {/* Correlation ID */}
                <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 mb-2">Correlation ID (for debugging):</p>
                  <button
                    onClick={() => this.copyToClipboard(correlationId)}
                    className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                  >
                    <code className="text-xs text-slate-700 font-mono">{correlationId}</code>
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Recovery Actions */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-900">Recovery Options:</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Reload Page
                    </Button>
                    <Button
                      onClick={() => window.history.back()}
                      variant="outline"
                      className="border-2 border-slate-200"
                    >
                      Go Back
                    </Button>
                    <Button
                      onClick={() => window.location.href = '/evidence-vault'}
                      variant="outline"
                      className="border-2 border-slate-200"
                    >
                      Return to Evidence Vault
                    </Button>
                  </div>
                </div>

                {/* Debug Info (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="border border-slate-200 rounded-lg">
                    <summary className="p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 text-xs font-medium text-slate-700">
                      Technical Details
                    </summary>
                    <div className="p-3 bg-slate-900 text-white text-xs font-mono space-y-2 max-h-64 overflow-y-auto">
                      <p>Stack Trace:</p>
                      <pre className="text-red-400 whitespace-pre-wrap break-words">
                        {this.state.error?.stack}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWizard;