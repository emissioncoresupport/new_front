import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function Step2ProductMasterData({ 
  formData, 
  setFormData, 
  errors = {},
  bindingData = null
}) {
  const data = formData.payload_data_json || {};
  const isBound = formData.binding_state === 'BOUND';
  const bindingIdentity = formData.binding_identity || {};

  const updateField = (field, value) => {
    // Claims only - never update identity fields when bound
    if (isBound && (field === 'sku_code' || field === 'product_name')) {
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
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Product Master Data</h3>
        <p className="text-xs text-slate-600">
          {isBound 
            ? '🔒 Identity locked to Step 1 binding - only claims are editable' 
            : '📝 No binding - all identifier claims editable'}
        </p>
      </div>

      {/* Binding Identity Section (Read-Only when BOUND) */}
      {isBound && bindingIdentity && (
        <div className="p-4 bg-gradient-to-br from-green-50/80 to-emerald-50/40 backdrop-blur-xl rounded-xl border border-green-200/60">
          <h4 className="text-xs font-semibold text-green-900 mb-3 uppercase tracking-wide">
            Binding Identity (Locked)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                SKU Code
                <Badge className="bg-green-100 text-green-800 text-xs">LOCKED</Badge>
              </Label>
              <div className="mt-1 px-3 py-2 bg-white/60 border border-green-200 rounded-lg text-sm text-slate-900 font-medium">
                {bindingIdentity.sku_code || 'N/A'}
              </div>
              <p className="text-xs text-green-700 mt-1">📌 Derived from Step 1 binding</p>
            </div>
            <div>
              <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                Product Name
                <Badge className="bg-green-100 text-green-800 text-xs">LOCKED</Badge>
              </Label>
              <div className="mt-1 px-3 py-2 bg-white/60 border border-green-200 rounded-lg text-sm text-slate-900 font-medium">
                {bindingIdentity.product_name || bindingIdentity.name || 'N/A'}
              </div>
              <p className="text-xs text-green-700 mt-1">📌 Derived from Step 1 binding</p>
            </div>
          </div>
        </div>
      )}

      {/* Identity Claims (Editable when NOT BOUND) */}
      {!isBound && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
            Identifier Claims
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 font-medium text-sm">
                Product Code / SKU {formData.binding_state === 'DEFERRED' && '*'}
              </Label>
              <Input
                value={String(data.product_code_claim || data.sku_code || '')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  payload_data_json: { ...prev.payload_data_json, product_code_claim: e.target.value }
                }))}
                placeholder="e.g., SKU-12345"
                className="border-slate-200 bg-white/50 backdrop-blur-sm"
              />
              {errors.product_code_claim && (
                <p className="text-xs text-red-500 mt-1">{String(errors.product_code_claim || '')}</p>
              )}
            </div>

            <div>
              <Label className="text-slate-700 font-medium text-sm">
                Product Name {formData.binding_state === 'DEFERRED' && '*'}
              </Label>
              <Input
                value={String(data.product_name_claim || data.product_name || '')}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  payload_data_json: { ...prev.payload_data_json, product_name_claim: e.target.value }
                }))}
                placeholder="e.g., Hydraulic Pump Model X"
                className="border-slate-200 bg-white/50 backdrop-blur-sm"
              />
              {errors.product_name_claim && (
                <p className="text-xs text-red-500 mt-1">{String(errors.product_name_claim || '')}</p>
              )}
            </div>
          </div>

          {formData.binding_state === 'DEFERRED' && (
            <div className="flex items-start gap-3 p-3 bg-amber-50/80 rounded-lg border border-amber-200">
              <Badge className="bg-amber-100 text-amber-800 text-xs">UNBOUND</Badge>
              <p className="text-xs text-amber-700">
                At least one identifier claim required for deferred reconciliation
              </p>
            </div>
          )}
        </div>
      )}

      {/* Claims Section (Always Editable) */}
      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-xs font-semibold text-slate-900 mb-3 uppercase tracking-wide">
          {isBound ? 'Claims (Editable)' : 'Additional Claims'}
        </h4>
        <p className="text-xs text-slate-600 mb-3">
          These fields represent declared claims. Confidence: DECLARED, Provenance: MANUAL_ENTRY
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 font-medium text-sm">HS Code</Label>
            <Input
              value={String(data.hs_code || '')}
              onChange={(e) => updateField('hs_code', e.target.value)}
              placeholder="e.g., 8413.70"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-medium text-sm">Category</Label>
            <Input
              value={String(data.category || '')}
              onChange={(e) => updateField('category', e.target.value)}
              placeholder="e.g., Industrial Equipment"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-slate-700 font-medium text-sm">Weight (kg)</Label>
            <Input
              type="number"
              step="0.001"
              value={String(data.weight_kg || '')}
              onChange={(e) => updateField('weight_kg', e.target.value)}
              placeholder="e.g., 15.5"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-medium text-sm">Unit of Measure</Label>
            <Input
              value={String(data.uom || '')}
              onChange={(e) => updateField('uom', e.target.value)}
              placeholder="e.g., EA, KG, M"
              className="border-slate-200 bg-white/50 backdrop-blur-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-slate-700 font-medium text-sm">Description</Label>
          <Textarea
            value={String(data.description || '')}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Product description, specifications, or notes"
            rows={3}
            className="border-slate-200 bg-white/50 backdrop-blur-sm resize-none"
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
          placeholder="I attest that this product data is accurate and complete..."
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