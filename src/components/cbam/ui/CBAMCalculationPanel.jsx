/**
 * CBAM Calculation Panel - UI Component ONLY
 * Domain: Display calculation results
 * Responsibilities: Render breakdown, trigger recalculation
 * Boundaries: NO calculation logic
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import CBAMCalculationService from '../services/lifecycle/CBAMCalculationService';
import { toast } from 'sonner';

export default function CBAMCalculationPanel({ entry, onCalculationComplete }) {
  const [isCalculating, setIsCalculating] = React.useState(false);
  
  const handleRecalculate = async () => {
    setIsCalculating(true);
    
    try {
      // Trigger calculation service
      const result = await CBAMCalculationService.calculateAndUpdate(entry.id);
      
      if (result.success) {
        toast.success('Calculation complete');
        onCalculationComplete?.(result.entry);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };
  
  const hasCalculation = entry.total_embedded_emissions > 0;
  
  return (
    <Card className="bg-white/60 backdrop-blur-xl border-white/80">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Emission Calculation</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRecalculate}
          disabled={isCalculating}
          className="h-8 text-xs"
        >
          {isCalculating ? (
            <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Calculating</>
          ) : (
            <><RefreshCw className="w-3 h-3 mr-1" /> Recalculate</>
          )}
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!hasCalculation ? (
          <div className="flex items-center gap-2 p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-700">No calculation available - click Recalculate</span>
          </div>
        ) : (
          <>
            {/* Pure rendering - no calculations */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Direct Emissions</span>
                <span className="font-medium">{entry.direct_emissions_specific?.toFixed(3) || 0} tCO2e/t</span>
              </div>
              
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Indirect Emissions</span>
                <span className="font-medium">{entry.indirect_emissions_specific?.toFixed(3) || 0} tCO2e/t</span>
              </div>
              
              {entry.precursor_emissions_embedded > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Precursor Emissions</span>
                  <span className="font-medium">{entry.precursor_emissions_embedded?.toFixed(3)} tCO2e</span>
                </div>
              )}
              
              <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-medium">Total Embedded</span>
                <span className="font-semibold text-slate-900">{entry.total_embedded_emissions?.toFixed(2)} tCO2e</span>
              </div>
              
              {entry.mark_up_percentage_applied > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">After Markup ({entry.mark_up_percentage_applied}%)</span>
                  <span className="font-medium">{entry.default_value_with_markup?.toFixed(2)} tCO2e</span>
                </div>
              )}
              
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Free Allocation</span>
                <span className="font-medium text-green-600">-{entry.free_allocation_adjustment?.toFixed(2)} tCO2e</span>
              </div>
              
              <div className="flex justify-between text-xs pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-medium">Certificates Required</span>
                <span className="font-semibold text-[#86b027]">{entry.certificates_required?.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="text-[10px]">
                {entry.calculation_method}
              </Badge>
              {entry.production_route && (
                <Badge variant="outline" className="text-[10px]">
                  {entry.production_route}
                </Badge>
              )}
              <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-auto" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}