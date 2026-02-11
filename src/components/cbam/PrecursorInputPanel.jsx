import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Layers } from 'lucide-react';

/**
 * Precursor Input Panel
 * Per Art. 13-15 C(2025) 8151
 * Allows manual entry of precursor materials for complex goods
 */
export default function PrecursorInputPanel({ precursors = [], onChange, isRequired = false }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newPrecursor, setNewPrecursor] = useState({
    precursor_cn_code: '',
    precursor_name: '',
    quantity_consumed: '',
    emissions_intensity_factor: '',
    reporting_period_year: 2026,
    value_type: 'actual'
  });
  
  const handleAdd = () => {
    if (!newPrecursor.precursor_cn_code || !newPrecursor.quantity_consumed) {
      return;
    }
    
    const emissions_embedded = parseFloat(newPrecursor.quantity_consumed) * 
      parseFloat(newPrecursor.emissions_intensity_factor || 0);
    
    onChange([...precursors, { ...newPrecursor, emissions_embedded }]);
    setNewPrecursor({
      precursor_cn_code: '',
      precursor_name: '',
      quantity_consumed: '',
      emissions_intensity_factor: '',
      reporting_period_year: 2026,
      value_type: 'actual'
    });
    setShowAdd(false);
  };
  
  const handleRemove = (index) => {
    onChange(precursors.filter((_, i) => i !== index));
  };
  
  return (
    <div className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
           <Layers className="w-4 h-4 text-slate-600" />
           <h4 className="text-sm font-semibold">
             Precursor Materials
             {isRequired && <span className="text-red-600 ml-1">*</span>}
           </h4>
           <Badge variant="outline" className="text-xs">Art. 13-15</Badge>
           {isRequired && <Badge className="bg-red-600 text-white text-xs">Required</Badge>}
         </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setShowAdd(!showAdd)}
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Precursor
        </Button>
      </div>
      
      {showAdd && (
        <div className="grid grid-cols-5 gap-2 p-3 bg-white border border-slate-200 rounded-lg">
          <Input 
            placeholder="CN Code"
            value={newPrecursor.precursor_cn_code}
            onChange={(e) => setNewPrecursor({...newPrecursor, precursor_cn_code: e.target.value})}
            className="text-xs h-8"
          />
          <Input 
            placeholder="Name"
            value={newPrecursor.precursor_name}
            onChange={(e) => setNewPrecursor({...newPrecursor, precursor_name: e.target.value})}
            className="text-xs h-8"
          />
          <Input 
            type="number"
            step="0.001"
            placeholder="Qty (t)"
            value={newPrecursor.quantity_consumed}
            onChange={(e) => setNewPrecursor({...newPrecursor, quantity_consumed: e.target.value})}
            className="text-xs h-8"
          />
          <Input 
            type="number"
            step="0.01"
            placeholder="tCO2/t"
            value={newPrecursor.emissions_intensity_factor}
            onChange={(e) => setNewPrecursor({...newPrecursor, emissions_intensity_factor: e.target.value})}
            className="text-xs h-8"
          />
          <Button onClick={handleAdd} size="sm" className="h-8 text-xs bg-slate-900">
            Add
          </Button>
        </div>
      )}
      
      {precursors.length > 0 && (
        <div className="space-y-2">
          {precursors.map((precursor, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
              <div className="flex-1 grid grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500">CN:</span> <strong>{precursor.precursor_cn_code}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Qty:</span> <strong>{precursor.quantity_consumed}t</strong>
                </div>
                <div>
                  <span className="text-slate-500">Factor:</span> <strong>{precursor.emissions_intensity_factor || 0} tCO2/t</strong>
                </div>
                <div>
                  <span className="text-slate-500">Embedded:</span> <strong className="text-[#86b027]">
                    {precursor.emissions_embedded?.toFixed(3) || 0} tCO2e
                  </strong>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleRemove(idx)}
                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              Total Precursor Emissions: <strong className="text-slate-900">
                {precursors.reduce((sum, p) => sum + (p.emissions_embedded || 0), 0).toFixed(3)} tCO2e
              </strong>
            </p>
          </div>
        </div>
      )}
      
      {precursors.length === 0 && !showAdd && (
        <p className="text-xs text-slate-500 text-center py-2">
          No precursor materials added. Click "Add Precursor" for complex goods.
        </p>
      )}
    </div>
  );
}