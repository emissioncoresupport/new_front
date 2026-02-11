import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Calendar, Download, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from "sonner";

export default function BusinessCaseGenerator() {
  const [projectData, setProjectData] = useState({
    name: '',
    category: 'renewable_energy',
    investment: 0,
    annualSavings: 0,
    emissionsReduction: 0,
    implementationMonths: 12,
    lifespanYears: 10
  });

  const calculateROI = () => {
    const { investment, annualSavings, emissionsReduction, lifespanYears } = projectData;
    const carbonPrice = 50; // €50/tonne
    const annualCarbonValue = emissionsReduction * carbonPrice;
    const totalAnnualBenefit = annualSavings + annualCarbonValue;
    const totalBenefit = totalAnnualBenefit * lifespanYears;
    const netBenefit = totalBenefit - investment;
    const roi = investment > 0 ? ((netBenefit / investment) * 100) : 0;
    const paybackYears = totalAnnualBenefit > 0 ? (investment / totalAnnualBenefit) : 0;

    return {
      roi: Math.round(roi * 10) / 10,
      paybackYears: Math.round(paybackYears * 10) / 10,
      totalBenefit: Math.round(totalBenefit),
      netBenefit: Math.round(netBenefit),
      annualCarbonValue: Math.round(annualCarbonValue),
      totalAnnualBenefit: Math.round(totalAnnualBenefit)
    };
  };

  const metrics = calculateROI();

  // Generate cash flow projection
  const cashFlowData = Array.from({ length: projectData.lifespanYears }, (_, i) => {
    const year = i + 1;
    const cumulativeBenefit = metrics.totalAnnualBenefit * year;
    const netCashFlow = cumulativeBenefit - projectData.investment;
    return {
      year,
      investment: year === 1 ? -projectData.investment : 0,
      benefit: metrics.totalAnnualBenefit,
      cumulative: Math.round(netCashFlow)
    };
  });

  const handleGeneratePDF = async () => {
    const loadingToast = toast.loading('Generating business case document...');
    
    try {
      const doc = `
BUSINESS CASE FOR EMISSIONS REDUCTION PROJECT
Generated: ${new Date().toLocaleDateString()}

PROJECT: ${projectData.name}
Category: ${projectData.category}

FINANCIAL ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Initial Investment: €${projectData.investment.toLocaleString()}
Annual Cost Savings: €${projectData.annualSavings.toLocaleString()}
Annual Carbon Value: €${metrics.annualCarbonValue.toLocaleString()}
Total Annual Benefit: €${metrics.totalAnnualBenefit.toLocaleString()}

Return on Investment (ROI): ${metrics.roi}%
Payback Period: ${metrics.paybackYears} years
Net Present Value: €${metrics.netBenefit.toLocaleString()}
Total Benefit (${projectData.lifespanYears} years): €${metrics.totalBenefit.toLocaleString()}

EMISSIONS IMPACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Annual Emissions Reduction: ${projectData.emissionsReduction} tCO2e
Total Reduction (${projectData.lifespanYears} years): ${projectData.emissionsReduction * projectData.lifespanYears} tCO2e
Carbon Price Assumption: €50/tonne

IMPLEMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implementation Timeline: ${projectData.implementationMonths} months
Project Lifespan: ${projectData.lifespanYears} years

RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${metrics.roi > 20 ? '✅ STRONG BUSINESS CASE - Recommend immediate approval' :
  metrics.roi > 10 ? '⚠️ MODERATE BUSINESS CASE - Recommend with conditions' :
  '❌ WEAK BUSINESS CASE - Consider alternatives'}

Payback within ${metrics.paybackYears} years ${metrics.paybackYears < 3 ? '(Excellent)' : metrics.paybackYears < 5 ? '(Good)' : '(Acceptable)'}
      `;

      const blob = new Blob([doc], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BusinessCase_${projectData.name.replace(/\s/g, '_')}_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('✅ Business case generated!');
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Generation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#86b027] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#545454]">Business Case Generator</h3>
            <p className="text-xs text-slate-600">ROI calculator for emissions reduction projects</p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Project Name</label>
              <Input
                value={projectData.name}
                onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                placeholder="e.g., Solar Panel Installation"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={projectData.category} onValueChange={(v) => setProjectData({ ...projectData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renewable_energy">Renewable Energy</SelectItem>
                  <SelectItem value="efficiency">Energy Efficiency</SelectItem>
                  <SelectItem value="electrification">Electrification</SelectItem>
                  <SelectItem value="supplier_engagement">Supplier Engagement</SelectItem>
                  <SelectItem value="circular_economy">Circular Economy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Initial Investment (€)</label>
              <Input
                type="number"
                value={projectData.investment}
                onChange={(e) => setProjectData({ ...projectData, investment: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Annual Cost Savings (€)</label>
              <Input
                type="number"
                value={projectData.annualSavings}
                onChange={(e) => setProjectData({ ...projectData, annualSavings: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Emissions Reduction (tCO2e/year)</label>
              <Input
                type="number"
                value={projectData.emissionsReduction}
                onChange={(e) => setProjectData({ ...projectData, emissionsReduction: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Implementation Time (months)</label>
              <Input
                type="number"
                value={projectData.implementationMonths}
                onChange={(e) => setProjectData({ ...projectData, implementationMonths: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Project Lifespan (years)</label>
              <Input
                type="number"
                value={projectData.lifespanYears}
                onChange={(e) => setProjectData({ ...projectData, lifespanYears: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-[#86b027] bg-[#86b027]/5">
          <CardContent className="p-6">
            <TrendingUp className="w-6 h-6 text-[#86b027] mb-2" />
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">ROI</p>
            <p className="text-3xl font-bold text-[#86b027]">{metrics.roi}%</p>
          </CardContent>
        </Card>
        <Card className="border-[#02a1e8] bg-[#02a1e8]/5">
          <CardContent className="p-6">
            <Calendar className="w-6 h-6 text-[#02a1e8] mb-2" />
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Payback Period</p>
            <p className="text-3xl font-bold text-[#02a1e8]">{metrics.paybackYears}y</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <DollarSign className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Net Benefit</p>
            <p className="text-2xl font-bold text-emerald-600">€{metrics.netBenefit.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Sparkles className="w-6 h-6 text-purple-600 mb-2" />
            <p className="text-xs text-slate-600 uppercase font-bold mb-1">Annual Carbon Value</p>
            <p className="text-2xl font-bold text-purple-600">€{metrics.annualCarbonValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" label={{ value: 'Year', position: 'bottom' }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="cumulative" stroke="#86b027" strokeWidth={2} name="Net Cash Flow (€)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button onClick={handleGeneratePDF} className="w-full bg-[#86b027] hover:bg-[#769c22]">
        <Download className="w-4 h-4 mr-2" />
        Generate Business Case Document
      </Button>
    </div>
  );
}