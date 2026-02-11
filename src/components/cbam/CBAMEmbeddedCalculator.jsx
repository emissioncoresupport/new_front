import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Calculator, Sparkles, Loader2, Layers, Zap } from "lucide-react";

export default function CBAMEmbeddedCalculator() {
  const [formData, setFormData] = useState({
    cn_code: '',
    net_mass: '',
    calculation_method: 'default_values',
    direct_ef: '',
    indirect_ef: '',
    electricity_source: 'grid_mix'
  });
  const [calculationResult, setCalculationResult] = useState(null);

  const calculateMutation = useMutation({
    mutationFn: async (data) => {
      toast.loading('Calculating embedded emissions...');

      const prompt = `Calculate CBAM embedded emissions for:

Product: CN Code ${data.cn_code}
Net Mass: ${data.net_mass} tonnes
Method: ${data.calculation_method}
${data.calculation_method === 'actual_data' ? `
Direct EF: ${data.direct_ef} tCO2e/t
Indirect EF: ${data.indirect_ef} tCO2e/t
Electricity: ${data.electricity_source}
` : ''}

Apply CBAM methodology (Annex III, Regulation 2023/956):
1. Calculate direct emissions (Scope 1)
2. Calculate indirect emissions from electricity (Scope 2)
3. Apply system boundaries
4. Calculate total embedded emissions

If using default values, reference EU Commission default values for this CN code.

Return detailed calculation with breakdown.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            total_embedded_emissions: { type: "number" },
            direct_emissions: { type: "number" },
            indirect_emissions: { type: "number" },
            direct_ef_used: { type: "number" },
            indirect_ef_used: { type: "number" },
            calculation_steps: {
              type: "array",
              items: { type: "string" }
            },
            data_quality_rating: { type: "string" },
            methodology_notes: { type: "string" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success('Calculation complete');
      setCalculationResult(data);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Calculation failed');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-teal-200 bg-gradient-to-br from-white to-teal-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-600" />
            Embedded Emissions Calculator
          </CardTitle>
          <p className="text-sm text-slate-600">
            Calculate CBAM embedded emissions following EU methodology
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CN Code</Label>
              <Input
                placeholder="e.g., 7208"
                value={formData.cn_code}
                onChange={(e) => setFormData({...formData, cn_code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Net Mass (tonnes)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="e.g., 15.5"
                value={formData.net_mass}
                onChange={(e) => setFormData({...formData, net_mass: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Calculation Method</Label>
            <Select 
              value={formData.calculation_method} 
              onValueChange={(v) => setFormData({...formData, calculation_method: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual_data">Actual Data (Verified)</SelectItem>
                <SelectItem value="default_values">EU Default Values</SelectItem>
                <SelectItem value="hybrid">Hybrid Approach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.calculation_method === 'actual_data' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Direct EF (tCO2e/t)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1.85"
                    value={formData.direct_ef}
                    onChange={(e) => setFormData({...formData, direct_ef: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Indirect EF (tCO2e/t)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 0.25"
                    value={formData.indirect_ef}
                    onChange={(e) => setFormData({...formData, indirect_ef: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Electricity Source</Label>
                <Select 
                  value={formData.electricity_source} 
                  onValueChange={(v) => setFormData({...formData, electricity_source: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid_mix">National Grid Mix</SelectItem>
                    <SelectItem value="renewable">100% Renewable</SelectItem>
                    <SelectItem value="fossil">Fossil Fuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={() => calculateMutation.mutate(formData)}
            disabled={!formData.cn_code || !formData.net_mass || calculateMutation.isPending}
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
          >
            {calculateMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Calculating...</>
            ) : (
              <><Zap className="w-5 h-5 mr-2" /> Calculate Embedded Emissions</>
            )}
          </Button>

          {calculationResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pt-4 border-t">
              <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
                <div className="text-xs text-teal-600 font-bold uppercase mb-1">Total Embedded Emissions</div>
                <div className="text-4xl font-black text-teal-900">
                  {calculationResult.total_embedded_emissions.toFixed(3)}
                  <span className="text-lg text-teal-600 ml-2">tCO2e</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 uppercase mb-1">Direct (Scope 1)</div>
                  <div className="text-xl font-bold text-slate-900">
                    {calculationResult.direct_emissions.toFixed(3)}
                  </div>
                  <div className="text-xs text-slate-400">EF: {calculationResult.direct_ef_used}</div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <div className="text-xs text-slate-500 uppercase mb-1">Indirect (Scope 2)</div>
                  <div className="text-xl font-bold text-slate-900">
                    {calculationResult.indirect_emissions.toFixed(3)}
                  </div>
                  <div className="text-xs text-slate-400">EF: {calculationResult.indirect_ef_used}</div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-bold text-blue-900 text-sm mb-2">Calculation Steps:</div>
                <ol className="space-y-1 text-xs text-blue-800">
                  {calculationResult.calculation_steps.map((step, idx) => (
                    <li key={idx}>{idx + 1}. {step}</li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <span className="text-sm font-medium">Data Quality Rating:</span>
                <Badge className={
                  calculationResult.data_quality_rating === 'High' ? 'bg-emerald-100 text-emerald-700' :
                  calculationResult.data_quality_rating === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {calculationResult.data_quality_rating}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}