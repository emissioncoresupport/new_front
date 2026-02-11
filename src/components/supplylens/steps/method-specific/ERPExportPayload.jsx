import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, AlertCircle, Database } from 'lucide-react';

export default function ERPExportPayload({ declaration, onNext, onBack, draftId, simulationMode }) {
  const [file, setFile] = React.useState(null);
  const [snapshotTimestamp, setSnapshotTimestamp] = React.useState(
    declaration.snapshot_at_utc ? declaration.snapshot_at_utc.substring(0, 16) : ''
  );
  const [exportJobId, setExportJobId] = React.useState(declaration.export_job_id || '');
  
  const canProceed = snapshotTimestamp && file;

  React.useEffect(() => {
    declaration.snapshot_at_utc = snapshotTimestamp ? new Date(snapshotTimestamp).toISOString() : '';
    declaration.export_job_id = exportJobId;
  }, [snapshotTimestamp, exportJobId]);

  const OriginalComponent = ({ file, setFile, declaration, setDeclaration, onNext, onBack }) => {
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const canProceed = file && declaration.snapshot_at_utc && declaration.export_job_id;

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">2. Provide ERP Export File</h3>

      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-3 text-sm text-purple-900 flex gap-2">
          <Database className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>ERP_EXPORT: Batch export file from {declaration.source_system}. Snapshot timestamp required for audit trail.</p>
        </CardContent>
      </Card>

      {/* Snapshot Timestamp */}
      <div className="space-y-2">
        <Label>Snapshot Timestamp (UTC) *</Label>
        <Input
          type="datetime-local"
          value={declaration.snapshot_at_utc ? declaration.snapshot_at_utc.substring(0, 16) : ''}
          onChange={(e) => setDeclaration({ ...declaration, snapshot_at_utc: e.target.value ? new Date(e.target.value).toISOString() : '' })}
          className="font-mono"
        />
        <p className="text-xs text-slate-500">When was this export generated in the source ERP system?</p>
      </div>

      {/* Export Job ID */}
      <div className="space-y-2">
        <Label>Export Job ID (Optional)</Label>
        <Input
          value={declaration.export_job_id || ''}
          onChange={(e) => setDeclaration({ ...declaration, export_job_id: e.target.value })}
          placeholder="e.g., SAP_EXPORT_20260126_001"
          className="font-mono"
        />
        <p className="text-xs text-slate-500">Reference ID from your ERP export job</p>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Upload Export File *</Label>
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors bg-white">
          <input
            type="file"
            id="erp-file"
            className="hidden"
            onChange={handleFileChange}
            accept=".csv,.json,.xml,.xlsx"
          />
          <label htmlFor="erp-file" className="cursor-pointer flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-purple-400" />
            {file ? (
              <div className="text-sm text-slate-900">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                <p className="font-medium">Click to upload ERP export file</p>
                <p className="text-xs text-slate-400">CSV, JSON, XML, XLSX</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Validation Error */}
      {!canProceed && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3 text-sm text-red-900 flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Missing required: snapshot_at_utc and file upload</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!canProceed} className="bg-[#86b027] hover:bg-[#86b027]/90">
          Review & Seal
        </Button>
      </div>
    </div>
  );
  };

  return <OriginalComponent file={file} setFile={setFile} declaration={declaration} setDeclaration={{}} onNext={onNext} onBack={onBack} />;
}