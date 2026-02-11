import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calculator, Zap, AlertCircle, CheckCircle2, TrendingUp, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function CalculationEngine({ product, components }) {
  const queryClient = useQueryClient();
  const [calculationMethod, setCalculationMethod] = useState('bottom-up');
  const [uncertaintyLevel, setUncertaintyLevel] = useState('medium');
  const [isCalculating, setIsCalculating] = useState(false);
  
  const componentsWithData = components.filter(c => c.emission_factor && c.quantity);
  const dataCompleteness = components.length > 0 
    ? (componentsWithData.length / components.length) * 100 
    : 0;
  
  const calculateAllMutation = useMutation({
    mutationFn: async () => {
      setIsCalculating(true);
      
      // Step 1: Calculate each component
      const stageEmissions = {
        'Raw Material Acquisition': 0,
        'Production': 0,
        'Distribution': 0,
        'Usage': 0,
        'End-of-Life': 0
      };
      
      let total = 0;
      const updates = [];
      
      for (const comp of components) {
        const emission = (comp.quantity || 0) * (comp.emission_factor || 0);
        
        updates.push({
          id: comp.id,
          co2e_kg: emission
        });
        
        total += emission;
        const stage = comp.lifecycle_stage || 'Production';
        if (stageEmissions[stage] !== undefined) {
          stageEmissions[stage] += emission;
        }
      }
      
      // Update all components
      for (const update of updates) {
        await base44.entities.ProductComponent.update(update.id, { co2e_kg: update.co2e_kg });
      }
      
      // Calculate readiness score
      const readinessScore = Math.round((dataCompleteness * 0.7) + 
        (components.filter(c => c.verification_status === 'Verified').length / components.length * 30));
      
      // Step 2: Update product totals
      await base44.entities.Product.update(product.id, {
        total_co2e_kg: total,
        raw_material_co2e: stageEmissions['Raw Material Acquisition'],
        production_co2e: stageEmissions['Production'],
        distribution_co2e: stageEmissions['Distribution'],
        usage_co2e: stageEmissions['Usage'],
        eol_co2e: stageEmissions['End-of-Life'],
        status: dataCompleteness === 100 ? 'Completed' : 'In Progress',
        audit_readiness_score: readinessScore,
        last_calculated_date: new Date().toISOString()
      });
      
      // Track billing
      const UsageMeteringService = (await import('@/components/billing/UsageMeteringService')).default;
      await UsageMeteringService.trackPCFCalculation({ productId: product.id });
      
      return { total, stageEmissions, readinessScore };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['product', product.id]);
      queryClient.invalidateQueries(['product-components', product.id]);
      setIsCalculating(false);
      toast.success(`Total PCF: ${data.total.toFixed(2)} kg CO₂e | Readiness: ${data.readinessScore}%`);
    },
    onError: () => {
      setIsCalculating(false);
      toast.error('Calculation failed');
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Results Cards */}
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardContent className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total PCF</p>
          <p className="text-2xl font-bold text-[#86b027]">
            {(product.total_co2e_kg || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">kg CO₂e</p>
        </CardContent>
      </Card>
      
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-xs text-blue-600 mb-1">Per {product.unit}</p>
          <p className="text-2xl font-bold text-blue-600">
            {product.quantity_amount > 0 
              ? ((product.total_co2e_kg || 0) / product.quantity_amount).toFixed(3)
              : '0.00'
            }
          </p>
          <p className="text-xs text-blue-400">kg CO₂e/unit</p>
        </CardContent>
      </Card>
      
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <p className="text-xs text-slate-500 mb-1">Data Complete</p>
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-2xl font-bold text-slate-700">{dataCompleteness.toFixed(0)}%</p>
            {dataCompleteness === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>
          <Progress value={dataCompleteness} className="h-1.5" />
        </CardContent>
      </Card>
      
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex flex-col h-full">
          <p className="text-xs text-amber-600 mb-2">Actions</p>
          <Button
            onClick={() => calculateAllMutation.mutate()}
            disabled={isCalculating || components.length === 0}
            className="w-full bg-[#86b027] hover:bg-[#769c22] text-white"
            size="sm"
          >
            {isCalculating ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Calculating</>
            ) : (
              <><Zap className="w-3 h-3 mr-1" /> Calculate</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}