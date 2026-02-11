import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ModeBanner({ simulationMode }) {
  if (simulationMode) {
    return (
      <Alert className="border-amber-400 bg-amber-50 backdrop-blur-sm mb-4">
        <AlertCircle className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-900 font-bold text-sm">⚠️ UI Validation Mode</AlertTitle>
        <AlertDescription className="text-amber-900 text-xs mt-1">
          <strong>No file bytes stored. No immutable ledger record created. Hashes are test-only.</strong>
        </AlertDescription>
      </Alert>
    );
  }

  // Production mode
  return (
    <Alert className="border-green-400 bg-green-50 backdrop-blur-sm mb-4">
      <Check className="h-4 w-4 text-green-700" />
      <AlertTitle className="text-green-900 font-bold text-sm">✓ Production Mode</AlertTitle>
      <AlertDescription className="text-green-900 text-xs mt-1">
        <strong>Server computes hashes. Sealing creates immutable ledger record. Cannot be deleted or edited after seal.</strong>
      </AlertDescription>
    </Alert>
  );
}