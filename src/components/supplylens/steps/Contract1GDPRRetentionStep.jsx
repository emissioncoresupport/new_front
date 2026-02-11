import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, Info, Shield } from 'lucide-react';

// GDPR Legal Basis enums
const LEGAL_BASIS = [
  { value: 'CONTRACT', label: 'Contract Fulfillment', description: 'Data processing is necessary for contract performance' },
  { value: 'LEGAL_OBLIGATION', label: 'Legal Obligation', description: 'Required by EU/national law' },
  { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate Interests', description: 'Necessary for business purposes (with balance test)' },
  { value: 'CONSENT', label: 'Consent', description: 'Explicit consent obtained from data subject' },
  { value: 'VITAL_INTERESTS', label: 'Vital Interests', description: 'Protection of vital interests (rare)' },
  { value: 'PUBLIC_TASK', label: 'Public Task', description: 'Performance of public interest task' }
];

// Retention Policy presets (in days)
const RETENTION_PRESETS = [
  { value: '6_MONTHS', label: '6 Months', days: 180 },
  { value: '12_MONTHS', label: '12 Months', days: 365 },
  { value: '3_YEARS', label: '3 Years', days: 1095 },
  { value: '6_YEARS', label: '6 Years', days: 2190 },
  { value: '10_YEARS', label: '10 Years', days: 3650 },
  { value: 'CUSTOM', label: 'Custom Duration', days: null }
];

// Export Restrictions
const EXPORT_RESTRICTIONS = [
  { value: 'NONE', label: 'No Restrictions' },
  { value: 'EU_ONLY', label: 'EU Territory Only' },
  { value: 'CUSTOMER_POLICY', label: 'Customer Policy (specify separately)' }
];

export default function Contract1GDPRRetentionStep({ declaration, setDeclaration, onValidation }) {
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (field, value) => {
    setDeclaration(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  // Calculate retention end date based on snapshot_date_utc and retention policy
  const retentionEndDate = useMemo(() => {
    if (!declaration.snapshot_date_utc || !declaration.retention_policy) return null;

    const snapshotDate = new Date(declaration.snapshot_date_utc);
    let retentionDays = 0;

    if (declaration.retention_policy === 'CUSTOM') {
      retentionDays = declaration.retention_custom_days || 0;
    } else {
      const preset = RETENTION_PRESETS.find(p => p.value === declaration.retention_policy);
      retentionDays = preset?.days || 0;
    }

    const endDate = new Date(snapshotDate);
    endDate.setDate(endDate.getDate() + retentionDays);
    return endDate.toISOString();
  }, [declaration.snapshot_date_utc, declaration.retention_policy, declaration.retention_custom_days]);

  const validateSection = () => {
    const errors = {};

    // retention_policy is always required
    if (!declaration.retention_policy) {
      errors.retention_policy = 'Required';
    }

    // If CUSTOM retention, require custom_days
    if (declaration.retention_policy === 'CUSTOM') {
      if (!declaration.retention_custom_days) {
        errors.retention_custom_days = 'Required for custom retention';
      } else if (declaration.retention_custom_days < 1 || declaration.retention_custom_days > 3650) {
        errors.retention_custom_days = 'Must be between 1 and 3650 days';
      }
    }

    // If personal_data_present=true, require legal basis
    if (declaration.personal_data_present && !declaration.gdpr_legal_basis) {
      errors.gdpr_legal_basis = 'Required when personal data is present';
    }

    // data_minimization_confirmed must be checked
    if (!declaration.data_minimization_confirmed) {
      errors.data_minimization_confirmed = 'You must confirm data minimization';
    }

    setFieldErrors(errors);
    if (onValidation) onValidation(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const FieldError = ({ field }) => (
    fieldErrors[field] ? (
      <div className="text-xs text-red-600 flex items-start gap-1 mt-2 bg-red-50/50 p-2 rounded border border-red-200">
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>{fieldErrors[field]}</span>
      </div>
    ) : null
  );

  const selectedBasis = LEGAL_BASIS.find(b => b.value === declaration.gdpr_legal_basis);
  const selectedRetention = RETENTION_PRESETS.find(p => p.value === declaration.retention_policy);

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Step 4: GDPR & Data Retention</h3>

        <Card className="bg-purple-50/40 border-purple-200">
          <CardContent className="p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700">
              Declare your legal basis for processing personal data and set retention period. No data is retained longer than declared.
            </p>
          </CardContent>
        </Card>

        {/* PERSONAL DATA PRESENCE — Always shown */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-slate-700">
            Does this evidence contain personal data (PII, employee info, etc.)? 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === true}
                onCheckedChange={() => update('personal_data_present', true)}
                id="has-personal-data"
              />
              <label htmlFor="has-personal-data" className="text-xs cursor-pointer">Yes, contains personal data</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={declaration.personal_data_present === false}
                onCheckedChange={() => update('personal_data_present', false)}
                id="no-personal-data"
              />
              <label htmlFor="no-personal-data" className="text-xs cursor-pointer">No personal data</label>
            </div>
          </div>
        </div>

        {/* GDPR LEGAL BASIS (conditional) — Required if personal_data_present=true */}
        {declaration.personal_data_present && (
          <div className="space-y-3 pl-3 border-l-2 border-purple-300">
            <Label className="text-xs font-medium text-slate-700">
              GDPR Legal Basis 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select value={declaration.gdpr_legal_basis} onValueChange={(v) => update('gdpr_legal_basis', v)}>
              <SelectTrigger className={`bg-white/50 ${fieldErrors.gdpr_legal_basis ? 'border-red-400' : ''}`}>
                <SelectValue placeholder="Select legal basis" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_BASIS.map(b => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBasis && (
              <p className="text-xs text-slate-500">{selectedBasis.description}</p>
            )}
            <FieldError field="gdpr_legal_basis" />
          </div>
        )}

        {/* RETENTION POLICY — Always required */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">
            Data Retention Period 
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={declaration.retention_policy} onValueChange={(v) => update('retention_policy', v)}>
            <SelectTrigger className={`bg-white/50 ${fieldErrors.retention_policy ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Select retention period" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_PRESETS.map(p => (
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
              Custom Retention Duration (days) 
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              placeholder="365"
              min="1"
              max="3650"
              value={declaration.retention_custom_days || ''}
              onChange={(e) => update('retention_custom_days', e.target.value ? parseInt(e.target.value) : null)}
              className={`bg-white/50 ${fieldErrors.retention_custom_days ? 'border-red-400' : ''}`}
            />
            <p className="text-xs text-slate-500">Between 1 and 3650 days (10 years)</p>
            <FieldError field="retention_custom_days" />
          </div>
        )}

        {/* EXPORT RESTRICTIONS (optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Export Restrictions (optional)</Label>
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
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={declaration.data_minimization_confirmed || false}
                onCheckedChange={(v) => update('data_minimization_confirmed', v)}
                id="data-minimization"
                className={fieldErrors.data_minimization_confirmed ? 'border-red-400' : ''}
              />
              <div className="flex-1">
                <label htmlFor="data-minimization" className="text-xs font-medium text-slate-900 cursor-pointer block">
                  I confirm I am not uploading unnecessary personal data
                </label>
                <p className="text-xs text-slate-600 mt-1">
                  You declare that all personal data in this upload is necessary for the stated purpose and is not excessive.
                </p>
              </div>
            </div>
            <FieldError field="data_minimization_confirmed" />
          </CardContent>
        </Card>
      </div>

      {/* GDPR & RETENTION SUMMARY — Read-only preview */}
      <Card className="bg-gradient-to-br from-slate-50/80 to-white/80 border-slate-200 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">GDPR & Retention Summary</h4>
          
          <div className="space-y-2">
            {declaration.personal_data_present && (
              <div>
                <p className="text-slate-500 font-medium text-xs">Personal Data</p>
                <p className="text-slate-900 font-mono text-xs">Yes</p>
                {selectedBasis && (
                  <p className="text-slate-600 text-xs mt-1">{selectedBasis.label}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-slate-500 font-medium text-xs">Retention Period</p>
              {selectedRetention ? (
                <div>
                  <p className="text-slate-900 font-mono text-xs">{selectedRetention.label}</p>
                  {retentionEndDate && (
                    <p className="text-slate-600 text-xs mt-1">
                      Expires: {new Date(retentionEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-slate-900 font-mono text-xs">—</p>
              )}
            </div>

            {declaration.export_restrictions && declaration.export_restrictions !== 'NONE' && (
              <div>
                <p className="text-slate-500 font-medium text-xs">Export Restrictions</p>
                <p className="text-slate-900 font-mono text-xs">
                  {EXPORT_RESTRICTIONS.find(r => r.value === declaration.export_restrictions)?.label}
                </p>
              </div>
            )}

            <div>
              <p className="text-slate-500 font-medium text-xs">Data Minimization</p>
              <p className={`text-xs font-mono ${declaration.data_minimization_confirmed ? 'text-green-700' : 'text-red-700'}`}>
                {declaration.data_minimization_confirmed ? '✓ Confirmed' : '✗ Not confirmed'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}