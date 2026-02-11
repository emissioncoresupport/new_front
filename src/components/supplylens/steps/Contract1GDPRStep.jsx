import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Info } from 'lucide-react';

const GDPR_BASIS = [
  { value: 'CONTRACT', label: 'Contract Performance', help: 'Processing necessary to perform a contract' },
  { value: 'LEGAL_OBLIGATION', label: 'Legal Obligation', help: 'Processing required by EU/national law' },
  { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate Interests', help: 'Our legitimate interests (not overridden by rights)' },
  { value: 'CONSENT', label: 'Explicit Consent', help: 'Freely given, specific consent from data subject' },
  { value: 'VITAL_INTERESTS', label: 'Vital Interests', help: 'Protecting vital interests of data subject' },
  { value: 'PUBLIC_TASK', label: 'Public Task', help: 'Performing official authority task' }
];

const RETENTION_POLICIES = [
  { value: '6_MONTHS', label: '6 Months', days: 180 },
  { value: '12_MONTHS', label: '1 Year', days: 365 },
  { value: '3_YEARS', label: '3 Years', days: 1095 },
  { value: '6_YEARS', label: '6 Years', days: 2190 },
  { value: '10_YEARS', label: '10 Years', days: 3650 },
  { value: 'CUSTOM', label: 'Custom Duration', days: null }
];

const EXPORT_RESTRICTIONS = [
  { value: 'NONE', label: 'No Restrictions' },
  { value: 'EU_ONLY', label: 'EU Processing Only' },
  { value: 'CUSTOMER_POLICY', label: 'Per Customer Data Policy' }
];

export default function Contract1GDPRStep({ declaration, setDeclaration, onValidation }) {
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (field, value) => {
    setDeclaration(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  // Compute retention_end_date_utc based on snapshot_date and retention policy
  const retentionEndDate = useMemo(() => {
    if (!declaration.snapshot_date_utc && !declaration.ingestion_date_utc) return null;
    
    const baseDate = new Date(declaration.snapshot_date_utc || declaration.ingestion_date_utc);
    let days = 0;

    if (declaration.retention_policy === 'CUSTOM') {
      days = declaration.retention_custom_days || 0;
    } else {
      const policy = RETENTION_POLICIES.find(p => p.value === declaration.retention_policy);
      days = policy?.days || 0;
    }

    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + days);
    return endDate.toISOString().split('T')[0]; // Return as YYYY-MM-DD
  }, [declaration.snapshot_date_utc, declaration.ingestion_date_utc, declaration.retention_policy, declaration.retention_custom_days]);

  const validateSection = () => {
    const errors = {};

    // retention_policy required
    if (!declaration.retention_policy) {
      errors.retention_policy = 'Required';
    }

    // If retention_policy=CUSTOM, retention_custom_days required
    if (declaration.retention_policy === 'CUSTOM') {
      if (!declaration.retention_custom_days || declaration.retention_custom_days < 1 || declaration.retention_custom_days > 3650) {
        errors.retention_custom_days = 'Required: 1–3650 days';
      }
    }

    // If personal_data_present=true, require gdpr_legal_basis
    if (declaration.personal_data_present === true && !declaration.gdpr_legal_basis) {
      errors.gdpr_legal_basis = 'Required when personal data present';
    }

    // data_minimization_confirmed must be true
    if (!declaration.data_minimization_confirmed) {
      errors.data_minimization_confirmed = 'Must confirm data minimization';
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
        <h3 className="text-sm font-semibold text-slate-900">Step 4: GDPR & Retention</h3>

        <Card className="bg-blue-50/40 border-blue-200">
          <CardContent className="p-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Declare personal data and legal basis explicitly. Retention is computed and enforced automatically.
            </p>
          </CardContent>
        </Card>

        {/* PERSONAL DATA PRESENCE — Always shown */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-slate-700">
            Does this evidence contain personal data (names, emails, IDs)?
          </Label>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === true}
                onCheckedChange={() => update('personal_data_present', true)}
                id="has-personal-true"
              />
              <label htmlFor="has-personal-true" className="text-xs cursor-pointer">Yes</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === false}
                onCheckedChange={() => update('personal_data_present', false)}
                id="has-personal-false"
              />
              <label htmlFor="has-personal-false" className="text-xs cursor-pointer">No</label>
            </div>
          </div>
        </div>

        {/* GDPR LEGAL BASIS (conditional) — Required if personal_data_present=true */}
        {declaration.personal_data_present === true && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              GDPR Legal Basis 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={declaration.gdpr_legal_basis || ''} onValueChange={(v) => update('gdpr_legal_basis', v)}>
              <SelectTrigger className={`bg-white/50 ${fieldErrors.gdpr_legal_basis ? 'border-red-400' : ''}`}>
                <SelectValue placeholder="Select basis" />
              </SelectTrigger>
              <SelectContent>
                {GDPR_BASIS.map(b => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {declaration.gdpr_legal_basis && (
              <p className="text-xs text-slate-500 italic">
                {GDPR_BASIS.find(b => b.value === declaration.gdpr_legal_basis)?.help}
              </p>
            )}
            <FieldError field="gdpr_legal_basis" />
          </div>
        )}

        {/* RETENTION POLICY — Always shown, required */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Data Retention Duration 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.retention_policy || ''} onValueChange={(v) => update('retention_policy', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.retention_policy ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select retention period" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_POLICIES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="retention_policy" />
        </div>

        {/* CUSTOM RETENTION DAYS (conditional) — Required if retention_policy=CUSTOM */}
        {declaration.retention_policy === 'CUSTOM' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Custom Duration (days) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              max="3650"
              placeholder="1–3650"
              value={declaration.retention_custom_days || ''}
              onChange={(e) => update('retention_custom_days', e.target.value ? parseInt(e.target.value) : null)}
              className={`bg-white/50 ${fieldErrors.retention_custom_days ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500">1 day to ~10 years</p>
            <FieldError field="retention_custom_days" />
          </div>
        )}

        {/* EXPORT RESTRICTIONS — Optional */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Data Export Restrictions</Label>
          <Select value={declaration.export_restrictions || 'NONE'} onValueChange={(v) => update('export_restrictions', v)}>
            <SelectTrigger className="bg-white/50">
              <SelectValue placeholder="Select restriction" />
            </SelectTrigger>
            <SelectContent>
              {EXPORT_RESTRICTIONS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* DATA MINIMIZATION CONFIRMATION — Required checkbox */}
        <div className="flex items-start gap-2 p-3 rounded border border-slate-200 bg-slate-50/50">
          <Checkbox
            checked={declaration.data_minimization_confirmed || false}
            onCheckedChange={(v) => update('data_minimization_confirmed', v)}
            id="data-minimization"
          />
          <div className="flex-1">
            <label htmlFor="data-minimization" className="text-xs cursor-pointer font-medium text-slate-700">
              I confirm I am not uploading unnecessary personal data 
              <span className="text-red-500 ml-1">*</span>
            </label>
            <p className="text-xs text-slate-500 mt-1">Data must be essential to the declared intent and scope.</p>
          </div>
        </div>
        <FieldError field="data_minimization_confirmed" />
      </div>

      {/* GDPR & RETENTION SUMMARY — Read-only preview */}
      <Card className="bg-gradient-to-br from-slate-50/80 to-white/80 border-slate-200 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Lock className="w-3 h-3" /> Compliance Summary
          </h4>
          
          <div className="grid grid-cols-1 gap-3 text-xs">
            {declaration.personal_data_present && (
              <div>
                <p className="text-slate-500 font-medium">GDPR Legal Basis</p>
                <p className="text-slate-900 font-mono">{declaration.gdpr_legal_basis || '—'}</p>
              </div>
            )}

            <div>
              <p className="text-slate-500 font-medium">Retention Policy</p>
              <p className="text-slate-900 font-mono">
                {declaration.retention_policy === 'CUSTOM'
                  ? `${declaration.retention_custom_days} days`
                  : RETENTION_POLICIES.find(p => p.value === declaration.retention_policy)?.label || '—'}
              </p>
            </div>

            {retentionEndDate && (
              <div>
                <p className="text-slate-500 font-medium">Deletion Date (UTC)</p>
                <p className="text-slate-900 font-mono">{retentionEndDate}</p>
              </div>
            )}

            {declaration.export_restrictions && declaration.export_restrictions !== 'NONE' && (
              <div>
                <p className="text-slate-500 font-medium">Export Restrictions</p>
                <p className="text-slate-900 font-mono">{EXPORT_RESTRICTIONS.find(r => r.value === declaration.export_restrictions)?.label || '—'}</p>
              </div>
            )}

            <div>
              <p className="text-slate-500 font-medium">Data Minimization</p>
              <p className={`text-sm font-medium ${declaration.data_minimization_confirmed ? 'text-green-700' : 'text-red-700'}`}>
                {declaration.data_minimization_confirmed ? '✓ Confirmed' : '✗ Not confirmed'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}