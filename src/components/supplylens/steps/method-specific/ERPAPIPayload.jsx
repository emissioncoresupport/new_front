import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Database, Shield } from 'lucide-react';

/**
 * ERP_API Step 2 Adapter
 * Configures server-side ERP connector data fetch
 */
export default function ERPAPIPayload({ declaration, onNext, onBack, draftId, simulationMode }) {
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(
    declaration.snapshot_at_utc ? declaration.snapshot_at_utc.substring(0, 16) : ''
  );
  const [connectorRef, setConnectorRef] = useState(declaration.connector_reference || '');
  
  const canProceed = snapshotTimestamp && connectorRef.trim().length >= 3;

  useEffect(() => {
    declaration.snapshot_at_utc = snapshotTimestamp ? new Date(snapshotTimestamp).toISOString() : '';
    declaration.connector_reference = connectorRef;
  }, [snapshotTimestamp, connectorRef]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900">Step 2: Configure ERP API Fetch</h3>
        <p className="text-xs text-slate-600 mt-1">Server fetches data from ERP connector at seal time</p>
      </div>

      <Card className="bg-purple-50/50 border-purple-300/60">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900">
              <p className="font-medium">ERP API Connector</p>
              <p className="mt-1">Server uses pre-configured connector credentials to fetch data at seal time. Point-in-time snapshot.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot Timestamp */}
      <div>
        <Label className="text-xs font-medium">Snapshot Timestamp (UTC) *</Label>
        <Input
          type="datetime-local"
          value={snapshotTimestamp}
          onChange={(e) => setSnapshotTimestamp(e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">
          Point-in-time when data was extracted from ERP system.
        </p>
      </div>

      {/* Connector Reference */}
      <div>
        <Label className="text-xs font-medium">Connector Reference *</Label>
        <Input
          value={connectorRef}
          onChange={(e) => setConnectorRef(e.target.value)}
          placeholder="e.g., SAP_PROD_CONN_01"
          className="font-mono"
        />
        <p className="text-xs text-slate-500 mt-1">
          Server-side connector identifier (credentials protected).
        </p>
      </div>

      {/* Read-only binding */}
      <Card className="bg-slate-50/50 border-slate-200 mb-4">
        <CardContent className="p-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Source System</span>
            <Badge className="bg-purple-100 text-purple-800 text-[10px]">{declaration.source_system}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Evidence Type</span>
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">{declaration.dataset_type}</Badge>
          </div>
          {declaration.erp_instance_friendly_name && (
            <div className="flex justify-between">
              <span className="text-slate-600">ERP Instance</span>
              <code className="text-slate-900 font-mono text-[10px]">{declaration.erp_instance_friendly_name}</code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-300/60">
        <CardContent className="p-3 text-xs">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-blue-900">
              <p className="font-medium">Security & Data Fetching</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Credentials stored server-side, never logged</li>
                <li>Payload fetched at seal time using connector</li>
                <li>Snapshot timestamp ensures point-in-time consistency</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {simulationMode && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            <strong>UI Validation Mode:</strong> ERP connector will NOT be called. No payload fetched. Preview only.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-green-50 border-green-300">
        <CardContent className="p-3 text-xs">
          <p className="text-green-900 font-medium mb-2">✓ Payload Status</p>
          <div className="space-y-1 text-green-800">
            <p>• Attachments: <strong>0 (data fetched via connector)</strong></p>
            <p>• Payload: <strong>Server fetches from {declaration.source_system || 'ERP'}</strong></p>
            <p className="text-[10px] text-green-700 mt-2">
              {simulationMode 
                ? '⚠️ Simulated — no connector call, no payload stored' 
                : 'Server authenticates with ERP and fetches data at seal time'}
            </p>
          </div>
        </CardContent>
      </Card>

      {!canProceed && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            Complete snapshot timestamp and connector reference to proceed.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          onClick={onNext}
          disabled={!canProceed}
          className="bg-[#86b027] hover:bg-[#86b027]/90 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          Review & Seal
        </Button>
      </div>
    </div>
  );
}