import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { base44 } from "@/api/base44Client";

// Constants
const INGESTION_METHODS = [
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'ERP_EXPORT', label: 'ERP Export (file)' },
  { value: 'ERP_API', label: 'ERP API Connection' },
  { value: 'SUPPLIER_PORTAL', label: 'Supplier Portal' },
  { value: 'API_PUSH', label: 'API Push' },
  { value: 'MANUAL', label: 'Manual Entry' }
];

const DATASET_TYPES = [
  'SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'TRANSACTION_LINES',
  'LOGISTICS_ACTIVITY', 'LCA_INPUTS', 'CBAM_SUPPORT', 'CSRD_SUPPORT',
  'EUDR_SUPPORT', 'PPWR_SUPPORT', 'PFAS_SUPPORT', 'OTHER'
];

const SOURCE_SYSTEMS = [
  'SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO',
  'INFOR', 'EPICOR', 'IFS', 'SAGE', 'WORKDAY', 'OTHER'
];

const SCOPES = [
  { value: 'ENTIRE_ORGANIZATION', label: 'Entire Organization' },
  { value: 'LEGAL_ENTITY', label: 'Legal Entity' },
  { value: 'SITE', label: 'Site/Facility' },
  { value: 'PRODUCT_FAMILY', label: 'Product Family' },
  { value: 'UNKNOWN', label: 'Unknown Scope' }
];

const INTENTS = [
  'REGULATORY_COMPLIANCE', 'SUPPLIER_ONBOARDING', 'DATA_QUALITY_IMPROVEMENT',
  'AUDIT_PREPARATION', 'ROUTINE_UPDATE', 'INCIDENT_INVESTIGATION',
  'CORRECTION_SUPERSEDING', 'HISTORICAL_BACKFILL', 'OTHER'
];

const CONSUMERS = [
  'CBAM', 'CSRD', 'DPP', 'PCF', 'EUDR', 'LOGISTICS',
  'PPWR', 'PFAS', 'EUDAMED', 'CSDDD', 'INTERNAL_ONLY'
];

const RETENTION_POLICIES = [
  { value: 'REGULATORY_HOLD', label: 'Regulatory Hold (indefinite)' },
  { value: 'STANDARD_1_YEAR', label: '1 Year' },
  { value: 'STANDARD_3_YEARS', label: '3 Years' },
  { value: 'STANDARD_7_YEARS', label: '7 Years' },
  { value: 'STANDARD_10_YEARS', label: '10 Years' },
  { value: 'CUSTOM', label: 'Custom Duration' }
];

const GDPR_BASIS = [
  'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'
];

// Determine which fields are required based on ingestion method
const getRequiredFieldsForMethod = (method) => {
  const baseRequired = ['dataset_type', 'source_system', 'declared_scope', 'declared_intent', 'retention_policy', 'intended_consumers'];
  const methodSpecific = {
    FILE_UPLOAD: ['file'],
    ERP_EXPORT: ['snapshot_date_utc'],
    ERP_API: ['snapshot_date_utc'],
    SUPPLIER_PORTAL: ['supplier_portal_request_id'],
    API_PUSH: ['api_payload'],
    MANUAL: ['manual_entry_note']
  };
  return [...baseRequired, ...(methodSpecific[method] || [])];
};

export default function Contract1DeclarationStep({ declaration, setDeclaration, onValidation }) {
  const [connectorExists, setConnectorExists] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (declaration.ingestion_method === 'ERP_API') {
      base44.entities.ERPConnection.list()
        .then(conns => setConnectorExists(conns && conns.length > 0))
        .catch(() => setConnectorExists(false));
    }
  }, [declaration.ingestion_method]);

  const update = (field, value) => {
    setDeclaration(prev => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const toggleConsumer = (consumer) => {
    const updated = declaration.intended_consumers.includes(consumer)
      ? declaration.intended_consumers.filter(c => c !== consumer)
      : [...declaration.intended_consumers, consumer];
    update('intended_consumers', updated);
  };

  // Validate declaration section
  const validateSection = () => {
    const errors = {};
    const required = getRequiredFieldsForMethod(declaration.ingestion_method);

    // Check core fields
    if (!declaration.ingestion_method) errors.ingestion_method = 'Required';
    if (!declaration.dataset_type) errors.dataset_type = 'Required';
    if (!declaration.source_system) errors.source_system = 'Required';
    if (declaration.source_system === 'OTHER' && !declaration.source_system_detail) errors.source_system_detail = 'Required';
    if (!declaration.declared_scope) errors.declared_scope = 'Required';
    if (!declaration.declared_intent) errors.declared_intent = 'Required';
    if (!declaration.retention_policy) errors.retention_policy = 'Required';
    if (declaration.retention_policy === 'CUSTOM' && !declaration.retention_duration_days) errors.retention_duration_days = 'Required';

    // Conditional fields
    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(declaration.declared_scope) && !declaration.scope_target_id) {
      errors.scope_target_id = 'Required for this scope';
    }
    if (declaration.personal_data_present && !declaration.gdpr_legal_basis) {
      errors.gdpr_legal_basis = 'Required when personal data present';
    }
    if (declaration.intended_consumers.length === 0) {
      errors.intended_consumers = 'Select at least one purpose';
    }

    // Method-specific fields
    if (declaration.ingestion_method === 'FILE_UPLOAD' && !declaration.file) {
      errors.file = 'Required for file upload';
    }
    if (['ERP_EXPORT', 'ERP_API'].includes(declaration.ingestion_method) && !declaration.snapshot_date_utc) {
      errors.snapshot_date_utc = 'Required for ERP methods';
    }
    if (declaration.ingestion_method === 'SUPPLIER_PORTAL' && !declaration.supplier_portal_request_id) {
      errors.supplier_portal_request_id = 'Required for supplier portal';
    }
    if (declaration.ingestion_method === 'API_PUSH' && !declaration.api_payload) {
      errors.api_payload = 'Required for API push';
    }
    if (declaration.ingestion_method === 'MANUAL' && !declaration.manual_entry_note) {
      errors.manual_entry_note = 'Required for manual entry';
    }

    setFieldErrors(errors);
    if (onValidation) onValidation(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const FieldError = ({ field }) => (
    fieldErrors[field] ? (
      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
        <AlertCircle className="w-3 h-3" /> {fieldErrors[field]}
      </p>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Step 1: Ingestion Declaration</h3>
        <p className="text-xs text-slate-600">Define what data is being submitted and why. Fields adjust based on ingestion method.</p>

        {/* INGESTION METHOD — Always shown, controls conditional fields */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            How is evidence being provided? 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.ingestion_method} onValueChange={(v) => update('ingestion_method', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.ingestion_method ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {INGESTION_METHODS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="ingestion_method" />
          <p className="text-xs text-slate-500">This controls which supporting fields are required.</p>
        </div>

        {/* DATASET TYPE — Always shown */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Data Type 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.dataset_type} onValueChange={(v) => update('dataset_type', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.dataset_type ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {DATASET_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="dataset_type" />
        </div>

        {/* SOURCE SYSTEM — Always shown */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Source System 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.source_system} onValueChange={(v) => update('source_system', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.source_system ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select system" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_SYSTEMS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="source_system" />
        </div>

        {/* SOURCE SYSTEM DETAIL (conditional) — only if source_system=OTHER */}
        {declaration.source_system === 'OTHER' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Specify System Name 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              placeholder="e.g., Custom ERP, Legacy System"
              value={declaration.source_system_detail || ''}
              onChange={(e) => update('source_system_detail', e.target.value)}
              className={`bg-white/50 ${fieldErrors.source_system_detail ? 'border-red-400' : ''}`}
            />
            <FieldError field="source_system_detail" />
          </div>
        )}

        {/* SNAPSHOT DATE (conditional) — only for ERP methods */}
        {['ERP_EXPORT', 'ERP_API'].includes(declaration.ingestion_method) && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Data Snapshot Date (UTC) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={declaration.snapshot_date_utc || ''}
              onChange={(e) => update('snapshot_date_utc', e.target.value)}
              className={`bg-white/50 ${fieldErrors.snapshot_date_utc ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500">Exact point-in-time when ERP snapshot was taken</p>
            <FieldError field="snapshot_date_utc" />
          </div>
        )}

        {/* FILE INPUT (conditional) — only for FILE_UPLOAD */}
        {declaration.ingestion_method === 'FILE_UPLOAD' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              File 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="file"
              onChange={(e) => update('file', e.target.files?.[0] || null)}
              className={`bg-white/50 ${fieldErrors.file ? 'border-red-400' : ''}`}
            />
            <FieldError field="file" />
          </div>
        )}

        {/* SUPPLIER PORTAL REQUEST ID (conditional) */}
        {declaration.ingestion_method === 'SUPPLIER_PORTAL' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Supplier Portal Request ID 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              placeholder="e.g., REQ-2026-001234"
              value={declaration.supplier_portal_request_id || ''}
              onChange={(e) => update('supplier_portal_request_id', e.target.value)}
              className={`bg-white/50 ${fieldErrors.supplier_portal_request_id ? 'border-red-400' : ''}`}
            />
            <FieldError field="supplier_portal_request_id" />
          </div>
        )}

        {/* API PAYLOAD (conditional) */}
        {declaration.ingestion_method === 'API_PUSH' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              API Payload (JSON) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <textarea
              placeholder='{"key": "value"}'
              value={declaration.api_payload || ''}
              onChange={(e) => update('api_payload', e.target.value)}
              className={`bg-white/50 border rounded p-2 text-xs font-mono w-full h-20 ${fieldErrors.api_payload ? 'border-red-400' : ''}`}
            />
            <FieldError field="api_payload" />
          </div>
        )}

        {/* MANUAL ENTRY NOTE (conditional) */}
        {declaration.ingestion_method === 'MANUAL' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Entry Notes (max 280) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              maxLength={280}
              placeholder="Why is this manual entry needed?"
              value={declaration.manual_entry_note || ''}
              onChange={(e) => update('manual_entry_note', e.target.value)}
              className={`bg-white/50 ${fieldErrors.manual_entry_note ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500">{(declaration.manual_entry_note || '').length}/280</p>
            <FieldError field="manual_entry_note" />
          </div>
        )}

        {/* DECLARED SCOPE — Always shown */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Scope of Data 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.declared_scope} onValueChange={(v) => update('declared_scope', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.declared_scope ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="declared_scope" />
        </div>

        {/* SCOPE TARGET ID (conditional) — only for specific scopes */}
        {['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(declaration.declared_scope) && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Target Entity/Site ID 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              placeholder="e.g., entity_123, site_456"
              value={declaration.scope_target_id || ''}
              onChange={(e) => update('scope_target_id', e.target.value)}
              className={`bg-white/50 ${fieldErrors.scope_target_id ? 'border-red-400' : ''}`}
            />
            <FieldError field="scope_target_id" />
          </div>
        )}

        {/* DECLARED INTENT — Always shown */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Primary Intent 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.declared_intent} onValueChange={(v) => update('declared_intent', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.declared_intent ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select intent" />
            </SelectTrigger>
            <SelectContent>
              {INTENTS.map(i => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="declared_intent" />
        </div>

        {/* INTENT DETAILS — Optional context */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Additional Context (max 280)</Label>
          <Input
            placeholder="Why is this data being submitted?"
            maxLength={280}
            value={declaration.intent_details || ''}
            onChange={(e) => update('intent_details', e.target.value)}
            className="bg-white/50"
          />
          <p className="text-xs text-slate-500">{(declaration.intent_details || '').length}/280</p>
        </div>

        {/* PURPOSE TAGS (INTENDED CONSUMERS) — Always shown, at least 1 required */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-slate-700">
            Purpose Tags (select at least 1) 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {CONSUMERS.map(c => (
              <div key={c} className="flex items-center gap-2">
                <Checkbox
                  checked={declaration.intended_consumers.includes(c)}
                  onCheckedChange={() => toggleConsumer(c)}
                  id={`consumer_${c}`}
                />
                <label htmlFor={`consumer_${c}`} className="text-xs cursor-pointer text-slate-700">
                  {c}
                </label>
              </div>
            ))}
          </div>
          <FieldError field="intended_consumers" />
        </div>

        {/* PERSONAL DATA PRESENCE — Always shown */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-slate-700">
            Contains Personal Data? 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === true}
                onCheckedChange={() => update('personal_data_present', true)}
                id="has-personal"
              />
              <label htmlFor="has-personal" className="text-xs cursor-pointer">Yes</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === false}
                onCheckedChange={() => update('personal_data_present', false)}
                id="no-personal"
              />
              <label htmlFor="no-personal" className="text-xs cursor-pointer">No</label>
            </div>
          </div>
        </div>

        {/* GDPR LEGAL BASIS (conditional) — only if personal_data_present=true */}
        {declaration.personal_data_present && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              GDPR Legal Basis 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={declaration.gdpr_legal_basis} onValueChange={(v) => update('gdpr_legal_basis', v)}>
              <SelectTrigger className={`bg-white/50 ${fieldErrors.gdpr_legal_basis ? 'border-red-400' : ''}`}>
                <SelectValue placeholder="Select basis" />
              </SelectTrigger>
              <SelectContent>
                {GDPR_BASIS.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError field="gdpr_legal_basis" />
          </div>
        )}

        {/* RETENTION POLICY — Always shown */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Retention Policy 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.retention_policy} onValueChange={(v) => update('retention_policy', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.retention_policy ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select policy" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_POLICIES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="retention_policy" />
        </div>

        {/* RETENTION DURATION (conditional) — only if retention_policy=CUSTOM */}
        {declaration.retention_policy === 'CUSTOM' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Duration (days) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              placeholder="365"
              min="1"
              value={declaration.retention_duration_days || ''}
              onChange={(e) => update('retention_duration_days', e.target.value ? parseInt(e.target.value) : null)}
              className={`bg-white/50 ${fieldErrors.retention_duration_days ? 'border-red-400' : ''}`}
            />
            <FieldError field="retention_duration_days" />
          </div>
        )}

        {/* ERP API CONNECTOR STATUS */}
        {declaration.ingestion_method === 'ERP_API' && (
          <div className="pt-4 border-t">
            {connectorExists ? (
              <Card className="bg-green-50/50 border-green-200">
                <CardContent className="p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700">ERP connector available</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-amber-50/50 border-amber-200">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">No ERP connector configured. Create one in Integrations.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* DECLARATION SUMMARY — Read-only preview */}
      <Card className="bg-gradient-to-br from-slate-50/80 to-white/80 border-slate-200 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Declaration Summary</h4>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Method</p>
              <p className="text-slate-900 font-mono">{declaration.ingestion_method || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Data Type</p>
              <p className="text-slate-900 font-mono">{declaration.dataset_type || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Source System</p>
              <p className="text-slate-900 font-mono">
                {declaration.source_system === 'OTHER' 
                  ? declaration.source_system_detail || '—'
                  : declaration.source_system || '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Scope</p>
              <p className="text-slate-900 font-mono">{declaration.declared_scope || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Intent</p>
              <p className="text-slate-900 font-mono">{declaration.declared_intent || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Retention</p>
              <p className="text-slate-900 font-mono">
                {declaration.retention_policy === 'CUSTOM'
                  ? `${declaration.retention_duration_days} days`
                  : declaration.retention_policy?.replace('STANDARD_', '') || '—'}
              </p>
            </div>
          </div>

          {declaration.intended_consumers.length > 0 && (
            <div>
              <p className="text-slate-500 font-medium mb-1">Purpose Tags</p>
              <div className="flex flex-wrap gap-1">
                {declaration.intended_consumers.map(c => (
                  <span key={c} className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {declaration.personal_data_present && (
            <div>
              <p className="text-slate-500 font-medium">GDPR Basis</p>
              <p className="text-slate-900 font-mono">{declaration.gdpr_legal_basis || '—'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}