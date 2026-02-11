import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, CheckCircle2, XCircle } from 'lucide-react';

/**
 * QUARANTINE EXECUTION PANEL
 * Admin-only trigger for legacy entity quarantine
 */

export default function QuarantineExecutionPanel() {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

  const executeQuarantine = async () => {
    setExecuting(true);
    try {
      const response = await base44.functions.invoke('quarantineLegacyEntities', {});
      setResult(response.data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="border-2 border-orange-500 bg-orange-50 p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-orange-700" />
        <div>
          <p className="text-lg font-semibold text-orange-900">Legacy Entity Quarantine</p>
          <p className="text-sm text-orange-800 mt-1">
            Execute PHASE D.1 quarantine to isolate entities without valid ingestion contracts
          </p>
        </div>
      </div>

      {!result && (
        <Button
          onClick={executeQuarantine}
          disabled={executing}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {executing ? 'Executing Quarantine...' : 'Execute Quarantine'}
        </Button>
      )}

      {result && (
        <div className="space-y-3 mt-4">
          <Card className={`p-4 ${result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              ) : (
                <XCircle className="w-5 h-5 text-red-700" />
              )}
              <p className="text-sm font-semibold text-slate-900">
                {result.success ? 'Quarantine Executed' : 'Execution Failed'}
              </p>
            </div>
            {result.success && result.summary && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <p className="text-xs text-slate-600">Scanned</p>
                  <p className="text-2xl font-light text-slate-900">{result.summary.total_scanned}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Quarantined</p>
                  <p className="text-2xl font-light text-orange-900">{result.summary.total_quarantined}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600">Compliant</p>
                  <p className="text-2xl font-light text-green-900">{result.summary.total_compliant}</p>
                </div>
              </div>
            )}
            {result.error && (
              <p className="text-xs text-red-800 mt-2">{result.error}</p>
            )}
          </Card>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
            Refresh Dashboard
          </Button>
        </div>
      )}
    </Card>
  );
}