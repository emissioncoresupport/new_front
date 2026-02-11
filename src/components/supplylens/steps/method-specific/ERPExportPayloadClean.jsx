import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Database, Hash, Calendar, Folder, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ERP_EXPORT Step 2 Adapter
 * Records immutable evidence of ERP data export with traceable provenance
 */
export default function ERPExportPayloadClean({ declaration, onNext, onBack, draftId, simulationMode }) {
  const [erpSystem, setErpSystem] = useState(declaration.erp_system || '');
  const [exportJobId, setExportJobId] = useState(declaration.export_job_id || '');
  const [exportType, setExportType] = useState(declaration.export_type || 'FULL');
  const [exportedAtUtc, setExportedAtUtc] = useState(
    declaration.exported_at_utc 
      ? new Date(declaration.exported_at_utc).toISOString().substring(0, 16)
      : new Date().toISOString().substring(0, 16)
  );
  const [periodStartUtc, setPeriodStartUtc] = useState(
    declaration.export_period_start_utc 
      ? new Date(declaration.export_period_start_utc).toISOString().substring(0, 16)
      : ''
  );
  const [periodEndUtc, setPeriodEndUtc] = useState(
    declaration.export_period_end_utc 
      ? new Date(declaration.export_period_end_utc).toISOString().substring(0, 16)
      : ''
  );
  const [storageLocation, setStorageLocation] = useState(declaration.storage_location || '');
  const [manifestDigest, setManifestDigest] = useState(declaration.manifest_digest_sha256 || '');
  const [recordCount, setRecordCount] = useState(declaration.record_count || '');
  const [fileCount, setFileCount] = useState(declaration.file_count || '');

  // Validation
  const jobIdValid = exportJobId.trim().length >= 5 && exportJobId.trim().length <= 80;
  const storageValid = storageLocation.trim().length >= 10 && storageLocation.trim().length <= 200;
  const exportedAtValid = exportedAtUtc?.length > 0;
  const periodValid = exportType !== 'DELTA' || (periodStartUtc && periodEndUtc);
  const digestValid = simulationMode || manifestDigest.trim().length === 64;

  const canProceed = erpSystem && jobIdValid && storageValid && exportedAtValid && periodValid && digestValid;

  // Generate simulated digest
  const generateSimulatedDigest = () => {
    const simDigest = 'SIM' + exportJobId.substring(0, 61).padEnd(61, '0');
    setManifestDigest(simDigest);
    toast.info('Simulated digest generated', { description: 'UI validation only', duration: 2000 });
  };

  useEffect(() => {
    // Sync to declaration
    declaration.erp_system = erpSystem;
    declaration.export_job_id = exportJobId;
    declaration.export_type = exportType;
    declaration.exported_at_utc = exportedAtUtc ? new Date(exportedAtUtc).toISOString() : '';
    declaration.export_period_start_utc = periodStartUtc ? new Date(periodStartUtc).toISOString() : null;
    declaration.export_period_end_utc = periodEndUtc ? new Date(periodEndUtc).toISOString() : null;
    declaration.storage_location = storageLocation;
    declaration.manifest_digest_sha256 = manifestDigest;
    declaration.record_count = recordCount ? parseInt(recordCount) : null;
    declaration.file_count = fileCount ? parseInt(fileCount) : null;
  }, [erpSystem, exportJobId, exportType, exportedAtUtc, periodStartUtc, periodEndUtc, storageLocation, manifestDigest, recordCount, fileCount]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900">Step 2: ERP Export Reference</h3>
        <p className="text-xs text-slate-600 mt-1">Record immutable evidence of ERP data export with traceable provenance</p>
      </div>

      <Card className="bg-blue-50/50 border-blue-300/60">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Database className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-medium">ERP Export Method</p>
              <p className="mt-1">Captures provenance of data exported from your ERP system. Manifest digest ensures integrity of export metadata.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Read-only binding (from Step 1) */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="p-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">Method</span>
            <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">ERP_EXPORT</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Evidence Type</span>
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">{declaration.dataset_type}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ERP System */}
      <div>
        <Label className="text-xs font-medium">ERP System *</Label>
        <Select value={erpSystem} onValueChange={setErpSystem}>
          <SelectTrigger>
            <SelectValue placeholder="Select ERP system" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SAP">SAP</SelectItem>
            <SelectItem value="ODOO">Odoo</SelectItem>
            <SelectItem value="DYNAMICS">Microsoft Dynamics</SelectItem>
            <SelectItem value="NETSUITE">NetSuite</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Export Job ID */}
      <div>
        <Label className="text-xs font-medium">Export Job ID * (5-80 chars)</Label>
        <Input
          value={exportJobId}
          onChange={(e) => setExportJobId(e.target.value)}
          placeholder="e.g., EXP-2026-01-SUPPLIER-MASTER"
          className="font-mono"
          maxLength={80}
        />
        <p className="text-xs text-slate-500 mt-1">
          Unique identifier for this export job from your ERP system.
        </p>
        {!jobIdValid && exportJobId.length > 0 && (
          <p className="text-xs text-red-600 mt-1">Must be 5-80 characters</p>
        )}
      </div>

      {/* Export Type */}
      <div>
        <Label className="text-xs font-medium">Export Type *</Label>
        <Select value={exportType} onValueChange={setExportType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL">Full Export (complete dataset)</SelectItem>
            <SelectItem value="DELTA">Delta Export (incremental changes)</SelectItem>
          </SelectContent>
        </Select>
        {exportType === 'DELTA' && (
          <Alert className="bg-amber-50 border-amber-300 mt-2">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 ml-2">
              Delta exports require period start and end dates below.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Exported At UTC */}
      <div>
        <Label className="text-xs font-medium">Exported At (UTC) *</Label>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Input
            type="datetime-local"
            value={exportedAtUtc}
            onChange={(e) => setExportedAtUtc(e.target.value)}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Timestamp when the export was executed in the ERP system.
        </p>
      </div>

      {/* Period Start/End (required for DELTA) */}
      {exportType === 'DELTA' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">Period Start (UTC) *</Label>
            <Input
              type="datetime-local"
              value={periodStartUtc}
              onChange={(e) => setPeriodStartUtc(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Period End (UTC) *</Label>
            <Input
              type="datetime-local"
              value={periodEndUtc}
              onChange={(e) => setPeriodEndUtc(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* Storage Location */}
      <div>
        <Label className="text-xs font-medium">Storage Location * (10-200 chars)</Label>
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-slate-400" />
          <Input
            value={storageLocation}
            onChange={(e) => setStorageLocation(e.target.value)}
            placeholder="e.g., s3://bucket/exports/2026-01/file.csv"
            className="flex-1 font-mono text-xs"
            maxLength={200}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Where the export is stored (S3, SharePoint, network path, etc.).
        </p>
        {!storageValid && storageLocation.length > 0 && (
          <p className="text-xs text-red-600 mt-1">Must be 10-200 characters</p>
        )}
      </div>

      {/* Manifest Digest SHA-256 */}
      <div>
        <Label className="text-xs font-medium">
          Manifest Digest SHA-256 * {simulationMode && '(optional in simulation)'}
        </Label>
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <Input
            value={manifestDigest}
            onChange={(e) => setManifestDigest(e.target.value)}
            placeholder="64 hex chars (SHA-256 of export manifest)"
            className="flex-1 font-mono text-xs"
            maxLength={64}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {simulationMode 
            ? 'Optional in simulation mode. Use button below to generate simulated digest.' 
            : 'Required in production. Hash of the export manifest metadata (not the full file).'}
        </p>
        {manifestDigest.length > 0 && manifestDigest.length !== 64 && (
          <p className="text-xs text-red-600 mt-1">Must be exactly 64 hex characters</p>
        )}
        {manifestDigest.startsWith('SIM') && (
          <Alert className="bg-amber-50 border-amber-300 mt-2">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <AlertDescription className="text-xs text-amber-900 ml-2">
              <strong>SIMULATED</strong> digest — UI validation only, not cryptographically secure.
            </AlertDescription>
          </Alert>
        )}

        {simulationMode && (
          <Button
            size="sm"
            variant="outline"
            onClick={generateSimulatedDigest}
            disabled={!exportJobId.trim()}
            className="w-full mt-2"
          >
            <Hash className="w-3 h-3 mr-2" />
            Generate Simulated Digest
          </Button>
        )}
      </div>

      {/* Optional Metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Record Count (optional)</Label>
          <Input
            type="number"
            value={recordCount}
            onChange={(e) => setRecordCount(e.target.value)}
            placeholder="e.g., 1500"
            className="font-mono"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">File Count (optional)</Label>
          <Input
            type="number"
            value={fileCount}
            onChange={(e) => setFileCount(e.target.value)}
            placeholder="e.g., 1"
            className="font-mono"
          />
        </div>
      </div>

      {simulationMode && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            <strong>UI Validation Mode:</strong> No ledger record created. Digest can be simulated.
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-green-50 border-green-300">
        <CardContent className="p-3 text-xs">
          <p className="text-green-900 font-medium mb-2">✓ Export Status</p>
          <div className="space-y-1 text-green-800">
            <p>• ERP System: <strong>{erpSystem || 'Not selected'}</strong></p>
            <p>• Export Job: <strong>{exportJobId || 'Not set'}</strong></p>
            <p>• Type: <strong>{exportType}</strong></p>
            <p>• Storage: <strong>{storageLocation ? storageLocation.substring(0, 40) + '...' : 'Not set'}</strong></p>
            <p>• Digest: <strong>{manifestDigest ? `${manifestDigest.substring(0, 16)}...` : 'Not computed'}</strong></p>
            <p className="text-[10px] text-green-700 mt-2">
              {simulationMode 
                ? '⚠️ Simulated — no immutable record, no server verification' 
                : 'Production — digest seals export manifest integrity'}
            </p>
          </div>
        </CardContent>
      </Card>

      {!canProceed && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            {!erpSystem && 'ERP system is required. '}
            {!jobIdValid && 'Export job ID must be 5-80 characters. '}
            {!storageValid && 'Storage location must be 10-200 characters. '}
            {!periodValid && 'Delta exports require period start and end dates. '}
            {!digestValid && 'Manifest digest required in production mode (64 hex chars).'}
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