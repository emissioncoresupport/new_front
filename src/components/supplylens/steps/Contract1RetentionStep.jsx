import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, Shield, Info } from 'lucide-react';

// Retention policies with duration in days
const RETENTION_POLICIES = [
  { value: '6_MONTHS', label: '6 Months', days: 180 },
  { value: '12_MONTHS', label: '1 Year', days: 365 },
  { value: '3_YEARS', label: '3 Years', days: 1095 },
  { value: '6_YEARS', label: '6 Years', days: 2190 },
  { value: '10_YEARS', label: '10 Years', days: 3650 },
  { value: 'CUSTOM', label: 'Custom Duration', days: null }
];

const GDPR_BASIS = [
  { value: 'CONTRACT', label: 'Contract - Necessary to perform contract or pre-contractual obligations' },
  { value: 'LEGAL_OBLIGATION', label: 'Legal Obligation - Required by law' },
  { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate Interests - Our legitimate interests, unless overridden by yours' },
  { value: 'CONSENT', label: 'Consent - Explicit consent from data subject' },
  { value: 'VITAL_INTERESTS', label: 'Vital Interests - Protect vital interests of data subject' },
  { value: 'PUBLIC_TASK', label: 'Public Task - Performance of task in the public interest' }
];

const EXPORT_RESTRICTIONS = [
  { value: 'NONE', label: 'No restrictions' },
  { value: 'EU_ONLY', label: 'EU/EEA only (no third-country transfers)' },
  { value: 'CUSTOMER_POLICY', label: 'Follow customer data residency policy' }
];

export default function Contract1RetentionStep({ declaration, setDeclaration, onValidation }) {
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (field, value) => {
    setDeclaration(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  // Compute retention end date
  const retentionEndDate = useMemo(() => {
    if (!declaration.snapshot_date_utc) return null;
    
    const snapshot = new Date(declaration.snapshot_date_utc);
    let days = 0;

    if (declaration.retention_policy === 'CUSTOM' && declaration.retention_custom_days) {
      days = parseInt(declaration.retention_custom_days);
    } else {
      const policy = RETENTION_POLICIES.find(p => p.value === declaration.retention_policy);
      days = policy?.days || 0;
    }

    const endDate = new Date(snapshot);
    endDate.setDate(endDate.getDate() + days);
    return endDate.toISOString();
  }, [declaration.snapshot_date_utc, declaration.retention_policy, declaration.retention_custom_days]);

  const validateSection = () => {
    const errors = {};

    // personal_data_present is required (boolean, so check if undefined)
    if (declaration.personal_data_present === undefined || declaration.personal_data_present === null) {
      errors.personal_data_present = 'Required';
    }

    // If personal_data_present=true, gdpr_legal_basis is required
    if (declaration.personal_data_present === true && !declaration.gdpr_legal_basis) {
      errors.gdpr_legal_basis = 'Required when personal data is present';
    }

    // retention_policy is always required
    if (!declaration.retention_policy) {
      errors.retention_policy = 'Required';
    }

    // If retention_policy=CUSTOM, retention_custom_days is required and must be 1-3650
    if (declaration.retention_policy === 'CUSTOM') {
      if (!declaration.retention_custom_days) {
        errors.retention_custom_days = 'Required for custom retention';
      } else {
        const days = parseInt(declaration.retention_custom_days);
        if (isNaN(days) || days < 1 || days > 3650) {
          errors.retention_custom_days = 'Must be between 1 and 3650 days';
        }
      }
    }

    // data_minimization_confirmed must be checked
    if (!declaration.data_minimization_confirmed) {
      errors.data_minimization_confirmed = 'Required to proceed';
    }

    setFieldErrors(errors);
    if (onValidation) onValidation(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const FieldError = ({ field }) => (
    fieldErrors[field] ? (
      <div className="text-xs text-red-600 flex items-start gap-1 mt-1 bg-red-50/50 p-2 rounded border border-red-200">
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>{fieldErrors[field]}</span>
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Step 4: GDPR & Retention</h3>

        <Card className="bg-purple-50/40 border-purple-200">
          <CardContent className="p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700">
              Declare legal basis for personal data and set retention policy. Retention end date is auto-computed and enforced.
            </p>
          </CardContent>
        </Card>

        {/* PERSONAL DATA PRESENT — Required boolean */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-slate-700">
            This evidence contains personal data 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === true}
                onCheckedChange={() => update('personal_data_present', true)}
                id="has-personal-data"
              />
              <label htmlFor="has-personal-data" className="text-xs cursor-pointer">Yes, contains PII/sensitive data</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === false}
                onCheckedChange={() => update('personal_data_present', false)}
                id="no-personal-data"
              />
              <label htmlFor="no-personal-data" className="text-xs cursor-pointer">No, anonymized/aggregated only</label>
            </div>
          </div>
          <FieldError field="personal_data_present" />
        </div>

        {/* GDPR LEGAL BASIS (conditional) — Required if personal_data_present=true */}
        {declaration.personal_data_present === true && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Legal Basis (GDPR Article 6) 
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
            <FieldError field="gdpr_legal_basis" />
          </div>
        )}

        {/* RETENTION POLICY — Always required */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Data Retention Policy 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.retention_policy || ''} onValueChange={(v) => update('retention_policy', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.retention_policy ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select retention" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_POLICIES.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError field="retention_policy" />
        </div>

        {/* CUSTOM RETENTION DURATION (conditional) — Required if retention_policy=CUSTOM */}
        {declaration.retention_policy === 'CUSTOM' && (
          <div className="space-y-2 pl-3 border-l-2 border-slate-300">
            <Label className="text-xs font-medium text-slate-700">
              Duration (1–3650 days) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              placeholder="730"
              min="1"
              max="3650"
              value={declaration.retention_custom_days || ''}
              onChange={(e) => update('retention_custom_days', e.target.value)}
              className={`bg-white/50 ${fieldErrors.retention_custom_days ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500">Represents days from snapshot date</p>
            <FieldError field="retention_custom_days" />
          </div>
        )}

        {/* RETENTION END DATE — Auto-computed, read-only preview */}
        {retentionEndDate && declaration.retention_policy && (
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-3">
              <p className="text-xs text-slate-600 font-medium">Computed Deletion Date</p>
              <p className="text-xs font-mono text-slate-900 mt-1">
                {new Date(retentionEndDate).toISOString().split('T')[0]}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Data will be automatically purged on this date unless legal hold is applied.
              </p>
            </CardContent>
          </Card>
        )}

        {/* EXPORT RESTRICTIONS — Optional */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Data Export Restrictions (optional)</Label>
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
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-start gap-2">
            <Checkbox
              checked={declaration.data_minimization_confirmed || false}
              onCheckedChange={() => update('data_minimization_confirmed', !declaration.data_minimization_confirmed)}
              id="data-minimization"
            />
            <label 
              htmlFor="data-minimization" 
              className={`text-xs cursor-pointer ${
                fieldErrors.data_minimization_confirmed ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              I confirm I am not uploading unnecessary personal data and that this submission complies with GDPR data minimization principles
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>
          <FieldError field="data_minimization_confirmed" />
        </div>
      </div>

      {/* RETENTION SUMMARY — Read-only preview */}
      <Card className="bg-gradient-to-br from-slate-50/80 to-white/80 border-slate-200 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Retention Summary</h4>
          
          <div className="grid grid-cols-1 gap-3 text-xs">
            {declaration.personal_data_present && (
              <div>
                <p className="text-slate-500 font-medium">Legal Basis</p>
                <p className="text-slate-900 font-mono">
                  {GDPR_BASIS.find(b => b.value === declaration.gdpr_legal_basis)?.label || '—'}
                </p>
              </div>
            )}

            <div>
              <p className="text-slate-500 font-medium">Retention Period</p>
              <p className="text-slate-900 font-mono">
                {declaration.retention_policy === 'CUSTOM'
                  ? `${declaration.retention_custom_days || '—'} days`
                  : RETENTION_POLICIES.find(p => p.value === declaration.retention_policy)?.label || '—'}
              </p>
            </div>

            {retentionEndDate && (
              <div>
                <p className="text-slate-500 font-medium">Deletion Date</p>
                <p className="text-slate-900 font-mono">{new Date(retentionEndDate).toISOString().split('T')[0]}</p>
              </div>
            )}

            {declaration.export_restrictions && declaration.export_restrictions !== 'NONE' && (
              <div>
                <p className="text-slate-500 font-medium">Export Restriction</p>
                <p className="text-slate-900 font-mono">
                  {EXPORT_RESTRICTIONS.find(r => r.value === declaration.export_restrictions)?.label || '—'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}