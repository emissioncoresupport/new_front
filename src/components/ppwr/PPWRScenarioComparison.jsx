import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, TrendingDown, TrendingUp, Minus, Sparkles, Scale, Calculator } from "lucide-react";
import PPWRCalculationService from './services/PPWRCalculationService';
import { toast } from 'sonner';

export default function PPWRScenarioComparison() {
  const [scenario, setScenario] = useState({
    name: '',
    baseline: {
      material_category: 'Plastic',
      total_weight_kg: 0,
      recycled_content_percentage: 0,
      recyclability_score: 0,
      is_reusable: false,
      contains_pfas: false
    },
    redesigned: {
      material_category: 'Plastic',
      total_weight_kg: 0,
      recycled_content_percentage: 0,
      recyclability_score: 0,
      is_reusable: false,
      contains_pfas: false
    }
  });

  const [comparison, setComparison] = useState(null);

  const handleCompare = () => {
    if (!scenario.name || !scenario.baseline.total_weight_kg || !scenario.redesigned.total_weight_kg) {
      toast.error('Fill in scenario name and weights');
      return;
    }

    const baselineCircularity = PPWRCalculationService.calculateCircularityScore(scenario.baseline);
    const redesignedCircularity = PPWRCalculationService.calculateCircularityScore(scenario.redesigned);
    
    const baselineTax = PPWRCalculationService.calculatePlasticTax(scenario.baseline);
    const redesignedTax = PPWRCalculationService.calculatePlasticTax(scenario.redesigned);

    const result = {
      circularity: {
        baseline: baselineCircularity.total_score,
        redesigned: redesignedCircularity.total_score,
        improvement: redesignedCircularity.total_score - baselineCircularity.total_score
      },
      plastic_tax: {
        baseline: baselineTax.tax_eur,
        redesigned: redesignedTax.tax_eur,
        savings: baselineTax.tax_eur - redesignedTax.tax_eur
      },
      weight_reduction: {
        baseline: scenario.baseline.total_weight_kg,
        redesigned: scenario.redesigned.total_weight_kg,
        reduction_percent: ((scenario.baseline.total_weight_kg - scenario.redesigned.total_weight_kg) / scenario.baseline.total_weight_kg) * 100
      },
      compliance_impact: {
        pfas_eliminated: scenario.baseline.contains_pfas && !scenario.redesigned.contains_pfas,
        reusability_added: !scenario.baseline.is_reusable && scenario.redesigned.is_reusable
      }
    };

    setComparison(result);
    toast.success('Scenario comparison complete');
  };

  const updateBaseline = (field, value) => {
    setScenario(prev => ({
      ...prev,
      baseline: { ...prev.baseline, [field]: value }
    }));
  };

  const updateRedesigned = (field, value) => {
    setScenario(prev => ({
      ...prev,
      redesigned: { ...prev.redesigned, [field]: value }
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Scale className="w-5 h-5" />
            Packaging Design Scenario Modeling
          </CardTitle>
          <p className="text-sm text-slate-500">
            Compare baseline vs. redesigned packaging - circularity, tax, weight reduction
          </p>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        <Label>Scenario Name</Label>
        <Input
          placeholder="e.g. Switch to mono-material PCR film"
          value={scenario.name}
          onChange={(e) => setScenario(prev => ({ ...prev, name: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Baseline */}
        <Card className="border-slate-300">
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg">Baseline Design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Material Category</Label>
              <Select value={scenario.baseline.material_category} onValueChange={(v) => updateBaseline('material_category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plastic">Plastic</SelectItem>
                  <SelectItem value="Paper/Cardboard">Paper/Cardboard</SelectItem>
                  <SelectItem value="Glass">Glass</SelectItem>
                  <SelectItem value="Metal">Metal</SelectItem>
                  <SelectItem value="Composite">Composite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Weight (kg)</Label>
                <Input type="number" step="0.01" value={scenario.baseline.total_weight_kg} onChange={(e) => updateBaseline('total_weight_kg', parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">PCR %</Label>
                <Input type="number" step="1" value={scenario.baseline.recycled_content_percentage} onChange={(e) => updateBaseline('recycled_content_percentage', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Recyclability Score</Label>
              <Input type="number" step="1" value={scenario.baseline.recyclability_score} onChange={(e) => updateBaseline('recyclability_score', parseFloat(e.target.value))} />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-xs text-slate-600">Reusable?</span>
              <input type="checkbox" checked={scenario.baseline.is_reusable} onChange={(e) => updateBaseline('is_reusable', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-xs text-slate-600">Contains PFAS?</span>
              <input type="checkbox" checked={scenario.baseline.contains_pfas} onChange={(e) => updateBaseline('contains_pfas', e.target.checked)} />
            </div>
          </CardContent>
        </Card>

        {/* Redesigned */}
        <Card className="border-[#86b027]">
          <CardHeader className="bg-[#86b027]/10">
            <CardTitle className="text-lg text-[#86b027]">Redesigned (Proposed)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label className="text-xs">Material Category</Label>
              <Select value={scenario.redesigned.material_category} onValueChange={(v) => updateRedesigned('material_category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Plastic">Plastic</SelectItem>
                  <SelectItem value="Paper/Cardboard">Paper/Cardboard</SelectItem>
                  <SelectItem value="Glass">Glass</SelectItem>
                  <SelectItem value="Metal">Metal</SelectItem>
                  <SelectItem value="Composite">Composite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Weight (kg)</Label>
                <Input type="number" step="0.01" value={scenario.redesigned.total_weight_kg} onChange={(e) => updateRedesigned('total_weight_kg', parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">PCR %</Label>
                <Input type="number" step="1" value={scenario.redesigned.recycled_content_percentage} onChange={(e) => updateRedesigned('recycled_content_percentage', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Recyclability Score</Label>
              <Input type="number" step="1" value={scenario.redesigned.recyclability_score} onChange={(e) => updateRedesigned('recyclability_score', parseFloat(e.target.value))} />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-xs text-slate-600">Reusable?</span>
              <input type="checkbox" checked={scenario.redesigned.is_reusable} onChange={(e) => updateRedesigned('is_reusable', e.target.checked)} />
            </div>
            <div className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-xs text-slate-600">Contains PFAS?</span>
              <input type="checkbox" checked={scenario.redesigned.contains_pfas} onChange={(e) => updateRedesigned('contains_pfas', e.target.checked)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleCompare} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Calculator className="w-4 h-4 mr-2" />
          Calculate Impact
        </Button>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/30 to-white">
          <CardHeader>
            <CardTitle className="text-purple-900">Scenario Analysis: {scenario.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Circularity Impact */}
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">Circular Economy Score</h4>
                <Badge className={comparison.circularity.improvement > 0 ? 'bg-emerald-500' : 'bg-rose-500'}>
                  {comparison.circularity.improvement > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {comparison.circularity.improvement > 0 ? '+' : ''}{comparison.circularity.improvement.toFixed(1)} pts
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-xs text-slate-500">Baseline</p>
                  <p className="text-2xl font-bold text-slate-700">{comparison.circularity.baseline}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 mx-auto mt-3" />
                <div>
                  <p className="text-xs text-slate-500">Redesigned</p>
                  <p className="text-2xl font-bold text-[#86b027]">{comparison.circularity.redesigned}</p>
                </div>
              </div>
            </div>

            {/* Plastic Tax Impact */}
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">Plastic Tax Liability</h4>
                <Badge className={comparison.plastic_tax.savings > 0 ? 'bg-emerald-500' : 'bg-amber-500'}>
                  €{comparison.plastic_tax.savings.toFixed(2)} saved
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-xs text-slate-500">Current</p>
                  <p className="text-2xl font-bold text-amber-600">€{comparison.plastic_tax.baseline.toFixed(2)}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 mx-auto mt-3" />
                <div>
                  <p className="text-xs text-slate-500">After</p>
                  <p className="text-2xl font-bold text-emerald-600">€{comparison.plastic_tax.redesigned.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Weight Reduction */}
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">Weight Reduction (Article 5)</h4>
                <Badge className={comparison.weight_reduction.reduction_percent > 0 ? 'bg-emerald-500' : 'bg-slate-500'}>
                  {comparison.weight_reduction.reduction_percent > 0 ? '-' : ''}{Math.abs(comparison.weight_reduction.reduction_percent).toFixed(1)}%
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <p className="text-xs text-slate-500">Baseline</p>
                  <p className="text-lg font-bold text-slate-700">{comparison.weight_reduction.baseline} kg</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 mx-auto mt-3" />
                <div>
                  <p className="text-xs text-slate-500">Redesigned</p>
                  <p className="text-lg font-bold text-[#86b027]">{comparison.weight_reduction.redesigned} kg</p>
                </div>
              </div>
            </div>

            {/* Compliance Impact */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h4 className="font-semibold text-emerald-900 mb-2">Compliance Improvements</h4>
              <div className="space-y-2 text-sm">
                {comparison.compliance_impact.pfas_eliminated && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    PFAS eliminated - compliant with Art. 8 ban
                  </div>
                )}
                {comparison.compliance_impact.reusability_added && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Reusability added - contributes to Art. 26 targets
                  </div>
                )}
                {scenario.redesigned.recycled_content_percentage > scenario.baseline.recycled_content_percentage && (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Recycled content increased - Art. 7 compliance improved
                  </div>
                )}
              </div>
            </div>

            {/* Overall Recommendation */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Overall Impact
              </h4>
              <p className="text-sm text-slate-700">
                {comparison.circularity.improvement > 10 && comparison.plastic_tax.savings > 0 ? (
                  <strong className="text-emerald-700">✓ Highly recommended:</strong>
                ) : comparison.circularity.improvement > 0 ? (
                  <strong className="text-blue-700">⚠ Moderate improvement:</strong>
                ) : (
                  <strong className="text-amber-700">⚠ Limited benefit:</strong>
                )}
                {' '}
                This redesign improves circularity by {comparison.circularity.improvement.toFixed(1)} points, 
                saves €{comparison.plastic_tax.savings.toFixed(2)}/year in plastic tax, and reduces weight by {Math.abs(comparison.weight_reduction.reduction_percent).toFixed(1)}%.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}