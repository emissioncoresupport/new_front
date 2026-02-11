import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, TrendingUp, AlertTriangle, Zap, Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CBAMSupplierCostComparator from './CBAMSupplierCostComparator';
import CBAMSmartImportWizard from './CBAMSmartImportWizard';
import CNCodeAutocomplete from './CNCodeAutocomplete';
import UsageMeteringService from '@/components/billing/UsageMeteringService';
import CBAMCalculationService from './services/CBAMCalculationService';
import { 
  isEUCountry, 
  COMMON_NON_EU_COUNTRIES, 
  getDefaultBenchmark, 
  CBAM_2026_BENCHMARKS,
  COUNTRY_DEFAULT_VALUES_2026,
  getDefaultValueWithMarkup,
  EU_DEFAULT_VALUES_TRANSITIONAL
} from './constants.jsx';
import { CBAM_PHASE_IN_REFERENCE, getPhaseInData } from './CBAMPhaseInReference';
import { toast } from 'sonner';

export default function CBAMInstantCalculator() {
  const [inputs, setInputs] = useState({
    cn_code: '',
    product_name: '',
    quantity_tonnes: '',
    emissions_intensity: '',
    country_of_origin: '',
    supplier_id: '',
    production_route: ''
  });

  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });
  
  const suppliers = allSuppliers.filter(s => !isEUCountry(s.country));

  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 20)
  });

  // Use official EU default values from constants - with safe access
  const cnBenchmarks = {};
  const safeCodes = ['260112', '7201', '7203', '720610', '720690', '7207', '7208', '7209', '760110', '760120', '7603', '7604', '310210', '310221', '310230', '252310', '280410'];
  
  safeCodes.forEach(code => {
    const data = EU_DEFAULT_VALUES_TRANSITIONAL[code];
    if (data) {
      cnBenchmarks[code] = {
        name: data.description || 'Unknown',
        benchmark: data.total || 0,
        category: data.category || 'Other'
      };
    }
  });

  // Use official CBAM phase-in schedule with real ETS prices
  const latestEuaPrice = priceHistory[0]?.cbam_certificate_price || priceHistory[0]?.eua_price || 85;
  
  const euaPriceForecast = [
    { 
      year: 2026, 
      phase: CBAM_PHASE_IN_REFERENCE[2026].description,
      price: latestEuaPrice,
      free_allocation: CBAM_PHASE_IN_REFERENCE[2026].free_allocation_remaining,
      default_markup: CBAM_PHASE_IN_REFERENCE[2026].default_markup
    },
    { 
      year: 2027,
      phase: CBAM_PHASE_IN_REFERENCE[2027].description,
      price: priceHistory.find(p => p.quarter === 'Q1 2027')?.cbam_certificate_price || 95,
      free_allocation: CBAM_PHASE_IN_REFERENCE[2027].free_allocation_remaining,
      default_markup: CBAM_PHASE_IN_REFERENCE[2027].default_markup
    },
    { 
      year: 2028,
      phase: CBAM_PHASE_IN_REFERENCE[2028].description,
      price: 105,
      free_allocation: CBAM_PHASE_IN_REFERENCE[2028].free_allocation_remaining,
      default_markup: CBAM_PHASE_IN_REFERENCE[2028].default_markup
    },
    { 
      year: 2030,
      phase: CBAM_PHASE_IN_REFERENCE[2030].description,
      price: 125,
      free_allocation: CBAM_PHASE_IN_REFERENCE[2030].free_allocation_remaining,
      default_markup: CBAM_PHASE_IN_REFERENCE[2030].default_markup
    },
    { 
      year: 2034,
      phase: CBAM_PHASE_IN_REFERENCE[2034].description,
      price: 140,
      free_allocation: CBAM_PHASE_IN_REFERENCE[2034].free_allocation_remaining,
      default_markup: CBAM_PHASE_IN_REFERENCE[2034].default_markup
    }
  ];

  const calculateCBAMCosts = async () => {
    if (!inputs.cn_code || !inputs.quantity_tonnes) {
      toast.error('Please enter CN Code and Quantity');
      return;
    }
    
    if (!inputs.country_of_origin) {
      toast.error('Please select Country of Origin');
      return;
    }

    setIsCalculating(true);
    
    // Track usage
    try {
      await UsageMeteringService.trackCBAMCalculation({
        entryId: null,
        entriesCount: 1
      });
    } catch (e) {
      console.warn('Usage tracking failed:', e);
    }

    try {
      // Use backend calculation engine for complex goods
      const entryData = {
        cn_code: inputs.cn_code,
        quantity: parseFloat(inputs.quantity_tonnes),
        direct_emissions_specific: parseFloat(inputs.emissions_intensity) || 0,
        indirect_emissions_specific: 0,
        country_of_origin: inputs.country_of_origin,
        production_route: inputs.production_route,
        calculation_method: inputs.emissions_intensity ? 'EU_method' : 'Default_values',
        reporting_period_year: 2026,
        aggregated_goods_category: 'Iron & Steel' // Default
      };

      console.log('[Calculator] Sending to backend:', entryData);
      const calculation = await CBAMCalculationService.calculateEntry(entryData);
      console.log('[Calculator] Backend response:', calculation);
      
      // Use the actual breakdown values from backend
      const totalEmissionsCalc = parseFloat(calculation.breakdown?.total_embedded || calculation.breakdown?.total || 0);
      const intensity = totalEmissionsCalc / parseFloat(inputs.quantity_tonnes);
      const benchmark = cnBenchmarks[inputs.cn_code];
      
      const yearlyResults = euaPriceForecast.map(forecast => {
        const totalEmissions = totalEmissionsCalc;
        
        // CORRECT: Use benchmark-based free allocation if available
        const benchmarkValue = calculation.calculated_entry?.cbam_benchmark || calculation.breakdown?.benchmark_used || 1.5;
        const quantity = parseFloat(inputs.quantity_tonnes) || 1;
        const cbamFactor = forecast.free_allocation ? (1 - forecast.free_allocation) : 0.025;
        
        const freeAllocationFull = benchmarkValue * quantity;
        const freeAllocationAdjusted = freeAllocationFull * (forecast.free_allocation || 0.975);
        const chargeableEmissions = Math.max(0, totalEmissions - freeAllocationAdjusted);
        
        const certificates = Math.ceil(chargeableEmissions);
        const cbamCost = certificates * (forecast.price || 0);
        
        return {
          year: forecast.year || 2026,
          phase: forecast.phase || '',
          euaPrice: (forecast.price || 0).toFixed(2),
          freeAllocation: ((forecast.free_allocation || 0) * 100).toFixed(1),
          cbamFactor: (cbamFactor * 100).toFixed(1),
          totalEmissions: totalEmissions.toFixed(2),
          freeAllocationAdjusted: freeAllocationAdjusted.toFixed(2),
          chargeableEmissions: chargeableEmissions.toFixed(2),
          cbamCost: cbamCost.toFixed(2),
          certificates: certificates,
          costPerTonne: parseFloat(inputs.quantity_tonnes) > 0 ? (cbamCost / parseFloat(inputs.quantity_tonnes)).toFixed(2) : '0.00',
          markupApplied: calculation.breakdown.markup_applied || 0
        };
      });

      const calcMethod = calculation.calculated_entry?.calculation_method || 'Default_values';
      const markupPct = calculation.breakdown?.markup_applied || calculation.calculated_entry?.mark_up_percentage_applied || 0;
      
      setResults({
        yearly: yearlyResults,
        current: yearlyResults[0],
        intensity: intensity.toFixed(2),
        isDefaultUsed: calcMethod !== 'EU_method',
        benchmarkName: benchmark?.name || calculation.calculated_entry?.product_name || 'CBAM Good',
        category: benchmark?.category || calculation.calculated_entry?.aggregated_goods_category || 'Iron & Steel',
        productionRoute: inputs.production_route || calculation.calculated_entry?.production_route,
        markupApplied: markupPct,
        precursors: calculation.calculated_entry?.precursors_used || [],
        defaultReason: calcMethod !== 'EU_method'
          ? `Using default value +${markupPct}% mark-up per C(2025) 8552`
          : 'Using actual emissions per C(2025) 8151 Chapter 2',
        complianceNote: `Reporting period = calendar year 2026 (C(2025) 8151 Art. 7)`
      });
      
      toast.success(`Calculated: ${totalEmissionsCalc.toFixed(2)} tCO2e`);
      
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error(`Calculation failed: ${error.message || 'Unknown error'}`);
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSupplierSelect = (supplierId) => {
    if (!supplierId) {
      setInputs({...inputs, supplier_id: '', emissions_intensity: ''});
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setInputs({
        ...inputs,
        supplier_id: supplierId,
        country_of_origin: supplier.country || '',
        emissions_intensity: ''
      });
    }
  };

  const handleCNCodeChange = (cnCode, description) => {
    const benchmark = cnBenchmarks[cnCode];
    setInputs({
      ...inputs,
      cn_code: cnCode || '',
      product_name: description || benchmark?.name || '',
      emissions_intensity: ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">Instant Calculator</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculate CBAM costs instantly
            </p>
          </div>
          <Button onClick={() => setShowImportWizard(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm">
            <Plus className="w-3.5 h-3.5 mr-2" />
            Import
          </Button>
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-700 font-medium">Live EU ETS Prices</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Quarterly averages</p>
          </div>
          <div className="flex gap-4">
            {priceHistory.slice(0, 4).map((price, idx) => (
              <div key={idx} className="text-center">
                <p className="text-[10px] text-slate-500">{price.quarter || `Q${idx + 1}`}</p>
                <p className="text-xl font-light text-slate-900">€{price.cbam_certificate_price?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-1">
          <div className="border-b border-slate-200/60 px-5 py-4">
            <h3 className="text-sm font-medium text-slate-900">Transaction Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <CNCodeAutocomplete
                value={inputs.cn_code}
                onChange={(code, description) => {
                  setInputs({
                    ...inputs,
                    cn_code: code || '',
                    product_name: (description && typeof description === 'string') ? description : inputs.product_name,
                    emissions_intensity: ''
                  });
                }}
                label="CN Code"
                required
                placeholder="Type to search CN codes..."
              />
              {inputs.cn_code && cnBenchmarks[inputs.cn_code] && (
                <p className="text-xs text-[#86b027] mt-1.5">
                  ✓ EU Benchmark: {cnBenchmarks[inputs.cn_code]?.benchmark} tCO2/t
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Non-EU Supplier (optional)</Label>
              <Select value={inputs.supplier_id || ''} onValueChange={handleSupplierSelect}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Use EU benchmark or select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Use EU Benchmark</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.legal_name || supplier.trade_name} ({supplier.country || 'Unknown'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Quantity (tonnes) *</Label>
              <Input
                type="number"
                value={inputs.quantity_tonnes}
                onChange={(e) => setInputs({...inputs, quantity_tonnes: e.target.value})}
                placeholder="e.g., 1000"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Production Route (Optional)</Label>
              <Select 
                value={inputs.production_route} 
                onValueChange={(value) => setInputs({...inputs, production_route: value, emissions_intensity: ''})}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Use default or select route..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Use Default Values</SelectItem>
                  <SelectItem value="steel_hrc_bf_bof">Steel HRC - BF-BOF (1.370)</SelectItem>
                  <SelectItem value="steel_hrc_dri_eaf">Steel HRC - DRI-EAF (0.481)</SelectItem>
                  <SelectItem value="steel_hrc_scrap_eaf">Steel HRC - Scrap-EAF (0.072)</SelectItem>
                  <SelectItem value="steel_slab_bf_bof">Steel Slab - BF-BOF (1.530)</SelectItem>
                  <SelectItem value="steel_slab_dri_eaf">Steel Slab - DRI-EAF (0.500)</SelectItem>
                  <SelectItem value="steel_slab_scrap_eaf">Steel Slab - Scrap-EAF (0.080)</SelectItem>
                  <SelectItem value="aluminium_primary">Aluminium - Primary (8.50)</SelectItem>
                  <SelectItem value="aluminium_secondary">Aluminium - Secondary (0.45)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Emissions Intensity (tCO2/t)</Label>
              <Input
                type="number"
                step="0.01"
                value={inputs.emissions_intensity}
                onChange={(e) => setInputs({...inputs, emissions_intensity: e.target.value})}
                placeholder={inputs.production_route ? `Auto: ${CBAM_2026_BENCHMARKS[inputs.production_route]?.value || 'N/A'}` : 'Select route or enter manually'}
                className="mt-1.5 bg-slate-50"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Country of Origin (Non-EU) *</Label>
              <Select 
                value={inputs.country_of_origin} 
                onValueChange={(value) => setInputs({...inputs, country_of_origin: value})}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select non-EU country..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_NON_EU_COUNTRIES.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={calculateCBAMCosts}
              disabled={!inputs.cn_code || !inputs.quantity_tonnes || isCalculating}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-6 h-10 text-sm shadow-sm"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Cost'}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lg:col-span-2">
          {!results ? (
            <div className="py-20 text-center">
              <Zap className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="text-xs text-slate-400">Enter details to calculate</p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200/60 px-5 py-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900">Results</h3>
                  {/* Export functionality removed - not implemented */}
                </div>
              </div>
              <div className="p-5">
                <Tabs defaultValue="current" className="space-y-6">
                  <TabsList className="bg-slate-50 border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start">
                    <TabsTrigger value="current" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">2026 Costs</TabsTrigger>
                    <TabsTrigger value="forecast" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Multi-Year Forecast</TabsTrigger>
                    <TabsTrigger value="scenarios" className="rounded-none border-b-3 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-6 py-3 text-sm font-medium text-slate-700 transition-all">Scenarios</TabsTrigger>
                  </TabsList>

                  <TabsContent value="current" className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-slate-900 mb-1">Calculation per C(2025) 8151 & 8552:</p>
                      <p className="text-xs text-slate-600">
                        Total Emissions: {inputs.quantity_tonnes}t × {results.intensity} tCO2/t {results.markupApplied > 0 ? `(+${results.markupApplied}% markup)` : ''} = {results.current.totalEmissions} tCO2e<br/>
                        Free Allocation: {results.current.freeAllocationAdjusted} tCO2e ({results.current.freeAllocation}% of benchmark)<br/>
                        Chargeable: {results.current.chargeableEmissions} tCO2e<br/>
                        Certificates: {results.current.certificates} units (1:1 ratio)<br/>
                        Cost: {results.current.certificates} × €{results.current.euaPrice} = <strong>€{results.current.cbamCost}</strong>
                      </p>
                      <p className="text-xs text-slate-500 mt-2 italic">{results.complianceNote}</p>
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        ⚠️ CBAM factor ({results.current.cbamFactor}%) applied to benchmark only, not to final obligation
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">2026 CBAM Cost</p>
                        <p className="text-5xl font-light text-slate-900">€{results.current.cbamCost}</p>
                        <p className="text-xs text-slate-400 mt-3">€{results.current.costPerTonne} per tonne</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Certificates Required</p>
                        <p className="text-5xl font-light text-slate-900">{results.current.certificates}</p>
                        <p className="text-xs text-slate-400 mt-3">tCO2e (1:1 ratio)</p>
                      </div>
                    </div>

                    <div className={`p-4 border border-slate-200 rounded-lg ${results.isDefaultUsed ? 'bg-slate-50' : 'bg-blue-50'}`}>
                      <p className="font-medium text-slate-900 mb-1 text-sm">
                        {results.isDefaultUsed ? 'Using EU Default Benchmark' : 'Using Verified Data'}
                      </p>
                      <p className="text-xs text-slate-600">{results.defaultReason}</p>
                      {results.isDefaultUsed && (
                        <p className="text-xs text-slate-500 mt-2">
                          Request actual emissions from supplier to reduce costs by 20-40%
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="forecast" className="space-y-6">
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={results.yearly}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="cbamCost" stroke="#86b027" strokeWidth={3} name="CBAM Cost (€)" />
                          <Line type="monotone" dataKey="euaPrice" stroke="#02a1e8" strokeWidth={2} name="EUA Price (€)" strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      {results.yearly.map((year, idx) => (
                        <div key={idx} className="p-5 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-light text-slate-900 text-2xl">{year.year}</span>
                              <Badge variant="outline" className="text-xs border-slate-200">{year.phase}</Badge>
                            </div>
                            <span className="font-light text-slate-900 text-3xl">€{year.cbamCost}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-slate-500">EUA Price</span>
                              <div className="font-medium text-slate-900 mt-1">€{year.euaPrice}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Chargeable</span>
                              <div className="font-medium text-slate-900 mt-1">{year.chargeableEmissions} tCO2e</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Certificates</span>
                              <div className="font-medium text-slate-900 mt-1">{year.certificates}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Per Tonne</span>
                              <div className="font-medium text-slate-900 mt-1">€{year.costPerTonne}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="scenarios">
                    <CBAMSupplierCostComparator />
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </div>
      </div>

      <CBAMSmartImportWizard isOpen={showImportWizard} onClose={() => setShowImportWizard(false)} />
    </div>
  );
}