import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import ScopeEntitySelector from './ScopeEntitySelector';
import { validateDatasetScopeCompatibility, getAllowedScopes, getRecommendedScope, DATASET_SCOPE_MATRIX } from '@/components/supplylens/utils/datasetScopeMatrix';
import { 
  getAllMethodOptions, 
  getAllChannelOptions, 
  getAllEvidenceTypeOptions,
  isMethodEvidenceTypeCompatible,
  channelRequiresSupplierSubmissionId,
  getMethodRequiredFieldErrors,
  SUBMISSION_CHANNELS,
  EVIDENCE_TYPES
} from '@/components/supplylens/utils/contract1MethodRegistry';
import HowMethodsWorkModal from '../HowMethodsWorkModal';

const SCOPES = [
  { value: 'ENTIRE_ORGANIZATION', label: 'Entire Organization' },
  { value: 'LEGAL_ENTITY', label: 'Legal Entity' },
  { value: 'SITE', label: 'Site/Facility' },
  { value: 'PRODUCT_FAMILY', label: 'Product Family' },
  { value: 'UNKNOWN', label: 'UNKNOWN / UNLINKED (triggers quarantine)' }
];
const RETENTION_POLICIES = [
  { value: 'STANDARD_1_YEAR', label: '1 Year (Standard)' },
  { value: 'STANDARD_7_YEARS', label: '7 Years (Standard)' },
  { value: 'CONTRACTUAL', label: 'Contractual (7 Years)' },
  { value: 'REGULATORY', label: 'Regulatory (10 Years)' },
  { value: 'CUSTOM', label: 'Custom Period' }
];
const GDPR_BASIS = ['CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTERESTS', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS'];
const ERP_SYSTEMS = ['SAP', 'MICROSOFT_DYNAMICS', 'ORACLE', 'ODOO', 'NETSUITE', 'OTHER'];

export default function Contract1DeclarationStepEnforced({ declaration, setDeclaration, onNext, onCancel, creatingDraft }) {
  const [errors, setErrors] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  // SOURCE SYSTEM ENFORCEMENT: When method changes, enforce source_system constraints
  useEffect(() => {
    const method = declaration.ingestion_method;

    // CRITICAL: Single enum value only
    if (method === 'MANUAL_ENTRY') {
      setDeclaration(prev => ({ ...prev, source_system: 'INTERNAL_MANUAL' }));
    } else if (['ERP_API', 'ERP_EXPORT'].includes(method)) {
      if (!ERP_SYSTEMS.includes(declaration.source_system)) {
        setDeclaration(prev => ({ ...prev, source_system: 'SAP' }));
      }
    } else if (method === 'FILE_UPLOAD' || method === 'API_PUSH') {
      if (!declaration.source_system || !['OTHER', ...ERP_SYSTEMS].includes(declaration.source_system)) {
        setDeclaration(prev => ({ ...prev, source_system: 'OTHER' }));
      }
    }

    // Clear incompatible fields when method changes
    if (method !== 'API_PUSH') {
      setDeclaration(prev => ({ ...prev, external_reference_id: null }));
    }
    if (method !== 'ERP_API') {
      setDeclaration(prev => ({ ...prev, connector_reference: null, api_event_reference: null }));
    }
    if (method !== 'ERP_EXPORT') {
      setDeclaration(prev => ({ ...prev, export_job_id: null }));
    }
    if (!['ERP_API', 'ERP_EXPORT'].includes(method)) {
      setDeclaration(prev => ({ ...prev, snapshot_at_utc: null, erp_instance_friendly_name: null }));
    }
    if (method !== 'MANUAL_ENTRY') {
      setDeclaration(prev => ({ ...prev, entry_notes: null, pii_confirmation: false }));
    }
  }, [declaration.ingestion_method]);

  const validate = () => {
    const errs = {};

    // Common fields
    if (!declaration.ingestion_method) errs.ingestion_method = 'Required';
    if (!declaration.evidence_type) errs.evidence_type = 'Required';
    
    // Evidence type compatibility
    if (declaration.ingestion_method && declaration.evidence_type) {
      if (!isMethodEvidenceTypeCompatible(declaration.ingestion_method, declaration.evidence_type)) {
        errs.evidence_type = `${declaration.evidence_type} not allowed for ${declaration.ingestion_method}`;
      }
    }
    
    if (declaration.evidence_type === 'OTHER' && (!declaration.other_evidence_description || declaration.other_evidence_description.length < 10)) {
      errs.other_evidence_description = 'Required: minimum 10 characters';
    }
    
    if (!declaration.declared_scope) errs.declared_scope = 'Required';
    
    // Scope target ID validation
    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(declaration.declared_scope)) {
      if (!declaration.scope_target_id || declaration.scope_target_id.trim().length === 0) {
        errs.scope_target_id = 'Select a valid entity from registry';
      }
    } else if (declaration.declared_scope === 'ENTIRE_ORGANIZATION') {
      if (declaration.scope_target_id) {
        setDeclaration(prev => ({ ...prev, scope_target_id: null, scope_target_name: null }));
      }
    } else if (declaration.declared_scope === 'UNKNOWN') {
      if (!declaration.unlinked_reason || declaration.unlinked_reason.length < 30) {
        errs.unlinked_reason = 'Required: minimum 30 characters explaining why this cannot be linked';
      }
      if (!declaration.resolution_due_date) {
        errs.resolution_due_date = 'Required: resolution deadline within 90 days';
      }
    }
    
    if (!declaration.why_this_evidence || declaration.why_this_evidence.length < 20) {
      errs.why_this_evidence = 'Minimum 20 characters required';
    }
    
    if (!Array.isArray(declaration.purpose_tags) || declaration.purpose_tags.length === 0) {
      errs.purpose_tags = 'Select at least 1 tag';
    }
    
    if (!declaration.retention_policy) errs.retention_policy = 'Required';
    if (declaration.contains_personal_data === undefined) errs.contains_personal_data = 'Required';
    
    if (declaration.contains_personal_data && !declaration.gdpr_legal_basis) {
      errs.gdpr_legal_basis = 'Required when personal data present';
    }
    if (declaration.contains_personal_data && !declaration.retention_justification) {
      errs.retention_justification = 'Required when personal data present';
    }

    // Method-specific validation via registry
    const methodErrors = getMethodRequiredFieldErrors(declaration.ingestion_method, declaration);
    methodErrors.forEach(err => {
      errs[err.field] = err.message;
    });

    // External reference ID is optional - no validation required

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    } else {
      toast.error('Please fix validation errors', { duration: 4000 });
    }
  };

  const getSourceSystemOptions = () => {
    const method = declaration.ingestion_method;
    if (method === 'MANUAL_ENTRY') return [{ value: 'INTERNAL_MANUAL', label: 'Internal Manual' }];
    if (['ERP_API', 'ERP_EXPORT'].includes(method)) {
      return ERP_SYSTEMS.filter(s => s !== 'OTHER').map(s => ({ value: s, label: s.replace(/_/g, ' ') }));
    }
    if (method === 'FILE_UPLOAD' || method === 'API_PUSH') {
      return ERP_SYSTEMS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }));
    }
    return [{ value: 'OTHER', label: 'Other' }];
  };

  const getScopeTargetLabel = () => {
    if (declaration.declared_scope === 'LEGAL_ENTITY') return 'Legal Entity ID';
    if (declaration.declared_scope === 'SITE') return 'Site/Facility ID';
    if (declaration.declared_scope === 'PRODUCT_FAMILY') return 'Product Family ID';
    return 'Scope Target ID';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Step 1: Provenance & Metadata</h3>
          <p className="text-xs text-slate-600">Declare how evidence arrived and its context</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(true)}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          <HelpCircle className="w-4 h-4 mr-1" />
          How Methods Work
        </Button>
      </div>

      <HowMethodsWorkModal open={showHelp} onClose={() => setShowHelp(false)} />

      <div className="space-y-4">
        {/* Ingestion Method */}
        <div>
          <Label className="text-xs font-semibold text-slate-700">Ingestion Method * (how evidence arrived)</Label>
          <Select value={declaration.ingestion_method} onValueChange={(v) => setDeclaration({ ...declaration, ingestion_method: v })}>
            <SelectTrigger className={errors.ingestion_method ? 'border-red-400' : ''}>
              <SelectValue placeholder="Select ingestion mechanism..." />
            </SelectTrigger>
            <SelectContent>
              {getAllMethodOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ingestion_method && <p className="text-xs text-red-600 mt-1">{errors.ingestion_method}</p>}
        </div>

        {/* Data Source (provenance context) */}
        <div>
          <Label className="text-xs font-medium">Data Source (context only)</Label>
          <Select 
            value={declaration.submission_channel || 'INTERNAL_USER'} 
            onValueChange={(v) => setDeclaration({ ...declaration, submission_channel: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL_USER">
                <div>
                  <p className="font-medium">Internal entry (employee)</p>
                  <p className="text-xs text-slate-500">Data entered by internal staff</p>
                </div>
              </SelectItem>
              <SelectItem value="SUPPLIER_PORTAL">
                <div>
                  <p className="font-medium">Provided by supplier (external)</p>
                  <p className="text-xs text-slate-500">Data submitted by supplier</p>
                </div>
              </SelectItem>
              <SelectItem value="CONSULTANT_PORTAL">
                <div>
                  <p className="font-medium">Provided by consultant/auditor (external)</p>
                  <p className="text-xs text-slate-500">Data from external auditor or consultant</p>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">Optional. Used for provenance. Does not change ingestion method.</p>
        </div>

        {/* External Reference ID (optional, for external sources) */}
        {declaration.submission_channel !== 'INTERNAL_USER' && (
          <div className="pl-4 border-l-4 border-blue-400 bg-blue-50/30 p-3 rounded space-y-2">
            <Label className="text-xs font-medium">External Reference ID (optional)</Label>
            <Input
              value={declaration.supplier_submission_id || ''}
              onChange={(e) => setDeclaration({ ...declaration, supplier_submission_id: e.target.value })}
              placeholder="e.g., EMAIL_2026-01-28, PORTAL_SUB_abc123, AUDITPACK_2026Q1"
              className="font-mono"
            />
            <p className="text-xs text-slate-500">Optional reference to the source. Not required to proceed.</p>
          </div>
        )}

        {/* Source System (enforced by method) */}
        {!['MANUAL_ENTRY'].includes(declaration.ingestion_method) && (
          <div>
            <Label className="text-xs font-medium">Source System *</Label>
            <Select 
              value={declaration.source_system || 'OTHER'} 
              onValueChange={(v) => setDeclaration({ ...declaration, source_system: v })}
            >
              <SelectTrigger className={errors.source_system ? 'border-red-400' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getSourceSystemOptions().map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source_system && <p className="text-xs text-red-600 mt-1">{errors.source_system}</p>}
          </div>
        )}

        {declaration.ingestion_method === 'MANUAL_ENTRY' && (
          <div className="bg-slate-50/50 border border-slate-200 rounded p-3">
            <Label className="text-xs font-medium text-slate-600">Source System (auto-locked by method)</Label>
            <div className="mt-2 px-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-700 font-medium">
              Internal Manual
            </div>
            <p className="text-xs text-slate-500 mt-1">Server-enforced: cannot be changed for Manual Entry</p>
          </div>
        )}

        {/* ERP Instance Friendly Name (ERP methods ONLY) */}
        {(['ERP_API', 'ERP_EXPORT'].includes(declaration.ingestion_method)) && (
          <div className="bg-purple-50/50 border border-purple-200 rounded p-3 space-y-2">
            <Label className="text-xs font-medium">ERP Instance Name *</Label>
            <Input
              value={declaration.erp_instance_friendly_name || ''}
              onChange={(e) => setDeclaration({ ...declaration, erp_instance_friendly_name: e.target.value })}
              placeholder="e.g., SAP S/4HANA Production"
              className={errors.erp_instance_friendly_name ? 'border-red-400' : ''}
            />
            <p className="text-xs text-slate-500">Friendly name for audit trail readability</p>
            {errors.erp_instance_friendly_name && <p className="text-xs text-red-600 mt-1">{errors.erp_instance_friendly_name}</p>}
          </div>
        )}

        {/* Evidence Type */}
        <div>
          <Label className="text-xs font-semibold text-slate-700">Evidence Type *</Label>
          <Select 
            value={declaration.evidence_type} 
            onValueChange={(v) => {
              const recommendedScope = getRecommendedScope(v);
              setDeclaration({ 
                ...declaration, 
                evidence_type: v,
                declared_scope: recommendedScope
              });
            }}
          >
            <SelectTrigger className={errors.evidence_type ? 'border-red-400' : ''}>
              <SelectValue placeholder="Select evidence type..." />
            </SelectTrigger>
            <SelectContent>
              {getAllEvidenceTypeOptions().map(t => {
                const isAllowed = isMethodEvidenceTypeCompatible(declaration.ingestion_method, t.value);
                return (
                  <SelectItem 
                    key={t.value} 
                    value={t.value}
                    disabled={!isAllowed}
                  >
                    <div>
                      <p className="font-medium">{t.label}</p>
                      <p className="text-xs text-slate-500">{t.description}</p>
                      {!isAllowed && <p className="text-xs text-red-600 mt-1">Not allowed for {declaration.ingestion_method}</p>}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors.evidence_type && <p className="text-xs text-red-600 mt-1">{errors.evidence_type}</p>}
        </div>

        {/* Other Evidence Description (if OTHER selected) */}
        {declaration.evidence_type === 'OTHER' && (
          <div>
            <Label className="text-xs font-medium">Other Evidence Description * (min 10 chars)</Label>
            <Input
              value={declaration.other_evidence_description || ''}
              onChange={(e) => setDeclaration({ ...declaration, other_evidence_description: e.target.value })}
              placeholder="e.g., Custom Compliance Report, Site Audit Log"
              className={errors.other_evidence_description ? 'border-red-400' : ''}
            />
            <p className="text-xs text-slate-500 mt-1">{(declaration.other_evidence_description || '').length} / 10 chars minimum</p>
            {errors.other_evidence_description && <p className="text-xs text-red-600 mt-1">{errors.other_evidence_description}</p>}
          </div>
        )}

        {/* Declared Scope */}
        <div>
          <Label className="text-xs font-semibold text-slate-700">Declared Scope *</Label>
          <Select 
            value={declaration.declared_scope} 
            onValueChange={(v) => {
              setDeclaration({ ...declaration, declared_scope: v });
            }}
          >
            <SelectTrigger className={errors.declared_scope ? 'border-red-400' : ''}>
              <SelectValue placeholder="Select scope..." />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.declared_scope && <p className="text-xs text-red-600 mt-1">{errors.declared_scope}</p>}
        </div>

        {/* UNKNOWN Scope (Unlinked) */}
        {declaration.declared_scope === 'UNKNOWN' && (
          <div className="pl-4 border-l-4 border-red-400 space-y-3 bg-red-50/30 p-4 rounded">
            <Alert className="bg-red-100 border-red-300">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900 ml-2">
                <strong>⚠️ UNKNOWN scope triggers QUARANTINE</strong>
                <p className="text-xs mt-1">Record will be quarantined until linked to a valid scope target.</p>
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-xs font-medium">Why Cannot Be Linked? * (min 30 chars)</Label>
              <Textarea
                value={declaration.unlinked_reason || ''}
                onChange={(e) => setDeclaration({ ...declaration, unlinked_reason: e.target.value })}
                placeholder="Explain why this evidence cannot be linked to a specific scope target..."
                className={`min-h-24 ${errors.unlinked_reason ? 'border-red-400' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">{(declaration.unlinked_reason || '').length} / 30 chars minimum</p>
              {errors.unlinked_reason && <p className="text-xs text-red-600 mt-1">{errors.unlinked_reason}</p>}
            </div>

            <div>
              <Label className="text-xs font-medium">Resolution Deadline * (within 90 days)</Label>
              <Input
                type="date"
                value={declaration.resolution_due_date || ''}
                onChange={(e) => setDeclaration({ ...declaration, resolution_due_date: e.target.value })}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                max={new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]}
                className={errors.resolution_due_date ? 'border-red-400' : ''}
              />
              {errors.resolution_due_date && <p className="text-xs text-red-600 mt-1">{errors.resolution_due_date}</p>}
            </div>
          </div>
        )}

        {/* Scope Target ID (conditional) */}
        {['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(declaration.declared_scope) && (
          <div className="pl-4 border-l-4 border-[#86b027]/40 space-y-2 bg-[#86b027]/5 p-3 rounded">
            <Label className="text-xs font-medium">{getScopeTargetLabel()} *</Label>
            {declaration.declared_scope === 'LEGAL_ENTITY' && (
              <ScopeEntitySelector
                entityType="LegalEntity"
                value={declaration.scope_target_id}
                onChange={(id, name) => setDeclaration({ ...declaration, scope_target_id: id, scope_target_name: name })}
                placeholder="Search legal entities..."
                error={errors.scope_target_id}
              />
            )}
            {declaration.declared_scope === 'SITE' && (
              <ScopeEntitySelector
                entityType="Site"
                value={declaration.scope_target_id}
                onChange={(id, name) => setDeclaration({ ...declaration, scope_target_id: id, scope_target_name: name })}
                placeholder="Search sites/facilities..."
                error={errors.scope_target_id}
              />
            )}
            {declaration.declared_scope === 'PRODUCT_FAMILY' && (
              <ScopeEntitySelector
                entityType="Product"
                value={declaration.scope_target_id}
                onChange={(id, name) => setDeclaration({ ...declaration, scope_target_id: id, scope_target_name: name })}
                placeholder="Search product families..."
                error={errors.scope_target_id}
              />
            )}
            {declaration.scope_target_name && (
              <div className="bg-white border border-[#86b027]/30 rounded px-3 py-2 mt-2">
                <p className="text-xs text-slate-600">Selected Entity:</p>
                <p className="text-sm font-medium text-[#86b027]">{declaration.scope_target_name}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">ID: {declaration.scope_target_id}</p>
              </div>
            )}
            {errors.scope_target_id && <p className="text-xs text-red-600 mt-2">{errors.scope_target_id}</p>}
          </div>
        )}

        {/* Why This Evidence */}
        <div>
          <Label className="text-xs font-medium">Why This Evidence? * (min 20 chars)</Label>
          <Textarea
            value={declaration.why_this_evidence || ''}
            onChange={(e) => setDeclaration({ ...declaration, why_this_evidence: e.target.value })}
            placeholder="Explain why this evidence is needed for compliance, audit, or calculations..."
            className={`h-20 ${errors.why_this_evidence ? 'border-red-400' : ''}`}
          />
          <p className="text-xs text-slate-500 mt-1">{(declaration.why_this_evidence || '').length} / 20 chars minimum</p>
          {errors.why_this_evidence && <p className="text-xs text-red-600 mt-1">{errors.why_this_evidence}</p>}
        </div>

        {/* Purpose Tags */}
        <div>
          <Label className="text-xs font-medium">Purpose Tags * (min 1)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {['COMPLIANCE', 'AUDIT', 'RISK_ASSESSMENT', 'QUALITY_CONTROL'].map(tag => (
              <Button
                key={tag}
                size="sm"
                variant={declaration.purpose_tags?.includes(tag) ? 'default' : 'outline'}
                onClick={() => {
                  const tags = declaration.purpose_tags?.includes(tag)
                    ? declaration.purpose_tags.filter(t => t !== tag)
                    : [...(declaration.purpose_tags || []), tag];
                  setDeclaration({ ...declaration, purpose_tags: tags });
                }}
                className={declaration.purpose_tags?.includes(tag) ? 'bg-[#86b027] hover:bg-[#86b027]/90' : ''}
              >
                {tag}
              </Button>
            ))}
          </div>
          {errors.purpose_tags && <p className="text-xs text-red-600 mt-1">{errors.purpose_tags}</p>}
        </div>

        {/* Retention Policy */}
        <div>
          <Label className="text-xs font-medium">Retention Policy *</Label>
          <Select value={declaration.retention_policy} onValueChange={(v) => setDeclaration({ ...declaration, retention_policy: v })}>
            <SelectTrigger className={errors.retention_policy ? 'border-red-400' : ''}>
              <SelectValue placeholder="Select retention period..." />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_POLICIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.retention_policy && <p className="text-xs text-red-600 mt-1">{errors.retention_policy}</p>}
        </div>

        {declaration.retention_policy === 'CUSTOM' && (
          <div className="pl-3 border-l-2 border-amber-300">
            <Label className="text-xs font-medium">Custom Days *</Label>
            <Input
              type="number"
              value={declaration.retention_custom_days || ''}
              onChange={(e) => setDeclaration({ ...declaration, retention_custom_days: parseInt(e.target.value) })}
              min="1"
              max="3650"
            />
          </div>
        )}

        {/* Personal Data */}
        <div>
          <Label className="text-xs font-medium">Contains Personal Data? *</Label>
          <div className="flex gap-4 mt-2">
            <Button
              size="sm"
              variant={declaration.contains_personal_data === true ? 'default' : 'outline'}
              onClick={() => setDeclaration({ ...declaration, contains_personal_data: true })}
              className={declaration.contains_personal_data === true ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant={declaration.contains_personal_data === false ? 'default' : 'outline'}
              onClick={() => setDeclaration({ ...declaration, contains_personal_data: false })}
            >
              No
            </Button>
          </div>
          {errors.contains_personal_data && <p className="text-xs text-red-600 mt-1">{errors.contains_personal_data}</p>}
          
          {/* PII Confirmation (MANUAL_ENTRY specific) */}
          {declaration.ingestion_method === 'MANUAL_ENTRY' && declaration.contains_personal_data === true && (
            <Card className="bg-red-50 border-red-300 mt-3">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="pii-confirmation"
                    checked={declaration.pii_confirmation || false}
                    onChange={(e) => setDeclaration({ ...declaration, pii_confirmation: e.target.checked })}
                    className="mt-1"
                  />
                  <label htmlFor="pii-confirmation" className="text-xs text-red-900">
                    <span className="font-bold">I confirm:</span> I have legal basis under GDPR Art. 6 and applied data minimization.
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* GDPR Basis (conditional) */}
        {declaration.contains_personal_data && (
          <div className="pl-3 border-l-2 border-red-300 space-y-3">
            <div>
              <Label className="text-xs font-medium">GDPR Legal Basis *</Label>
              <Select value={declaration.gdpr_legal_basis} onValueChange={(v) => setDeclaration({ ...declaration, gdpr_legal_basis: v })}>
                <SelectTrigger className={errors.gdpr_legal_basis ? 'border-red-400' : ''}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {GDPR_BASIS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.gdpr_legal_basis && <p className="text-xs text-red-600 mt-1">{errors.gdpr_legal_basis}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">Retention Justification *</Label>
              <Textarea
                value={declaration.retention_justification || ''}
                onChange={(e) => setDeclaration({ ...declaration, retention_justification: e.target.value })}
                placeholder="Why is this retention period necessary?"
                className={errors.retention_justification ? 'border-red-400' : ''}
              />
              {errors.retention_justification && <p className="text-xs text-red-600 mt-1">{errors.retention_justification}</p>}
            </div>
          </div>
        )}

        {/* Method-Specific Fields */}
        {declaration.ingestion_method === 'API_PUSH' && (
          <div className="pl-4 border-l-4 border-indigo-400 space-y-3 bg-indigo-50/30 p-3 rounded">
            <div>
              <Label className="text-xs font-medium">External Reference ID * (idempotency key)</Label>
              <Input
                value={declaration.external_reference_id || ''}
                onChange={(e) => setDeclaration({ ...declaration, external_reference_id: e.target.value })}
                placeholder="e.g., ORDER-2026-12345"
                className={`font-mono ${errors.external_reference_id ? 'border-red-400' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">Prevents duplicate sealing (idempotent replay protection)</p>
              {errors.external_reference_id && <p className="text-xs text-red-600 mt-1">{errors.external_reference_id}</p>}
            </div>
          </div>
        )}

        {['ERP_API', 'ERP_EXPORT'].includes(declaration.ingestion_method) && (
          <div className="pl-4 border-l-4 border-purple-400 space-y-3 bg-purple-50/30 p-3 rounded">
            <div>
              <Label className="text-xs font-medium">Snapshot Timestamp (UTC) *</Label>
              <Input
                type="datetime-local"
                value={declaration.snapshot_at_utc ? declaration.snapshot_at_utc.substring(0, 16) : ''}
                onChange={(e) => setDeclaration({ ...declaration, snapshot_at_utc: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className={errors.snapshot_at_utc ? 'border-red-400' : ''}
              />
              <p className="text-xs text-slate-500 mt-1">Point-in-time when data was extracted from ERP</p>
              {errors.snapshot_at_utc && <p className="text-xs text-red-600 mt-1">{errors.snapshot_at_utc}</p>}
            </div>
          </div>
        )}

        {declaration.ingestion_method === 'ERP_API' && (
          <div className="pl-4 border-l-4 border-violet-400 space-y-3 bg-violet-50/30 p-3 rounded">
            <div>
              <Label className="text-xs font-medium">Connector Reference *</Label>
              <Input
                value={declaration.connector_reference || ''}
                onChange={(e) => setDeclaration({ ...declaration, connector_reference: e.target.value })}
                placeholder="e.g., SAP_PROD_CONN_01"
                className={`font-mono ${errors.connector_reference ? 'border-red-400' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">Server-side connector identifier</p>
              {errors.connector_reference && <p className="text-xs text-red-600 mt-1">{errors.connector_reference}</p>}
            </div>
            <div>
              <Label className="text-xs font-medium">API Event Reference *</Label>
              <Input
                value={declaration.api_event_reference || ''}
                onChange={(e) => setDeclaration({ ...declaration, api_event_reference: e.target.value })}
                placeholder="e.g., EVT-2026-01-29-12345"
                className={`font-mono ${errors.api_event_reference ? 'border-red-400' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">Unique API call identifier</p>
              {errors.api_event_reference && <p className="text-xs text-red-600 mt-1">{errors.api_event_reference}</p>}
            </div>
          </div>
        )}

        {declaration.ingestion_method === 'MANUAL_ENTRY' && (
          <div className="pl-4 border-l-4 border-amber-400 space-y-3 bg-amber-50/30 p-3 rounded">
            <div>
              <Label className="text-xs font-medium">Attestation Notes * (min 20 chars)</Label>
              <Textarea
                value={declaration.entry_notes || ''}
                onChange={(e) => setDeclaration({ ...declaration, entry_notes: e.target.value })}
                placeholder="Describe what you are entering and why automated ingestion is not possible..."
                className={`min-h-24 ${errors.entry_notes ? 'border-red-400' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">{(declaration.entry_notes || '').length} / 20 chars minimum</p>
              {errors.entry_notes && <p className="text-xs text-red-600 mt-1">{errors.entry_notes}</p>}
            </div>
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900 ml-2">
                <strong>Auto-Captured at Seal:</strong> Attestor User ID, Sealed At (UTC), Method, Trust Level: LOW, Review Status: NOT_REVIEWED
              </AlertDescription>
            </Alert>
          </div>
        )}

        {declaration.ingestion_method === 'ERP_EXPORT' && (
          <div className="pl-4 border-l-4 border-purple-400 space-y-3 bg-purple-50/30 p-3 rounded">
            <div>
              <Label className="text-xs font-medium">Export Job ID *</Label>
              <Input
                value={declaration.export_job_id || ''}
                onChange={(e) => setDeclaration({ ...declaration, export_job_id: e.target.value })}
                placeholder="e.g., SAP_EXPORT_20260129_001"
                className={`font-mono ${errors.export_job_id ? 'border-red-400' : ''}`}
              />
              <p className="text-xs text-slate-500 mt-1">Batch export job identifier</p>
              {errors.export_job_id && <p className="text-xs text-red-600 mt-1">{errors.export_job_id}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={creatingDraft}>Cancel</Button>
        <Button 
          onClick={handleNext} 
          disabled={creatingDraft}
          className="bg-[#86b027] hover:bg-[#86b027]/90 disabled:opacity-50"
        >
          {creatingDraft ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Creating draft...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Next: Payload
            </>
          )}
        </Button>
      </div>
    </div>
  );
}