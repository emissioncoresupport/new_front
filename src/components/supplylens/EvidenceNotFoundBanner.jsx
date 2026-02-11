import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EvidenceNotFoundBanner({ focusValue, onClearRetry, onShowAll }) {
  return (
    <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 backdrop-blur-xl border-2 border-amber-200/60 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-amber-900 mb-1">
            Evidence Not Found
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            Evidence <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-xs">{focusValue}</code> was not found in this tenant.
          </p>
          <div className="flex gap-3">
            <Button
              size="sm"
              onClick={onClearRetry}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              Clear & Retry
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onShowAll}
              className="border-2 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              Show All Evidence
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}