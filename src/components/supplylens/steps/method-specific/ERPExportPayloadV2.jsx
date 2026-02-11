import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Upload, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ERP_EXPORT Step 2 Adapter
 * Upload ERP export file with snapshot timestamp
 */
export default function ERPExportPayloadV2({ declaration, onNext, onBack, draftId, simulationMode }) {
  const [snapshotTimestamp, setSnapshotTimestamp] = useState(
    declaration.snapshot_at_utc ? declaration.snapshot_at_utc.substring(0, 16) : ''
  );
  const [exportJobId, setExportJobId] = useState(declaration.export_job_id || '');
  const [file, setFile] = useState(null);
  const fileInputRef = React.useRef(null);
  
  const canProceed = snapshotTimestamp && file;

  useEffect(() => {
    declaration.snapshot_at_utc = snapshotTimestamp ? new Date(snapshotTimestamp).toISOString() : '';
    declaration.export_job_id = exportJobId;
  }, [snapshotTimestamp, exportJobId]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    toast.success('File selected', { 
      description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)`,
      duration: 2000
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900">Step 2: Provide ERP Export File</h3>
        <p className="text-xs text-slate-600 mt-1">Upload file exported from ERP system</p>
      </div>

      <Card className="bg-purple-50/50 border-purple-300/60">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900">
              <p className="font-medium">ERP Export File</p>
              <p className="mt-1">Batch export from {declaration.source_system || 'ERP'}. Server hashes file bytes. Snapshot timestamp ensures point-in-time consistency.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-only binding (from Step 1) */}
      <Card className="bg-slate-50/50 border-slate-200">
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

      {/* Snapshot Timestamp */}
      <div>
        <Label className="text-xs font-medium">Snapshot Timestamp (UTC) *</Label>
        <Input
          type="datetime-local"
          value={snapshotTimestamp}
          onChange={(e) => setSnapshotTimestamp(e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">
          Point-in-time when this data was exported from ERP.
        </p>
      </div>

      {/* Export Job ID (optional) */}
      <div>
        <Label className="text-xs font-medium">Export Job ID (optional)</Label>
        <Input
          value={exportJobId}
          onChange={(e) => setExportJobId(e.target.value)}
          placeholder="e.g., SAP_EXPORT_20260126_001"
          className="font-mono"
        />
        <p className="text-xs text-slate-500 mt-1">
          Optional: Batch export job identifier from ERP system.
        </p>
      </div>

      {/* File Upload */}
      <div>
        <Label className="text-xs font-medium">ERP Export File * (CSV, JSON, XML, Excel)</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#86b027] hover:bg-[#86b027]/5 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".csv,.json,.xml,.xlsx,.xls"
            className="hidden"
          />
          {file ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 text-green-600 mx-auto" />
              <p className="text-sm font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-600">{(file.size / 1024).toFixed(2)} KB • {file.type || 'unknown'}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  toast.info('File removed', { duration: 2000 });
                }}
                className="text-xs"
              >
                Remove File
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600">Click to upload ERP export file</p>
              <p className="text-xs text-slate-500">CSV, JSON, XML, or Excel formats</p>
            </div>
          )}
        </div>
      </div>

      {simulationMode && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            <strong>UI Validation Mode:</strong> File will NOT be uploaded. No bytes stored. Preview only.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-green-50 border-green-300">
        <CardContent className="p-3 text-xs">
          <p className="text-green-900 font-medium mb-2">✓ Payload Status</p>
          <div className="space-y-1 text-green-800">
            <p>• Attachments: <strong>1 ERP export file expected</strong></p>
            <p>• Payload: <strong>Server hashes file bytes</strong></p>
            <p className="text-[10px] text-green-700 mt-2">
              {simulationMode 
                ? '⚠️ Simulated — no file stored, no hash computed' 
                : 'Server computes SHA-256 hash of exact file bytes'}
            </p>
          </div>
        </CardContent>
      </Card>

      {!canProceed && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            Complete snapshot timestamp and upload file to proceed.
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