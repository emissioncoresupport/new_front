import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function SupplierMasterForm({ formData, setFormData, errors = {}, isIdentityLocked = false }) {
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
           <Label className="text-slate-700 font-medium">Supplier Name *</Label>
           <Input
             value={((data.supplier_name || '').toString() || '')}
             onChange={(e) => updateField('supplier_name', e.target.value)}
             placeholder="e.g., Acme Manufacturing Ltd"
             disabled={isIdentityLocked}
             className={`border-slate-200 ${isIdentityLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white/50'} backdrop-blur-sm`}
           />
           {isIdentityLocked && (
             <p className="text-xs text-slate-500 mt-1">🔒 Identity locked to binding target</p>
           )}
           {errors.supplier_name && (
             <p className="text-xs text-red-500 mt-1">{((errors.supplier_name || '').toString() || '')}</p>
           )}
         </div>

         <div>
           <Label className="text-slate-700 font-medium">Supplier Code {isIdentityLocked && '(Locked)'}</Label>
           <Input
             value={((data.supplier_code || '').toString() || '')}
             onChange={(e) => updateField('supplier_code', e.target.value)}
             placeholder="e.g., SUPP-001"
             disabled={isIdentityLocked}
             className={`border-slate-200 ${isIdentityLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white/50'} backdrop-blur-sm`}
           />
           {isIdentityLocked && (
             <p className="text-xs text-slate-500 mt-1">🔒 Identity locked</p>
           )}
         </div>
         </div>

        <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-700 font-medium">VAT ID / Tax Number</Label>
          <Input
            value={((data.vat_id || '').toString() || '')}
            onChange={(e) => updateField('vat_id', e.target.value)}
            placeholder="e.g., GB123456789"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium">Country</Label>
          <Input
            value={((data.country || '').toString() || '')}
            onChange={(e) => updateField('country', e.target.value)}
            placeholder="e.g., Germany, China"
            className="border-slate-200 bg-white/50 backdrop-blur-sm"
          />
        </div>
        </div>

        <div>
        <Label className="text-slate-700 font-medium">Address</Label>
        <Textarea
          value={((data.address || '').toString() || '')}
          onChange={(e) => updateField('address', e.target.value)}
          placeholder="Full address including street, city, postal code"
          rows={2}
          className="border-slate-200 bg-white/50 backdrop-blur-sm resize-none"
        />
        </div>

        <div>
        <Label className="text-slate-700 font-medium">Contact Email</Label>
        <Input
          type="email"
          value={((data.contact_email || '').toString() || '')}
          onChange={(e) => updateField('contact_email', e.target.value)}
          placeholder="e.g., procurement@supplier.com"
          className="border-slate-200 bg-white/50 backdrop-blur-sm"
        />
        </div>
    </div>
  );
}