import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

const CONSUMERS = [
  { value: 'CBAM', label: 'CBAM (Carbon Border Adjustment Mechanism)' },
  { value: 'CSRD', label: 'CSRD (Corporate Sustainability Reporting)' },
  { value: 'DPP', label: 'DPP (Digital Product Passport)' },
  { value: 'PCF', label: 'PCF (Product Carbon Footprint)' },
  { value: 'EUDR', label: 'EUDR (EU Deforestation Regulation)' },
  { value: 'LOGISTICS', label: 'Logistics & Emissions' },
  { value: 'PPWR', label: 'PPWR (Packaging & Packaging Waste)' },
  { value: 'PFAS', label: 'PFAS (Per- and Polyfluoroalkyl Substances)' },
  { value: 'EUDAMED', label: 'EUDAMED (Medical Device Registry)' },
  { value: 'CSDDD', label: 'CSDDD (Corporate Sustainability Due Diligence)' },
  { value: 'INTERNAL_ONLY', label: 'Internal Use Only' }
];

const DATASET_CONSUMER_MAP = {
  'SUPPLIER_MASTER': ['CBAM', 'CSRD', 'EUDR', 'PFAS', 'CSDDD', 'EUDAMED'],
  'PRODUCT_MASTER': ['DPP', 'PCF', 'CSRD', 'PPWR', 'PFAS'],
  'BOM': ['PCF', 'DPP', 'PPWR', 'PFAS'],
  'TRANSACTION_LINES': ['CBAM', 'PCF', 'CSRD'],
  'LOGISTICS_ACTIVITY': ['LOGISTICS', 'CSRD', 'PCF'],
  'LCA_INPUTS': ['PCF', 'DPP', 'CSRD'],
  'CBAM_SUPPORT': ['CBAM'],
  'CSRD_SUPPORT': ['CSRD'],
  'EUDR_SUPPORT': ['EUDR'],
  'PPWR_SUPPORT': ['PPWR'],
  'PFAS_SUPPORT': ['PFAS']
};

export default function Contract1ConsumersStep({ declaration, setDeclaration }) {
  const compatibleConsumers = DATASET_CONSUMER_MAP[declaration.dataset_type] || [];
  
  const toggleConsumer = (consumer) => {
    const current = declaration.intended_consumers || [];
    
    // INTERNAL_ONLY is exclusive
    if (consumer === 'INTERNAL_ONLY') {
      if (current.includes('INTERNAL_ONLY')) {
        setDeclaration({
          ...declaration,
          intended_consumers: []
        });
      } else {
        setDeclaration({
          ...declaration,
          intended_consumers: ['INTERNAL_ONLY']
        });
      }
      return;
    }

    // Remove INTERNAL_ONLY if selecting other consumers
    let updated = current.filter(c => c !== 'INTERNAL_ONLY');

    if (updated.includes(consumer)) {
      updated = updated.filter(c => c !== consumer);
    } else {
      updated.push(consumer);
    }

    setDeclaration({
      ...declaration,
      intended_consumers: updated
    });
  };

  const incompatibleSelected = declaration.intended_consumers?.some(
    c => c !== 'INTERNAL_ONLY' && !compatibleConsumers.includes(c) && declaration.dataset_type
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-900 mb-3 block">
          Which modules will use this evidence? (Select at least 1) *
        </label>

        {incompatibleSelected && (
          <Card className="bg-amber-50/50 border-amber-200 mb-4">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Dataset mismatch</p>
                <p className="text-amber-800 text-xs mt-1">
                  {declaration.dataset_type} is not compatible with some selected consumers
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-2">
          {CONSUMERS.map((consumer) => {
            const isCompatible = !declaration.dataset_type || 
              compatibleConsumers.includes(consumer.value) ||
              consumer.value === 'INTERNAL_ONLY';
            
            const isSelected = declaration.intended_consumers?.includes(consumer.value);
            
            return (
              <label
                key={consumer.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-green-50/50 border-green-300'
                    : isCompatible
                    ? 'bg-white border-slate-200 hover:bg-slate-50'
                    : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleConsumer(consumer.value)}
                  disabled={!isCompatible}
                  className="cursor-pointer"
                />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isSelected ? 'text-green-900' : 'text-slate-900'}`}>
                    {consumer.label}
                  </p>
                  {!isCompatible && (
                    <p className="text-xs text-slate-600">Not compatible with {declaration.dataset_type}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {declaration.intended_consumers?.length > 0 && (
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-900">Selected Consumers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {declaration.intended_consumers.map((consumer) => {
              const label = CONSUMERS.find(c => c.value === consumer)?.label;
              return (
                <div key={consumer} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-green-900">{label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}