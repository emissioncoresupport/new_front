import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * BUILD VERSION CHECKER
 * Detects drift between UI build and server build
 * Blocks "COMPLIANT" claims if drift detected
 */

const CLIENT_BUILD_ID = import.meta.env.VITE_BUILD_ID || 'dev-local';
const CONTRACT_VERSION = 'contract_ingest_v1';

export default function BuildVersionChecker() {
  const [lastTestRun, setLastTestRun] = useState(null);
  const [driftDetected, setDriftDetected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDrift();
  }, []);

  const checkDrift = async () => {
    setLoading(true);
    try {
      // Get last test run with build_id
      const runs = await base44.entities.ContractTestRun.list('-finished_at_utc', 1);
      
      if (runs.length > 0) {
        const lastRun = runs[0];
        setLastTestRun(lastRun);
        
        // Check if build_id exists and matches
        if (lastRun.build_id) {
          const drift = lastRun.build_id !== CLIENT_BUILD_ID;
          setDriftDetected(drift);
          
          if (drift) {
            console.warn('[BUILD DRIFT] UI build !== last test build');
            console.warn('[BUILD DRIFT] UI:', CLIENT_BUILD_ID);
            console.warn('[BUILD DRIFT] Last test:', lastRun.build_id);
          }
        } else {
          // No build_id in test run - Base44 gap
          console.warn('[BUILD DRIFT] Test run missing build_id - cannot verify');
          setDriftDetected(true); // Assume drift for safety
        }
      }
    } catch (error) {
      console.error('[BUILD DRIFT] Check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-3 flex items-center gap-2 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
          <span className="text-slate-600">Checking build version...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Build Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">UI Build ID</span>
            <code className="text-slate-900 font-mono text-[10px]">{CLIENT_BUILD_ID}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Contract Version</span>
            <Badge variant="outline" className="text-[10px] font-mono">{CONTRACT_VERSION}</Badge>
          </div>
          {lastTestRun && (
            <>
              <div className="pt-2 border-t border-slate-300"></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Last Test Build</span>
                <code className="text-slate-900 font-mono text-[10px]">
                  {lastTestRun.build_id || 'N/A (Base44 gap)'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Last Test Run</span>
                <span className="text-slate-700">
                  {new Date(lastTestRun.finished_at_utc).toLocaleString()}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Drift Warning */}
      {driftDetected && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-900 ml-2">
            <p className="font-semibold mb-1">⚠️ BUILD DRIFT DETECTED</p>
            <p className="text-xs mb-2">
              UI build differs from last test run. Test results may not reflect current code.
            </p>
            <div className="bg-red-100 rounded p-2 text-[10px] font-mono space-y-1">
              <p>UI build: <span className="font-bold">{CLIENT_BUILD_ID}</span></p>
              <p>Test build: <span className="font-bold">{lastTestRun?.build_id || 'unknown'}</span></p>
            </div>
            <p className="text-xs mt-2 font-bold">
              → Cannot claim "COMPLIANT" until tests re-run on current build
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!driftDetected && lastTestRun && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-900 ml-2">
            ✓ No drift detected - UI and test builds match
          </AlertDescription>
        </Alert>
      )}

      {!lastTestRun && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900 ml-2">
            No test runs found. Run Contract 1 tests to establish baseline.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}