import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Euro, TrendingUp, AlertTriangle, DollarSign, PieChart, BarChart3, 
  Target, Shield, Download, Zap, MapPin, Package, Users, FileText 
} from "lucide-react";
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, 
  BarChart, Bar, PieChart as RPieChart, Pie, Cell, Legend 
} from 'recharts';
import { toast } from "sonner";

const COLORS = ['#86b027', '#02a1e8', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981'];

export default function CFODashboard() {
  const [timeframe, setTimeframe] = useState('2026');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [scenario, setScenario] = useState('current');

  // Fetch all module data
  const { data: cbamEntries = [] } = useQuery({
    queryKey: ['cbam-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list()
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['cbam-orders'],
    queryFn: () => base44.entities.CBAMPurchaseOrder.list()
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['logistics-shipments'],
    queryFn: () => base44.entities.LogisticsShipment.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const { data: eudrBatches = [] } = useQuery({
    queryKey: ['eudr-batches'],
    queryFn: () => base44.entities.EUDRBatch.list()
  });

  const { data: pfasAssessments = [] } = useQuery({
    queryKey: ['pfas-assessments'],
    queryFn: () => base44.entities.PFASAssessment.list()
  });

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    // CBAM Costs
    const totalEmissions = cbamEntries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
    const cbamFactor = scenario === 'current' ? 0.025 : scenario === 'optimistic' ? 0.02 : 0.03;
    const certPrice = scenario === 'current' ? 88 : scenario === 'optimistic' ? 75 : 105;
    const requiredCerts = totalEmissions * cbamFactor;
    const cbamLiability = requiredCerts * certPrice;

    // Certificate Coverage
    const certInvestment = certificates.reduce((sum, c) => sum + (c.purchase_price * c.quantity || 0), 0);
    const pendingOrders = orders.filter(o => o.status !== 'completed').reduce((sum, o) => sum + o.total_amount, 0);
    const hedgedPercentage = cbamLiability > 0 ? (certInvestment / cbamLiability) * 100 : 0;

    // Logistics Costs
    const logisticsCarbonCost = shipments.reduce((sum, s) => {
      const emissionsCost = (s.total_emissions_kgco2e || 0) / 1000 * certPrice;
      return sum + emissionsCost;
    }, 0);

    // PPWR Costs (EPR fees, DRS deposits, penalties)
    const ppwrCosts = packaging.reduce((sum, p) => {
      const eprFee = (p.total_weight_kg || 0) * 0.5; // €0.50/kg EPR fee
      const drsCost = p.drs_eligible ? (p.drs_deposit_amount || 0) : 0;
      const penaltyRisk = p.penalty_risk_level === 'critical' ? 5000 : 
                          p.penalty_risk_level === 'high' ? 2000 : 0;
      return sum + eprFee + drsCost + penaltyRisk;
    }, 0);

    // EUDR Compliance Costs
    const eudrCosts = eudrBatches.reduce((sum, b) => {
      const riskCost = b.risk_level === 'high' ? 1500 : b.risk_level === 'standard' ? 500 : 200;
      return sum + riskCost;
    }, 0);

    // PFAS Testing & Substitution Costs
    const pfasCosts = pfasAssessments.filter(a => a.status === 'Non-Compliant').length * 3500; // €3.5k per remediation

    // PCF/LCA Costs (data collection, verification)
    const pcfCosts = products.length * 250; // €250 per product PCF

    // Total Exposure
    const totalExposure = cbamLiability + logisticsCarbonCost + ppwrCosts + eudrCosts + pfasCosts + pcfCosts;

    // By Region
    const regionBreakdown = cbamEntries.reduce((acc, e) => {
      const region = e.country_of_origin || 'Unknown';
      if (!acc[region]) acc[region] = 0;
      acc[region] += (e.total_embedded_emissions || 0) * certPrice * cbamFactor;
      return acc;
    }, {});

    // By Supplier
    const supplierBreakdown = suppliers.map(s => {
      const supplierEntries = cbamEntries.filter(e => e.supplier_id === s.id);
      const supplierEmissions = supplierEntries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      return {
        id: s.id,
        name: s.legal_name,
        emissions: supplierEmissions,
        cost: supplierEmissions * certPrice * cbamFactor,
        risk_score: s.esg_risk_score || 50
      };
    }).filter(s => s.cost > 0).sort((a, b) => b.cost - a.cost);

    // By SKU
    const skuBreakdown = skus.map(sku => {
      const skuEntries = cbamEntries.filter(e => e.sku_id === sku.id);
      const skuEmissions = skuEntries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
      const product = products.find(p => p.id === sku.product_id);
      return {
        id: sku.id,
        name: sku.sku_code || sku.name,
        emissions: skuEmissions,
        cost: skuEmissions * certPrice * cbamFactor,
        pcf: product?.total_co2e_kg || 0
      };
    }).filter(s => s.cost > 0).sort((a, b) => b.cost - a.cost);

    return {
      cbamLiability,
      requiredCerts,
      certPrice,
      certInvestment,
      pendingOrders,
      hedgedPercentage,
      logisticsCarbonCost,
      ppwrCosts,
      eudrCosts,
      pfasCosts,
      pcfCosts,
      totalExposure,
      regionBreakdown,
      supplierBreakdown: supplierBreakdown.slice(0, 10),
      skuBreakdown: skuBreakdown.slice(0, 10),
      riskLevel: hedgedPercentage >= 90 ? 'Low' : hedgedPercentage >= 70 ? 'Medium' : 'High'
    };
  }, [cbamEntries, certificates, orders, shipments, suppliers, skus, products, packaging, eudrBatches, pfasAssessments, scenario]);

  // Module cost breakdown for pie chart
  const moduleBreakdown = [
    { name: 'CBAM', value: metrics.cbamLiability },
    { name: 'Logistics', value: metrics.logisticsCarbonCost },
    { name: 'PPWR', value: metrics.ppwrCosts },
    { name: 'EUDR', value: metrics.eudrCosts },
    { name: 'PFAS', value: metrics.pfasCosts },
    { name: 'PCF/LCA', value: metrics.pcfCosts }
  ];

  // Region breakdown for bar chart
  const regionData = Object.entries(metrics.regionBreakdown).map(([name, value]) => ({ name, value })).slice(0, 8);

  // Trend data (using historical + projections)
  const trendData = [
    { month: 'Q4 2025', current: metrics.totalExposure * 0.7, hedged: metrics.certInvestment * 0.6 },
    { month: 'Q1 2026', current: metrics.totalExposure * 0.85, hedged: metrics.certInvestment * 0.8 },
    { month: 'Q2 2026', current: metrics.totalExposure, hedged: metrics.certInvestment },
    { month: 'Q3 2026', current: metrics.totalExposure * 1.1, hedged: metrics.certInvestment * 1.15 },
    { month: 'Q4 2026', current: metrics.totalExposure * 1.2, hedged: metrics.certInvestment * 1.3 }
  ];

  const generateReport = async () => {
    toast.loading('Generating comprehensive financial report...');
    try {
      const reportData = {
        generated_at: new Date().toISOString(),
        timeframe,
        scenario,
        summary: metrics,
        supplier_breakdown: metrics.supplierBreakdown,
        sku_breakdown: metrics.skuBreakdown,
        region_breakdown: metrics.regionBreakdown,
        module_breakdown: moduleBreakdown
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an executive financial report for carbon compliance costs. 
        
Data: ${JSON.stringify(reportData, null, 2)}

Create a professional report covering:
1. Executive Summary
2. Total Carbon Cost Exposure: €${metrics.totalExposure.toLocaleString()}
3. Risk Assessment (${metrics.riskLevel})
4. Module-by-Module Breakdown
5. Top 10 Cost Drivers (Suppliers & SKUs)
6. Regional Cost Distribution
7. Scenario Analysis (Current vs Optimistic vs Pessimistic)
8. Strategic Recommendations for Cost Reduction
9. Hedging Strategy Recommendations

Format as a clear, actionable executive summary.`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            total_exposure: { type: "number" },
            risk_level: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            cost_reduction_opportunities: { type: "array", items: { type: "object" } }
          }
        }
      });

      console.log('Financial Report:', result);
      toast.success('Report generated! Check console for details');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Financial Command Center</h1>
            <p className="text-slate-600">Real-time carbon cost analysis across all compliance modules</p>
          </div>
          <div className="flex gap-3">
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optimistic">Optimistic</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="pessimistic">Pessimistic</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generateReport} className="bg-[#86b027] hover:bg-[#769c22]">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <Badge variant="outline" className="text-rose-600">Total Risk</Badge>
              </div>
              <h3 className="text-3xl font-bold text-slate-900">€{metrics.totalExposure.toLocaleString()}</h3>
              <p className="text-sm text-slate-600">Total Carbon Exposure</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-blue-500" />
                <Badge variant="outline" className="text-blue-600">CBAM</Badge>
              </div>
              <h3 className="text-3xl font-bold text-slate-900">€{metrics.cbamLiability.toLocaleString()}</h3>
              <p className="text-sm text-slate-600">Certificate Obligation</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <Badge className={
                  metrics.riskLevel === 'Low' ? 'bg-emerald-500' :
                  metrics.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'
                }>{metrics.riskLevel}</Badge>
              </div>
              <h3 className="text-3xl font-bold text-slate-900">{metrics.hedgedPercentage.toFixed(1)}%</h3>
              <p className="text-sm text-slate-600">Coverage Ratio</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Package className="w-5 h-5 text-amber-500" />
                <Badge variant="outline" className="text-amber-600">PPWR</Badge>
              </div>
              <h3 className="text-3xl font-bold text-slate-900">€{metrics.ppwrCosts.toLocaleString()}</h3>
              <p className="text-sm text-slate-600">Packaging Costs</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-purple-500" />
                <Badge variant="outline" className="text-purple-600">Logistics</Badge>
              </div>
              <h3 className="text-3xl font-bold text-slate-900">€{metrics.logisticsCarbonCost.toLocaleString()}</h3>
              <p className="text-sm text-slate-600">Transport Emissions</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="suppliers">By Supplier</TabsTrigger>
            <TabsTrigger value="skus">By SKU</TabsTrigger>
            <TabsTrigger value="regions">By Region</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Trend & Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="current" stackId="1" stroke="#ef4444" fill="#fca5a5" name="Exposure" />
                      <Area type="monotone" dataKey="hedged" stackId="2" stroke="#10b981" fill="#86efac" name="Hedged" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Module Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Module</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RPieChart>
                      <Pie data={moduleBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {moduleBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Module-by-Module Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {moduleBreakdown.map((mod, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{mod.name}</span>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                      </div>
                      <p className="text-2xl font-bold text-slate-900">€{mod.value.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{((mod.value / metrics.totalExposure) * 100).toFixed(1)}% of total</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Suppliers by Carbon Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.supplierBreakdown.map((supplier, idx) => (
                    <div key={supplier.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#86b027] text-white flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold">{supplier.name}</p>
                          <p className="text-sm text-slate-500">{supplier.emissions.toFixed(0)} tCO2e</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900">€{supplier.cost.toLocaleString()}</p>
                        <Badge variant={supplier.risk_score > 70 ? 'destructive' : supplier.risk_score > 50 ? 'outline' : 'default'}>
                          Risk: {supplier.risk_score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skus">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 SKUs by Carbon Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.skuBreakdown.map((sku, idx) => (
                    <div key={sku.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#02a1e8] text-white flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold">{sku.name}</p>
                          <p className="text-sm text-slate-500">Embedded: {sku.emissions.toFixed(0)} tCO2e | PCF: {sku.pcf.toFixed(2)} kgCO2e</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-slate-900">€{sku.cost.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Origin Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={regionData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#86b027" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios">
            <div className="grid grid-cols-3 gap-6">
              <Card className="border-2 border-emerald-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Optimistic Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Certificate Price</p>
                    <p className="text-2xl font-bold">€75/tCO2</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Exposure</p>
                    <p className="text-2xl font-bold text-emerald-600">€{(metrics.totalExposure * 0.85).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-slate-500">-15% vs current scenario</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Current Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Certificate Price</p>
                    <p className="text-2xl font-bold">€88/tCO2</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Exposure</p>
                    <p className="text-2xl font-bold text-blue-600">€{metrics.totalExposure.toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-slate-500">Active scenario</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-rose-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    Pessimistic Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600">Certificate Price</p>
                    <p className="text-2xl font-bold">€105/tCO2</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Exposure</p>
                    <p className="text-2xl font-bold text-rose-600">€{(metrics.totalExposure * 1.19).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-slate-500">+19% vs current scenario</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.hedgedPercentage < 80 && (
                  <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded">
                    <p className="font-bold text-rose-900">🚨 Critical: Low Coverage Ratio</p>
                    <p className="text-sm text-rose-700 mt-1">
                      Purchase {Math.ceil(metrics.requiredCerts - (metrics.certInvestment / metrics.certPrice))} more certificates to reach 80% coverage
                    </p>
                  </div>
                )}
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <p className="font-bold text-blue-900">💡 Forward Hedge Opportunity</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Lock in 2027 certificates now at €92/tCO2. Potential savings: €{((105 - 92) * metrics.requiredCerts).toLocaleString()} under pessimistic scenario
                  </p>
                </div>
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                  <p className="font-bold text-amber-900">⚠️ Supplier Concentration Risk</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Top 3 suppliers account for {((metrics.supplierBreakdown.slice(0, 3).reduce((sum, s) => sum + s.cost, 0) / metrics.totalExposure) * 100).toFixed(0)}% of costs. Diversify sourcing.
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded">
                  <p className="font-bold text-emerald-900">✓ Verified Carbon Credit Opportunity</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Switch to suppliers with lower embedded emissions. Estimated annual savings: €{((metrics.totalExposure * 0.12)).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}