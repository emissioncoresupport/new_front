import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Upload, Shield, Lock, AlertTriangle, CheckCircle2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import PersonalDataWarning from './PersonalDataWarning';
import { calculateRetentionEndDate } from './GDPRControlsUtility';

const CONTRACT1_RECEIPT_REQUIRED = ['sealed_at_utc', 'payload_hash_sha256', 'metadata_hash_sha256'];

export default function EvidenceUploader({ onSuccess }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  const [metadata, setMetadata] = useState({
    ingestion_method: 'FILE_UPLOAD',
    dataset_type: '',
    source_system: '',
    source_system_name: '',
    source_system_type: '',
    snapshot_date_utc: '',
    declared_scope: '',
    scope_target_id: '',
    declared_intent: '',
    intent_details: '',
    intended_consumers: [],
    personal_data_present: false,
    gdpr_legal_basis: '',
    retention_policy: '',
    retention_duration_days: '',
    portal_submission_id: '',
    connection_id: '',
    query_id: '',
    manual_capture_text: ''
  });

  const datasetTypes = [
    'SUPPLIER_MASTER',
    'SKU_MASTER',
    'BOM',
    'SHIPMENTS',
    'CERTIFICATE',
    'DECLARATION',
    'OTHER'
  ];

  const sourceSystems = [
    'SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO',
    'INFOR', 'EPICOR', 'IFS', 'SAGE', 'WORKDAY', 'OTHER'
  ];

  const declaredIntents = [
    { value: 'REGULATORY_COMPLIANCE', label: 'Regulatory Reporting' },
    { value: 'SUPPLIER_ONBOARDING', label: 'Supplier Onboarding' },
    { value: 'DATA_QUALITY_IMPROVEMENT', label: 'Due Diligence' },
    { value: 'AUDIT_PREPARATION', label: 'Internal Estimation' },
    { value: 'ROUTINE_UPDATE', label: 'Correction/Superseding' },
    { value: 'INCIDENT_INVESTIGATION', label: 'Historical Backfill' }
  ];

  const modules = ['CBAM', 'CSRD', 'DPP', 'PCF', 'EUDR', 'LOGISTICS', 'PPWR', 'PFAS', 'EUDAMED', 'CSDDD', 'Internal Only'];

  const handleConsumerToggle = (module) => {
    setMetadata(prev => ({
      ...prev,
      intended_consumers: prev.intended_consumers.includes(module)
        ? prev.intended_consumers.filter(m => m !== module)
        : [...prev.intended_consumers, module]
    }));
  };

  const isMethodFieldsValid = () => {
    switch (metadata.ingestion_method) {
      case 'FILE_UPLOAD':
        return !!file;
      case 'ERP_EXPORT':
        return !!file && !!metadata.snapshot_date_utc;
      case 'ERP_API':
        return !!metadata.connection_id && !!metadata.query_id && !!metadata.snapshot_date_utc;
      case 'SUPPLIER_PORTAL':
        return !!metadata.portal_submission_id;
      case 'MANUAL':
        return !!metadata.manual_capture_text;
      default:
        return false;
    }
  };

  const validateForm = () => {
    const newErrors = [];

    // Section A: Ingestion Declaration
    if (!metadata.dataset_type) newErrors.push('Dataset type is required');
    if (!metadata.source_system) newErrors.push('Source system is required');
    
    if (metadata.source_system === 'OTHER') {
      if (!metadata.source_system_name) newErrors.push('Source system name required when system is OTHER');
      if (!metadata.source_system_type) newErrors.push('Source system type required when system is OTHER');
    }

    // Snapshot Date Rules
    const requiresSnapshot = ['ERP_EXPORT', 'ERP_API'].includes(metadata.ingestion_method) ||
                            ['SUPPLIER_MASTER', 'SKU_MASTER', 'BOM', 'SHIPMENTS'].includes(metadata.dataset_type);
    
    if (requiresSnapshot && !metadata.snapshot_date_utc) {
      newErrors.push('Snapshot date required for this ingestion method or dataset type');
    }

    // Declared Scope
    if (!metadata.declared_scope) newErrors.push('Declared scope is required');
    
    if (!['ENTIRE_ORGANIZATION', 'UNKNOWN'].includes(metadata.declared_scope) && !metadata.scope_target_id) {
      newErrors.push('Scope target ID required for this scope type');
    }

    // Section B: Intent
    if (!metadata.declared_intent) newErrors.push('Declared intent is required');
    if (metadata.intent_details && metadata.intent_details.length > 280) {
      newErrors.push('Intent details must be max 280 characters');
    }

    // Section C: Consumers
    if (metadata.intended_consumers.length === 0) {
      newErrors.push('At least one intended consumer is required');
    }

    // Section D: GDPR
    if (metadata.personal_data_present && !metadata.gdpr_legal_basis) {
      newErrors.push('GDPR legal basis required when personal data is present');
    }
    if (!metadata.retention_policy) newErrors.push('Retention policy is required');
    
    const retentionDays = {
      '1y': 365,
      '3y': 1095,
      '7y': 2555,
      '10y': 3650
    };
    
    if (metadata.retention_policy !== 'regulatory_hold' && !metadata.retention_duration_days) {
      if (retentionDays[metadata.retention_policy]) {
        metadata.retention_duration_days = retentionDays[metadata.retention_policy];
      } else {
        newErrors.push('Retention duration required for this policy');
      }
    }

    // Section E: Payload - Method-specific validation
    if (metadata.ingestion_method === 'FILE_UPLOAD' && !file) {
      newErrors.push('File upload required for FILE_UPLOAD method');
    }
    if (metadata.ingestion_method === 'MANUAL' && !metadata.manual_capture_text) {
      newErrors.push('Evidence capture text required for MANUAL method');
    }
    if (metadata.ingestion_method === 'SUPPLIER_PORTAL' && !metadata.portal_submission_id) {
      newErrors.push('Portal submission ID required for SUPPLIER_PORTAL method');
    }
    if (metadata.ingestion_method === 'ERP_API' && (!metadata.connection_id || !metadata.query_id)) {
      newErrors.push('Connection ID and Query ID required for ERP_API method');
    }
    if (metadata.ingestion_method === 'ERP_EXPORT' && !file) {
      newErrors.push('File required for ERP_EXPORT method');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      toast.error('Validation Failed', {
        description: 'Please fix all errors before submitting'
      });
      return;
    }

    setUploading(true);

    try {
      const idempotencyKey = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
      } else if (metadata.ingestion_method === 'MANUAL') {
        const blob = new Blob([JSON.stringify({
          capture_text: metadata.manual_capture_text,
          capture_timestamp: new Date().toISOString()
        })], { type: 'application/json' });
        formData.append('file', blob, 'manual_entry.json');
      }
      
      // Compute retention_end_utc never invalid
      const metadata_with_retention = {
        ...metadata,
        retention_end_utc: calculateRetentionEndDate(metadata.retention_policy),
        personal_data_flag: metadata.personal_data_present
      };

      formData.append('metadata', JSON.stringify(metadata_with_retention));

      const token = await base44.auth.getToken();
      const response = await fetch('/api/functions/ingestEvidence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // CONTRACT 1: Verify sealing before proceeding
        const requiredFields = CONTRACT1_RECEIPT_REQUIRED.filter(field => !result[field]);
        
        if (requiredFields.length > 0) {
          toast.error('Ingest Did Not Seal', {
            description: `Missing required sealing fields: ${requiredFields.join(', ')}`
          });
          return;
        }

        // Verify state is SEALED
        if (result.state !== 'SEALED') {
          toast.error('Contract 1 Violation', {
            description: `Evidence must be SEALED but is ${result.state}`
          });
          return;
        }

        toast.success('Evidence Sealed Successfully', {
          description: `Hash: ${result.payload_hash_sha256?.substring(0, 16)}...`
        });

        // Navigate to Evidence Receipt
        setTimeout(() => {
          navigate(`/supplylens?receipt=${result.evidence_id}`, { state: { receipt: result } });
          if (onSuccess) onSuccess(result);
        }, 500);
      } else {
        toast.error('Ingestion Failed', {
          description: result.error || result.message || 'Unknown error'
        });
      }
    } catch (error) {
      toast.error('Upload Failed', {
        description: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#86b027]" />
          <div>
            <CardTitle className="text-slate-900 font-light">Evidence Ingestion Declaration</CardTitle>
            <CardDescription className="font-light">Contract 1 — Explicit validation, zero defaults</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Section A: Ingestion Declaration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Section A: Ingestion Declaration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ingestion Method *</Label>
              <Select value={metadata.ingestion_method} onValueChange={(v) => setMetadata({...metadata, ingestion_method: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FILE_UPLOAD">File Upload</SelectItem>
                  <SelectItem value="ERP_EXPORT">ERP Export</SelectItem>
                  <SelectItem value="ERP_API">ERP API</SelectItem>
                  <SelectItem value="SUPPLIER_PORTAL">Supplier Portal</SelectItem>
                  <SelectItem value="MANUAL">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dataset Type *</Label>
              <Select value={metadata.dataset_type} onValueChange={(v) => setMetadata({...metadata, dataset_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPPLIER_MASTER">Supplier Master Data</SelectItem>
                  <SelectItem value="SKU_MASTER">SKU Master Data</SelectItem>
                  <SelectItem value="BOM">Bill of Materials</SelectItem>
                  <SelectItem value="SHIPMENTS">Shipment Records</SelectItem>
                  <SelectItem value="CERTIFICATE">Certificate or Declaration</SelectItem>
                  <SelectItem value="DECLARATION">Supplier Declaration</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source System *</Label>
              <Select value={metadata.source_system} onValueChange={(v) => setMetadata({...metadata, source_system: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select system..." />
                </SelectTrigger>
                <SelectContent>
                  {sourceSystems.map(sys => (
                    <SelectItem key={sys} value={sys}>{sys.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {metadata.source_system === 'OTHER' && (
              <>
                <div className="space-y-2">
                  <Label>Source System Name *</Label>
                  <Input 
                    value={metadata.source_system_name}
                    onChange={(e) => setMetadata({...metadata, source_system_name: e.target.value})}
                    placeholder="e.g., Internal Excel"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Source System Type *</Label>
                  <Select value={metadata.source_system_type} onValueChange={(v) => setMetadata({...metadata, source_system_type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ERP">ERP</SelectItem>
                      <SelectItem value="PLM">PLM</SelectItem>
                      <SelectItem value="SRM">SRM</SelectItem>
                      <SelectItem value="TMS">TMS</SelectItem>
                      <SelectItem value="Portal">Portal</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Fileshare">Fileshare</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {(['ERP_EXPORT', 'ERP_API'].includes(metadata.ingestion_method) || 
            ['SUPPLIER_MASTER', 'SKU_MASTER', 'BOM', 'SHIPMENTS'].includes(metadata.dataset_type)) && (
            <div className="space-y-2">
              <Label>Snapshot Date (UTC) *</Label>
              <Input 
                type="datetime-local" 
                value={metadata.snapshot_date_utc}
                onChange={(e) => setMetadata({...metadata, snapshot_date_utc: e.target.value})}
              />
              <p className="text-xs text-slate-500">Required for ERP methods and master data types</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Declared Scope *</Label>
              <Select value={metadata.declared_scope} onValueChange={(v) => setMetadata({...metadata, declared_scope: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTIRE_ORGANIZATION">Entire Organization</SelectItem>
                  <SelectItem value="LEGAL_ENTITY">Specific Legal Entity</SelectItem>
                  <SelectItem value="SITE">Single Site or Facility</SelectItem>
                  <SelectItem value="PRODUCT_FAMILY">Product Family</SelectItem>
                  <SelectItem value="UNKNOWN">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!['ENTIRE_ORGANIZATION', 'UNKNOWN'].includes(metadata.declared_scope) && metadata.declared_scope && (
              <div className="space-y-2">
                <Label>Scope Target ID *</Label>
                <Input 
                  value={metadata.scope_target_id}
                  onChange={(e) => setMetadata({...metadata, scope_target_id: e.target.value})}
                  placeholder="Entity ID"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section B: Declared Intent */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Section B: Declared Intent</h3>
          
          <div className="space-y-2">
            <Label>Declared Intent *</Label>
            <Select value={metadata.declared_intent} onValueChange={(v) => setMetadata({...metadata, declared_intent: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select intent..." />
              </SelectTrigger>
              <SelectContent>
                {declaredIntents.map(intent => (
                  <SelectItem key={intent.value} value={intent.value}>{intent.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Intent Details (Optional, max 280 chars)</Label>
            <Textarea
              placeholder="e.g., Q4 2025 supplier export for CBAM compliance"
              value={metadata.intent_details}
              onChange={(e) => setMetadata({...metadata, intent_details: e.target.value})}
              className="h-20"
              maxLength={280}
            />
            <p className="text-xs text-slate-500">{metadata.intent_details.length}/280</p>
          </div>
        </div>

        {/* Section C: Intended Consumers */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Section C: Intended Consumers *</h3>
          <p className="text-sm text-slate-600">Select at least one module that will consume this evidence</p>
          <div className="flex flex-wrap gap-2">
            {modules.map(module => (
              <Badge
                key={module}
                variant={metadata.intended_consumers.includes(module) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  metadata.intended_consumers.includes(module) 
                    ? 'bg-[#86b027] text-white' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={() => handleConsumerToggle(module)}
              >
                {module}
              </Badge>
            ))}
          </div>
        </div>

        {/* Section D: GDPR and Retention */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Section D: GDPR & Retention</h3>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="personal-data"
              checked={metadata.personal_data_present}
              onCheckedChange={(checked) => setMetadata({
                ...metadata, 
                personal_data_present: checked,
                gdpr_legal_basis: checked ? metadata.gdpr_legal_basis : ''
              })}
            />
            <label htmlFor="personal-data" className="text-sm text-slate-700 cursor-pointer">
              This evidence contains personal data
            </label>
          </div>

          <PersonalDataWarning isChecked={metadata.personal_data_present} />

          {metadata.personal_data_present && (
            <div className="space-y-2">
              <Label>GDPR Legal Basis *</Label>
              <Select value={metadata.gdpr_legal_basis} onValueChange={(v) => setMetadata({...metadata, gdpr_legal_basis: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select basis..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSENT">Consent</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="LEGAL_OBLIGATION">Legal Obligation</SelectItem>
                  <SelectItem value="VITAL_INTERESTS">Vital Interests</SelectItem>
                  <SelectItem value="PUBLIC_TASK">Public Task</SelectItem>
                  <SelectItem value="LEGITIMATE_INTERESTS">Legitimate Interests</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Retention Policy *</Label>
            <Select value={metadata.retention_policy} onValueChange={(v) => setMetadata({...metadata, retention_policy: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select policy..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1y">1 Year</SelectItem>
                <SelectItem value="3y">3 Years</SelectItem>
                <SelectItem value="7y">7 Years</SelectItem>
                <SelectItem value="10y">10 Years</SelectItem>
                <SelectItem value="regulatory_hold">Regulatory Hold (Indefinite)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section E: Evidence Payload */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">Section E: Evidence Payload</h3>
          
          {(metadata.ingestion_method === 'FILE_UPLOAD' || metadata.ingestion_method === 'ERP_EXPORT') && (
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              file ? 'border-[#86b027]/50 bg-[#86b027]/5' : 'border-slate-200 hover:border-[#86b027]/30'
            }`}>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
                id="evidence-file"
                accept=".xlsx,.csv,.pdf,.xml"
              />
              <label htmlFor="evidence-file" className="cursor-pointer">
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-[#86b027] mx-auto" />
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="font-medium text-slate-600">Click to upload file *</p>
                    <p className="text-sm text-slate-400">
                      {metadata.ingestion_method === 'ERP_EXPORT' ? 'Excel, CSV, XML' : 'Excel, CSV, PDF, XML'}
                    </p>
                  </div>
                )}
              </label>
            </div>
          )}

          {metadata.ingestion_method === 'ERP_API' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Connection ID *</Label>
                <Input 
                  value={metadata.connection_id}
                  onChange={(e) => setMetadata({...metadata, connection_id: e.target.value})}
                  placeholder="ERP connection identifier"
                />
              </div>
              <div className="space-y-2">
                <Label>Query ID *</Label>
                <Input 
                  value={metadata.query_id}
                  onChange={(e) => setMetadata({...metadata, query_id: e.target.value})}
                  placeholder="Query/extraction identifier"
                />
              </div>
            </div>
          )}

          {metadata.ingestion_method === 'SUPPLIER_PORTAL' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Portal Submission ID *</Label>
                <Input 
                  value={metadata.portal_submission_id}
                  onChange={(e) => setMetadata({...metadata, portal_submission_id: e.target.value})}
                  placeholder="e.g., SUB-2026-001"
                />
                <p className="text-xs text-slate-500">Unique identifier from supplier portal submission</p>
              </div>
              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="border-2 border-dashed rounded-xl p-4 text-center border-slate-200 hover:border-[#86b027]/30 transition-all">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    id="portal-attachments"
                    accept=".pdf,.xlsx,.csv,.xml"
                  />
                  <label htmlFor="portal-attachments" className="cursor-pointer">
                    {file ? (
                      <div className="space-y-1">
                        <FileText className="w-8 h-8 text-[#86b027] mx-auto" />
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-600">Add supporting documents</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {metadata.ingestion_method === 'MANUAL' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Evidence Capture Text *</Label>
                <Textarea
                  placeholder="Enter manually captured evidence details, observations, or data..."
                  value={metadata.manual_capture_text}
                  onChange={(e) => setMetadata({...metadata, manual_capture_text: e.target.value})}
                  className="h-32 font-mono text-sm"
                />
                <p className="text-xs text-slate-500">Stored as JSON bytes in payload_storage_uri</p>
              </div>
              <div className="space-y-2">
                <Label>Supporting Attachments (Optional)</Label>
                <div className="border-2 border-dashed rounded-xl p-4 text-center border-slate-200 hover:border-[#86b027]/30 transition-all">
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    id="manual-attachments"
                    accept=".pdf,.xlsx,.csv,.jpg,.png"
                  />
                  <label htmlFor="manual-attachments" className="cursor-pointer">
                    {file ? (
                      <div className="space-y-1">
                        <FileText className="w-8 h-8 text-[#86b027] mx-auto" />
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-600">Add photos or documents</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Validation Errors ({errors.length})</p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  {errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleUpload}
          disabled={uploading || !isMethodFieldsValid()}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
        >
          {uploading ? (
            <>
              <Lock className="w-4 h-4 mr-2 animate-pulse" />
              Sealing Evidence...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Ingest & Seal Evidence
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}