import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Layers, ArrowRight, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PrecursorBreakdownPanel({ entry }) {
  if (!entry.precursors_used || entry.precursors_used.length === 0) {
    return null;
  }

  const totalPrecursorEmissions = entry.precursor_emissions_embedded || 
    entry.precursors_used.reduce((sum, p) => sum + (p.emissions_embedded || 0), 0);

  return (
    <div className="mt-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          <h4 className="text-xs font-medium text-slate-900">Precursor Emissions Breakdown</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {totalPrecursorEmissions.toFixed(2)} tCO2e
        </Badge>
      </div>
      
      <Alert className="bg-blue-50/30 border-blue-200/40 mb-2">
        <Info className="h-3 w-3 text-blue-600" />
        <AlertDescription className="text-xs text-blue-900">
          Complex good per C(2025) 8151 Art. 13-15 - includes embedded emissions from precursors
        </AlertDescription>
      </Alert>

      <div className="space-y-1.5">
        {entry.precursors_used.map((precursor, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between bg-white rounded-md p-2 border border-slate-100"
          >
            <div className="flex items-center gap-2 flex-1">
              <Badge variant="outline" className="font-mono text-xs">
                {precursor.precursor_cn_code}
              </Badge>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <div className="flex-1">
                <div className="text-xs text-slate-900">{precursor.precursor_name || 'Precursor Material'}</div>
                <div className="text-xs text-slate-500">
                  {precursor.quantity_consumed?.toFixed(3) || 'N/A'} tonnes consumed
                </div>
              </div>
            </div>
            <div className="text-xs font-medium text-slate-700">
              {precursor.emissions_embedded?.toFixed(2) || '0.00'} tCO2e
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between items-center">
        <span className="text-xs text-slate-600">Total Precursor Contribution</span>
        <span className="text-xs font-bold text-slate-900">{totalPrecursorEmissions.toFixed(2)} tCO2e</span>
      </div>
    </div>
  );
}