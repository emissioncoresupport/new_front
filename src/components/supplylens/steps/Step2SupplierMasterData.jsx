import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export default function Step2SupplierMasterData({ 
  formData, 
  setFormData, 
  errors = {},
  bindingData = null,
  adapter = null
}) {
  const [bindingError, setBindingError] = useState(null);
  const data = formData.payload_data_json || {};
  const isBound = formData.binding_state === 'BOUND';

  // CONTRACT 1: Identity is ALWAYS read-only when BOUND, no toggle
  const bindingIdentity = formData.binding_identity || {};

  const updateField = (field, value) => {
    // Claims only - never update identity fields
    if (field === 'supplier_name' || field === 'country_code') {
      return;
    }

    setFormData(prev => ({
      ...prev,
      payload_data_json: { ...prev.payload_data_json, [field]: value }
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-br from-slate-50/80 to-white/50 backdrop-blur-xl rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Supplier Master Data</h3>
        <p className="text-xs text-slate-600">
          {isBound 
            ? '🔒 Identity locked to Step 1 binding - only claims are editable' 
            : '📝 No binding - all fields editable'}
        </p>
      </div>

      {/* Binding Identity Section (Read-Only when BOUND) */}
      {isBound && (
        <div className="p-4 bg-gradient-to-br from-green-50/80 to-emerald-50/40 backdrop-blur-xl rounded-xl border border-green-200/60">
          <h4 className="text-xs font-semibold text-green-900 mb-3 uppercase tracking-wide">
            Binding Identity (Locked)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                Supplier Name 
                <Badge className="bg-green-100 text-green-800 text-xs">LOCKED</Badge>
              </Label>
              <div className="mt-1 px-3 py-2 bg-white/60 border border-green-200 rounded-lg text-sm text-slate-900 font-medium">
                {bindingIdentity.name || 'N/A'}
              </div>
              <p className="text-xs text-green-700 mt-1">📌 Derived from Step 1 binding</p>
            </div>
            <div>
              <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                Country Code
                <Badge className="bg-green-100 text-green-800 text-xs">LOCKED</Badge>
              </Label>
              <div className="mt-1 px-3 py-2 bg-white/60 border border-green-200 rounded-lg text-sm text-slate-900 font-medium">
                {bindingIdentity.country_code || 'N/A'}
              </div>
              <p className="text-xs text-green-700 mt-1">📌 Derived from Step 1 binding</p>
            </div>
          </div>
        </div>
      )}

      {/* Identity Fields (Editable when NOT BOUND) */}
      {!isBound && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 font-medium text-sm">Supplier Name *</Label>
            <Input
              value={String(data.supplier_name || '')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                payload_data_json: { ...prev.payload_data_json, supplier_name: e.target.value }
              }))}
              placeholder="e.g., Acme Manufacturing Ltd"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
            {errors.supplier_name && (
              <p className="text-xs text-red-500 mt-1">{String(errors.supplier_name || '')}</p>
            )}
          </div>

          <div>
            <Label className="text-slate-700 font-medium text-sm">Country Code *</Label>
            <Input
              value={String(data.country_code || '')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                payload_data_json: { ...prev.payload_data_json, country_code: e.target.value }
              }))}
              placeholder="e.g., NL"
              maxLength={2}
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
            {errors.country_code && (
              <p className="text-xs text-red-500 mt-1">{String(errors.country_code || '')}</p>
            )}
          </div>
        </div>
      )}

      {/* Claims Section (Always Editable) */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-xs font-semibold text-slate-900 mb-3 uppercase tracking-wide">
          Claims (Editable)
        </h4>
        <p className="text-xs text-slate-600 mb-3">
          These fields represent declared claims. Confidence: DECLARED, Provenance: MANUAL_ENTRY
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 font-medium text-sm">Supplier Code</Label>
            <Input
              value={String(data.supplier_code || '')}
              onChange={(e) => updateField('supplier_code', e.target.value)}
              placeholder="e.g., SUPP-001"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-medium text-sm">VAT ID / Tax Number</Label>
            <Input
              value={String(data.vat_id || '')}
              onChange={(e) => updateField('vat_id', e.target.value)}
              placeholder="e.g., NL123456789B01"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-slate-700 font-medium text-sm">Address</Label>
          <Textarea
            value={String(data.address || '')}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Full address including street, city, postal code"
            rows={2}
            className="border-slate-200 bg-white/50 backdrop-blur-sm resize-none"
          />
        </div>

        <div className="mt-4">
          <Label className="text-slate-700 font-medium text-sm">Contact Email</Label>
          <Input
            type="email"
            value={String(data.contact_email || '')}
            onChange={(e) => updateField('contact_email', e.target.value)}
            placeholder="e.g., procurement@supplier.com"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Attestation Section */}
      <div className="border-t border-slate-200 pt-4">
        <Label className="text-slate-900 font-semibold text-sm block mb-2">Attestation Notes *</Label>
        <p className="text-xs text-slate-600 mb-3">
          Confirm accuracy of this data. Minimum 20 characters required.
        </p>
        <Textarea
          value={formData.attestation_notes || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, attestation_notes: e.target.value }))}
          placeholder="I attest that this supplier data is accurate and complete..."
          rows={3}
          minLength={20}
          className="border-slate-200 bg-white/50 backdrop-blur-sm resize-none"
        />
        {formData.attestation_notes && formData.attestation_notes.length < 20 && (
          <p className="text-xs text-red-600 mt-2">
            Attestation must be at least 20 characters ({formData.attestation_notes.length}/20)
          </p>
        )}
        {errors.attestation_notes && (
          <p className="text-xs text-red-500 mt-2">{String(errors.attestation_notes || '')}</p>
        )}
      </div>
    </div>
  );
}