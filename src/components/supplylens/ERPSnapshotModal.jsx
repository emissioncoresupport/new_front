import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * ERP SNAPSHOT INGESTION MODAL
 * 
 * DECLARATIVE | NON-AUTHORITATIVE | CONTRACT-BOUND
 * 
 * REQUIRES:
 * - Active ingestion profile
 * - User acknowledgment of declarative nature
 * 
 * CREATES:
 * - Evidence records ONLY
 * 
 * DOES NOT:
 * - Create entities
 * - Affect readiness
 * - Activate compliance
 */

export default function ERPSnapshotModal({ open, onClose, profile }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    erp_vendor: '',
    snapshot_timestamp: '',
    data_scope: 'master_data',
    snapshot_file: null
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Fetch and parse file content
      const response = await fetch(file_url);
      const content = await response.text();
      let snapshot_payload;

      if (file.name.endsWith('.json')) {
        snapshot_payload = JSON.parse(content);
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV to JSON conversion
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        snapshot_payload = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header.trim()] = values[i]?.trim();
            return obj;
          }, {});
        });
      } else {
        throw new Error('Unsupported file format. Use JSON or CSV.');
      }

      setFormData({ ...formData, snapshot_file: { file_url, snapshot_payload } });
    } catch (error) {
      alert('File upload failed: ' + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!acknowledged) {
      alert('You must acknowledge the declarative nature of ERP data');
      return;
    }

    setSubmitting(true);
    try {
      const response = await base44.functions.invoke('ingestERPSnapshot', {
        tenant_id: profile.tenant_id,
        contract_id: profile.profile_id,
        entity_context_id: profile.entity_id,
        erp_vendor: formData.erp_vendor,
        snapshot_timestamp: formData.snapshot_timestamp,
        snapshot_payload: formData.snapshot_file.snapshot_payload,
        command_id: `ERP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      setResult(response.data);
      setStep(3);
    } catch (error) {
      setResult({
        success: false,
        error: 'INGESTION_FAILED',
        message: error.message
      });
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setFormData({ erp_vendor: '', snapshot_timestamp: '', data_scope: 'master_data', snapshot_file: null });
    setAcknowledged(false);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-700" />
            ERP Snapshot Ingestion
          </DialogTitle>
        </DialogHeader>

        {/* MANDATORY WARNING BANNER */}
        <Card className="border-2 border-orange-500 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-orange-700 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-900 mb-1">
                ERP Data is Declarative and Non-Authoritative
              </p>
              <ul className="text-xs text-orange-800 space-y-1">
                <li>• ERP data is a declared snapshot, not system of record</li>
                <li>• It does NOT activate compliance modules</li>
                <li>• It does NOT affect entity readiness or risk scores</li>
                <li>• Evidence must be classified and structured before use</li>
              </ul>
            </div>
          </div>
        </Card>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>ERP Vendor *</Label>
              <Select value={formData.erp_vendor} onValueChange={(value) => setFormData({ ...formData, erp_vendor: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ERP system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAP">SAP</SelectItem>
                  <SelectItem value="Oracle">Oracle</SelectItem>
                  <SelectItem value="Microsoft Dynamics">Microsoft Dynamics</SelectItem>
                  <SelectItem value="NetSuite">NetSuite</SelectItem>
                  <SelectItem value="Odoo">Odoo</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Snapshot Timestamp *</Label>
              <Input
                type="datetime-local"
                value={formData.snapshot_timestamp}
                onChange={(e) => setFormData({ ...formData, snapshot_timestamp: e.target.value })}
              />
              <p className="text-xs text-slate-600 mt-1">When was this ERP data extracted?</p>
            </div>

            <div>
              <Label>Data Scope *</Label>
              <Select value={formData.data_scope} onValueChange={(value) => setFormData({ ...formData, data_scope: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_data">Master Data</SelectItem>
                  <SelectItem value="bom">Bill of Materials</SelectItem>
                  <SelectItem value="logistics">Logistics Data</SelectItem>
                  <SelectItem value="emissions">Emissions Inputs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Upload ERP Snapshot File (JSON or CSV) *</Label>
              <Input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              {formData.snapshot_file && (
                <p className="text-xs text-green-700 mt-1">
                  ✓ File uploaded ({Object.keys(formData.snapshot_file.snapshot_payload).length} records)
                </p>
              )}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!formData.erp_vendor || !formData.snapshot_timestamp || !formData.snapshot_file}
              className="w-full"
            >
              Continue to Acknowledgment
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card className="bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900 mb-3">Review Snapshot Details</p>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-600">ERP Vendor:</span>
                  <span className="font-medium">{formData.erp_vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Snapshot Time:</span>
                  <span className="font-medium">{formData.snapshot_timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Data Scope:</span>
                  <span className="font-medium">{formData.data_scope}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Records:</span>
                  <span className="font-medium">{Object.keys(formData.snapshot_file.snapshot_payload).length}</span>
                </div>
              </div>
            </Card>

            {/* MANDATORY ACKNOWLEDGMENT */}
            <Card className="border-2 border-orange-500 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={setAcknowledged}
                  className="mt-1"
                />
                <label htmlFor="acknowledge" className="text-sm text-orange-900 cursor-pointer">
                  <strong>I acknowledge that:</strong>
                  <br />
                  This ERP data is declarative and non-authoritative. It will create Evidence records only, and will NOT create entities, affect readiness scores, or activate compliance modules.
                </label>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!acknowledged || submitting}
                className="flex-1 bg-slate-800 hover:bg-slate-900"
              >
                {submitting ? 'Ingesting...' : 'Ingest ERP Snapshot'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-4">
            <Card className={`p-4 ${result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-700" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-700" />
                )}
                <p className="text-sm font-semibold text-slate-900">
                  {result.success ? 'ERP Snapshot Ingested' : 'Ingestion Failed'}
                </p>
              </div>

              {result.success && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-700" />
                      <span>Evidence created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span>Entity created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-slate-400" />
                      <span>Compliance activated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800 text-xs">DECLARATIVE</Badge>
                    </div>
                  </div>

                  <Card className="bg-white p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Details</p>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div>Evidence ID: <span className="text-slate-900 font-mono">{result.evidence_id}</span></div>
                      <div>Snapshot Hash: <span className="text-slate-900 font-mono text-[10px]">{result.snapshot_hash.slice(0, 16)}...</span></div>
                      <div>Contract ID: <span className="text-slate-900 font-mono">{result.contract_id}</span></div>
                    </div>
                  </Card>

                  <Card className="bg-blue-50 border-blue-500 p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Next Action Required</p>
                    <p className="text-xs text-blue-800">{result.next_action}</p>
                  </Card>
                </div>
              )}

              {!result.success && (
                <div className="text-xs text-red-800">
                  <p className="font-semibold mb-1">Error: {result.error}</p>
                  <p>{result.message}</p>
                </div>
              )}
            </Card>

            <Button onClick={resetAndClose} className="w-full">
              {result.success ? 'Close' : 'Retry'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}