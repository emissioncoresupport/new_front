import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * BACKEND RESPONSE DISPLAY - EXPLICIT RESULT RENDERING
 * 
 * Displays backend command results EXACTLY as returned.
 * No interpretation.
 * No state inference.
 * No optimistic messaging.
 */

export default function BackendResponseDisplay({ response, onDismiss }) {
  if (!response) return null;

  const renderAccepted = () => (
    <Card className="p-4 bg-green-50 border-2 border-green-500">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-900">Backend Accepted Command</p>
          <div className="mt-2 space-y-1 text-xs text-green-800">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-700 text-white">{response.event_type}</Badge>
              <span>Event ID: {response.event_id}</span>
            </div>
            {response.previous_state && response.new_state && (
              <p>State Transition: {response.previous_state} → {response.new_state}</p>
            )}
            {response.timestamp && (
              <p>Timestamp (UTC): {new Date(response.timestamp).toISOString()}</p>
            )}
            {response.sequence_number && (
              <p>Sequence: #{response.sequence_number}</p>
            )}
          </div>
          <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs text-green-900">
            ✅ State mutation confirmed by backend. Refresh page to see updated projection.
          </div>
        </div>
      </div>
    </Card>
  );

  const renderRejected = () => (
    <Card className="p-4 bg-red-50 border-2 border-red-500">
      <div className="flex items-start gap-3">
        <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">Backend Rejected Command</p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-700 text-white">{response.error_code}</Badge>
              {response.http_status && (
                <Badge variant="outline" className="text-red-700">HTTP {response.http_status}</Badge>
              )}
            </div>
            <p className="text-red-800 font-medium mt-2">{response.error_message}</p>
            {response.validation_errors && response.validation_errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-900 font-medium">Validation Errors:</p>
                <ul className="list-disc list-inside text-red-800">
                  {response.validation_errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {response.blocked_reason && (
              <p className="text-red-800 mt-2">
                <span className="font-medium">Blocked Reason:</span> {response.blocked_reason}
              </p>
            )}
          </div>
          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-900">
            ❌ No state change occurred. Command not executed by backend.
          </div>
          {response.console_reference && (
            <Link
              to={createPageUrl('DeveloperConsole')}
              className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 underline"
            >
              See Developer Console {response.console_reference} <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </Card>
  );

  const renderError = () => (
    <Card className="p-4 bg-orange-50 border-2 border-orange-500">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-orange-900">Backend Communication Error</p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-700 text-white">{response.error_code}</Badge>
            </div>
            <p className="text-orange-800 font-medium mt-2">{response.error_message}</p>
          </div>
          <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded text-xs text-orange-900">
            ⚠️ Command execution status unknown. Backend may not have received or processed the command.
          </div>
          {response.error_code === 'BACKEND_NOT_DEPLOYED' && (
            <Link
              to={createPageUrl('DeveloperConsole')}
              className="mt-2 inline-flex items-center gap-1 text-xs text-orange-700 underline"
            >
              Backend deployment required - See Developer Console <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          {response.error_code === 'BACKEND_UNAVAILABLE' && (
            <div className="mt-2 text-xs text-orange-800">
              Backend mutation engine is not responding. Contact system administrator.
            </div>
          )}
          {response.error_code === 'TIMEOUT' && (
            <div className="mt-2 text-xs text-orange-800">
              Request timed out. Command may or may not have been executed. Check Evidence state manually.
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-2">
      {response.status === 'ACCEPTED' && renderAccepted()}
      {response.status === 'REJECTED' && renderRejected()}
      {response.status === 'ERROR' && renderError()}
      
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs text-slate-600 hover:text-slate-900 underline"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}