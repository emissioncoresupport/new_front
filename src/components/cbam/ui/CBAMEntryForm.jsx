/**
 * CBAM Entry Form - UI Component ONLY
 * Domain: Entry metadata input
 * Responsibilities: Render form, trigger service
 * Boundaries: NO business logic, NO calculations
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import CBAMEntryService from '../services/lifecycle/CBAMEntryService';
import { toast } from 'sonner';

export default function CBAMEntryForm({ initialData = null, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(initialData || {
    import_id: '',
    import_date: '',
    cn_code: '',
    product_name: '',
    quantity: '',
    country_of_origin: '',
    calculation_method: 'default_values',
    eori_number: '',
    reporting_period_year: 2026
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Trigger service - no business logic here
      const result = await CBAMEntryService.createEntry(formData);
      
      if (result.success) {
        toast.success('Entry created - calculation in progress');
        onSuccess?.(result.entry);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to create entry');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-600">Import ID</Label>
          <Input
            value={formData.import_id}
            onChange={(e) => setFormData({...formData, import_id: e.target.value})}
            className="mt-1"
            placeholder="Auto-generated if empty"
          />
        </div>
        
        <div>
          <Label className="text-xs text-slate-600">Import Date *</Label>
          <Input
            type="date"
            value={formData.import_date}
            onChange={(e) => setFormData({...formData, import_date: e.target.value})}
            className="mt-1"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-600">CN Code (8 digits) *</Label>
          <Input
            value={formData.cn_code}
            onChange={(e) => setFormData({...formData, cn_code: e.target.value})}
            className="mt-1 font-mono"
            placeholder="72081000"
            maxLength={8}
            required
          />
        </div>
        
        <div>
          <Label className="text-xs text-slate-600">Quantity (tonnes) *</Label>
          <Input
            type="number"
            step="0.001"
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            className="mt-1"
            required
          />
        </div>
      </div>
      
      <div>
        <Label className="text-xs text-slate-600">Product Name *</Label>
        <Input
          value={formData.product_name}
          onChange={(e) => setFormData({...formData, product_name: e.target.value})}
          className="mt-1"
          placeholder="Hot-rolled steel coil"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-600">Country of Origin *</Label>
          <Input
            value={formData.country_of_origin}
            onChange={(e) => setFormData({...formData, country_of_origin: e.target.value})}
            className="mt-1"
            placeholder="China"
            required
          />
        </div>
        
        <div>
          <Label className="text-xs text-slate-600">Calculation Method</Label>
          <Select 
            value={formData.calculation_method} 
            onValueChange={(val) => setFormData({...formData, calculation_method: val})}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default_values">Default Values (EU Benchmarks)</SelectItem>
              <SelectItem value="actual_values">Actual Values (Operator Data)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label className="text-xs text-slate-600">EORI Number</Label>
        <Input
          value={formData.eori_number}
          onChange={(e) => setFormData({...formData, eori_number: e.target.value})}
          className="mt-1"
          placeholder="EU123456789"
        />
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          className="bg-slate-900 hover:bg-slate-800"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Create Entry</>
          )}
        </Button>
      </div>
    </form>
  );
}