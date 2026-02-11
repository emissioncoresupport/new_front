import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Upload, FileText, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RequestBoundUploadModal({ request, supplierOrg, onClose, onComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [createGrant, setCreateGrant] = useState(true);
  const [evidenceId, setEvidenceId] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    // Simulate upload and seal
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newEvidenceId = `EV-${Date.now()}`;
    const evidenceRecord = {
      evidence_id: newEvidenceId,
      owner_org_id: supplierOrg.supplier_org_id,
      request_id: request.request_id,
      dataset_type: request.dataset_type,
      scope: request.scope,
      period: request.period,
      ledger_state: 'SEALED',
      ingestion_timestamp_utc: new Date().toISOString(),
      file_name: file.name,
      file_hash: `sha256_${Math.random().toString(36).substring(2, 15)}`,
      retention_end_utc: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      canonical_payload: {
        supplier_org_id: supplierOrg.supplier_org_id,
        request_id: request.request_id,
        dataset_type: request.dataset_type,
        scope: request.scope,
        period: request.period
      }
    };

    // Save evidence (in real system, this would be server-side)
    const existing = localStorage.getItem('supplier_evidence_records') || '[]';
    const records = JSON.parse(existing);
    records.push(evidenceRecord);
    localStorage.setItem('supplier_evidence_records', JSON.stringify(records));

    setEvidenceId(newEvidenceId);
    setUploadComplete(true);
    setUploading(false);
    toast.success('Evidence sealed successfully');
  };

  const handleComplete = () => {
    if (createGrant && evidenceId) {
      const grant = {
        grant_id: `GNT-${Date.now()}`,
        supplier_org_id: supplierOrg.supplier_org_id,
        buyer_org_id: request.buyer_org_id,
        evidence_id: evidenceId,
        dataset_type: request.dataset_type,
        scope: request.scope,
        period: request.period,
        status: 'ACTIVE',
        granted_at: new Date().toISOString(),
        granted_by: 'supplier_user@example.com'
      };

      const existing = localStorage.getItem('supplier_grants') || '[]';
      const grants = JSON.parse(existing);
      grants.push(grant);
      localStorage.setItem('supplier_grants', JSON.stringify(grants));

      // Log access event
      const accessLog = {
        log_id: `LOG-${Date.now()}`,
        evidence_id: evidenceId,
        tenant: supplierOrg.supplier_org_id,
        actor: 'supplier_user@example.com',
        action: 'GRANT_CREATED',
        allowed: true,
        grant_id: grant.grant_id,
        buyer_org: request.buyer_org_id,
        timestamp: new Date().toISOString()
      };
      
      const logs = localStorage.getItem('supplier_access_logs') || '[]';
      const allLogs = JSON.parse(logs);
      allLogs.push(accessLog);
      localStorage.setItem('supplier_access_logs', JSON.stringify(allLogs));
    }

    // Update request status
    const updatedRequest = { ...request, status: 'SUBMITTED', submitted_at: new Date().toISOString() };
    const stored = localStorage.getItem('supplier_request_packages') || '[]';
    const requests = JSON.parse(stored);
    const updated = requests.map(r => r.request_id === request.request_id ? updatedRequest : r);
    localStorage.setItem('supplier_request_packages', JSON.stringify(updated));

    onComplete(updatedRequest);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl">
        <CardHeader className="border-b border-slate-200/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-light text-slate-900">Upload Evidence (Request-Bound)</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Locked Context */}
          <Card className="border border-slate-300 bg-slate-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">Locked Context</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Request ID:</span>
                      <span className="ml-2 font-mono text-slate-900">{request.request_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Buyer:</span>
                      <span className="ml-2 text-slate-900">{request.buyer_org_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Dataset:</span>
                      <span className="ml-2"><Badge variant="outline" className="text-xs">{request.dataset_type}</Badge></span>
                    </div>
                    <div>
                      <span className="text-slate-500">Period:</span>
                      <span className="ml-2 text-slate-900">{request.period}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-light italic mt-2">
                    These values cannot be changed. Upload is bound to this request.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!uploadComplete ? (
            <>
              {/* File Upload */}
              <div>
                <Label className="text-sm text-slate-700 mb-2 block">Upload Evidence File *</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    id="evidence-file"
                  />
                  <label htmlFor="evidence-file" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    {file ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-900">{file.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Click to select file</p>
                    )}
                  </label>
                </div>
                {request.acceptable_file_types && (
                  <p className="text-xs text-slate-500 mt-1">
                    Accepted: {request.acceptable_file_types.join(', ')}
                  </p>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              >
                {uploading ? 'Sealing Evidence...' : 'Seal Evidence'}
              </Button>
            </>
          ) : (
            <>
              <Card className="border border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">Evidence Sealed</p>
                      <p className="text-xs text-green-700 font-mono mt-1">{evidenceId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grant Toggle */}
              <Card className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 mb-1">Grant Access to Requester</p>
                      <p className="text-xs text-slate-600 font-light">
                        Create Grant for {request.buyer_org_id} to access this evidence
                      </p>
                    </div>
                    <Switch
                      checked={createGrant}
                      onCheckedChange={setCreateGrant}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleComplete}
                className="w-full bg-[#86b027] hover:bg-[#86b027]/90 text-white"
              >
                Complete Submission
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}