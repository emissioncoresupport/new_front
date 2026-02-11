import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ProductMasterForm({ formData, setFormData, errors = {}, isIdentityLocked = false }) {
  const data = formData.payload_data_json || {};
  
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      payload_data_json: { ...data, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
         <div>
           <Label className="text-slate-700 font-medium">Product Name * {isIdentityLocked && '(Locked)'}</Label>
           <Input
             value={data.product_name || ''}
             onChange={(e) => updateField('product_name', e.target.value)}
             placeholder="e.g., Widget Pro 2000"
             disabled={isIdentityLocked}
             className={`border-slate-200 ${isIdentityLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white/50'} backdrop-blur-sm`}
           />
           {isIdentityLocked && (
             <p className="text-xs text-slate-500 mt-1">🔒 Identity locked to binding target</p>
           )}
           {errors.product_name && (
             <p className="text-xs text-red-500 mt-1">{errors.product_name}</p>
           )}
         </div>

         <div>
           <Label className="text-slate-700 font-medium">SKU / Product Code * {isIdentityLocked && '(Locked)'}</Label>
           <Input
             value={data.sku || ''}
             onChange={(e) => updateField('sku', e.target.value)}
             placeholder="e.g., WP2000-BLK"
             disabled={isIdentityLocked}
             className={`border-slate-200 ${isIdentityLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white/50'} backdrop-blur-sm`}
           />
           {isIdentityLocked && (
             <p className="text-xs text-slate-500 mt-1">🔒 Identity locked</p>
           )}
           {errors.sku && (
             <p className="text-xs text-red-500 mt-1">{errors.sku}</p>
           )}
         </div>
       </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-slate-700 font-medium">Unit of Measure</Label>
          <Input
            value={data.unit_of_measure || ''}
            onChange={(e) => updateField('unit_of_measure', e.target.value)}
            placeholder="e.g., kg, pcs, m"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Weight (kg)</Label>
          <Input
            type="number"
            step="0.001"
            value={data.weight_kg || ''}
            onChange={(e) => updateField('weight_kg', parseFloat(e.target.value) || '')}
            placeholder="e.g., 2.5"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">HS Code</Label>
          <Input
            value={data.hs_code || ''}
            onChange={(e) => updateField('hs_code', e.target.value)}
            placeholder="e.g., 8471.30"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>
      </div>

      <div>
        <Label className="text-slate-700 font-medium">Category</Label>
        <Input
          value={data.category || ''}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="e.g., Electronics, Industrial Parts"
          className="border-slate-200 bg-white/50 backdrop-blur-sm"
        />
      </div>

      <div>
        <Label className="text-slate-700 font-medium">Description</Label>
        <Textarea
          value={data.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Product description, specifications, use case..."
          rows={3}
          className="border-slate-200 bg-white/50 backdrop-blur-sm resize-none"
        />
      </div>
    </div>
  );
}