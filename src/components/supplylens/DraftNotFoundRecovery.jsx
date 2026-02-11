import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Copy, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Draft Not Found Recovery Card
 * Displayed when draft_id is invalid or expired (404/403 from server)
 */
export default function DraftNotFoundRecovery({ draftId, correlationId, onCreateNew, onViewDiagnostics }) {
  const handleCopyCorrelationId = () => {
    navigator.clipboard.writeText(correlationId || 'N/A');
    toast.success('Correlation ID copied', { duration: 2000 });
  };

  return (
    <Card className="bg-red-50 border-red-300">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-red-900 text-lg">Draft Not Found</h3>
            <p className="text-sm text-red-800 mt-1">
              The draft you're trying to access is no longer available. It may have expired, been deleted, or you may not have permission to access it.
            </p>
          </div>
        </div>

        <div className="bg-white/60 border border-red-200 rounded p-3 text-xs space-y-1">
          <p className="text-red-900">
            <strong>Draft ID:</strong> <code className="font-mono">{draftId?.substring(0, 16) || 'N/A'}...</code>
          </p>
          {correlationId && (
            <p className="text-red-900">
              <strong>Last Correlation ID:</strong> <code className="font-mono">{correlationId.substring(0, 16)}...</code>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={onCreateNew}
            className="w-full bg-[#86b027] hover:bg-[#86b027]/90 text-white"
          >
            <FileQuestion className="w-4 h-4 mr-2" />
            Create New Draft
          </Button>
          
          {correlationId && (
            <Button
              variant="outline"
              onClick={handleCopyCorrelationId}
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Correlation ID
            </Button>
          )}
          
          {onViewDiagnostics && (
            <Button
              variant="ghost"
              onClick={onViewDiagnostics}
              className="w-full text-xs text-slate-600"
            >
              View Diagnostics (Internal)
            </Button>
          )}
        </div>

        <p className="text-xs text-red-700 italic">
          <strong>Note:</strong> Creating a new draft will preserve your current inputs from Step 1, but you'll need to re-enter payload/files.
        </p>
      </CardContent>
    </Card>
  );
}