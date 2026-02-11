import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { isEUCountry } from './constants';

export default function CBAMSupplierCostComparator() {
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [quantity, setQuantity] = useState(1000);
  const [cnCode, setCnCode] = useState('72031000');
  
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Filter to only non-EU suppliers (CBAM only applies to non-EU imports)
  const nonEUSuppliers = allSuppliers.filter(s => !isEUCountry(s.country));
  const suppliers = nonEUSuppliers;

  const { data: supplierPCFs = [] } = useQuery({
    queryKey: ['supplier-pcfs'],
    queryFn: () => base44.entities.SupplierPCF.list()
  });

  const euaPrice = 80; // 2026 estimate
  const cbamRate = 0.025; // 2.5% in 2026
  const defaultIntensity = 2.1; // EU benchmark for steel

  const calculateSupplierCost = (supplier) => {
    // Find supplier's actual emissions data
    const pcfData = supplierPCFs.find(p => p.supplier_id === supplier.id);
    const intensity = pcfData?.emissions_intensity || defaultIntensity;
    const isDefault = !pcfData?.emissions_intensity;
    
    const totalEmissions = quantity * intensity;
    const cbamCost = totalEmissions * euaPrice * cbamRate;
    const costPerTonne = cbamCost / quantity;

    return {
      supplier_name: supplier.company_name,
      country: supplier.country || 'Unknown',
      intensity: intensity,
      isDefault: isDefault,
      totalEmissions: totalEmissions.toFixed(2),
      cbamCost: cbamCost.toFixed(2),
      costPerTonne: costPerTonne.toFixed(2),
      certificates: Math.ceil(totalEmissions * cbamRate)
    };
  };

  const comparisonData = selectedSuppliers
    .map(id => suppliers.find(s => s.id === id))
    .filter(Boolean)
    .map(calculateSupplierCost)
    .sort((a, b) => parseFloat(a.cbamCost) - parseFloat(b.cbamCost));

  const bestOption = comparisonData[0];
  const worstOption = comparisonData[comparisonData.length - 1];
  const potentialSavings = worstOption && bestOption 
    ? (parseFloat(worstOption.cbamCost) - parseFloat(bestOption.cbamCost)).toFixed(2)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Users className="w-7 h-7 text-[#86b027]" />
          Supplier CBAM Cost Comparison
        </h2>
        <p className="text-slate-500 mt-1">
          Compare CBAM costs across non-EU suppliers. CBAM only applies to imports from outside the EU.
        </p>
      </div>

      {/* EU Exclusion Notice */}
      {allSuppliers.length > nonEUSuppliers.length && (
        <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#02a1e8] mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900 mb-1">EU Suppliers Excluded</p>
                <p className="text-slate-600">
                  CBAM does not apply to imports from EU member states. Only showing {nonEUSuppliers.length} non-EU suppliers. 
                  ({allSuppliers.length - nonEUSuppliers.length} EU suppliers hidden)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Controls */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Select Suppliers to Compare</Label>
              <Select 
                onValueChange={(id) => {
                  if (!selectedSuppliers.includes(id)) {
                    setSelectedSuppliers([...selectedSuppliers, id]);
                  }
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Add supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {nonEUSuppliers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No non-EU suppliers configured
                    </SelectItem>
                  ) : (
                    nonEUSuppliers
                      .filter(s => !selectedSuppliers.includes(s.id))
                      .map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.company_name} ({supplier.country || 'Unknown'})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSuppliers.map(id => {
                  const supplier = suppliers.find(s => s.id === id);
                  return supplier ? (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {supplier.company_name}
                      <button 
                        onClick={() => setSelectedSuppliers(selectedSuppliers.filter(s => s !== id))}
                        className="ml-1 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
            <div>
              <Label>Quantity (tonnes)</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div>
              <Label>CN Code</Label>
              <Select value={cnCode} onValueChange={setCnCode}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="72031000">72031000 - Ferrous</SelectItem>
                  <SelectItem value="76011000">76011000 - Aluminium</SelectItem>
                  <SelectItem value="31021000">31021000 - Fertilizers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {comparisonData.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 mb-2">Select suppliers above to compare CBAM costs</p>
            <p className="text-xs text-slate-400">Instantly see cost differences and procurement opportunities</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Savings Alert */}
          {comparisonData.length > 1 && potentialSavings > 0 && (
            <Card className="border-[#86b027]/20 bg-[#86b027]/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#86b027]/20 rounded-full">
                    <TrendingDown className="w-6 h-6 text-[#86b027]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">Potential Savings Identified</h3>
                    <p className="text-sm text-slate-700">
                      Switching from <strong>{worstOption.supplier_name}</strong> to <strong>{bestOption.supplier_name}</strong> could 
                      save <strong>€{potentialSavings}</strong> in CBAM costs ({quantity} tonnes).
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-[#86b027]">
                      <span>Cost difference: €{worstOption.costPerTonne} → €{bestOption.costPerTonne} per tonne</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison Chart */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Supplier Cost Comparison (2026)</CardTitle>
              <p className="text-sm text-slate-500">Total CBAM cost for {quantity} tonnes</p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis type="category" dataKey="supplier_name" stroke="#94a3b8" fontSize={11} width={150} />
                    <Tooltip />
                    <Bar dataKey="cbamCost" fill="#86b027" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Comparison Table */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparisonData.map((supplier, idx) => (
                  <div 
                  key={idx}
                  className={`p-5 rounded-lg border-2 transition-all ${
                  idx === 0 
                    ? 'border-[#86b027]/30 bg-[#86b027]/5' 
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {idx === 0 && (
                          <Badge className="bg-[#86b027] text-white border-0">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Best Option
                          </Badge>
                        )}
                        <h4 className="font-bold text-slate-900">{supplier.supplier_name}</h4>
                        <Badge variant="outline">{supplier.country}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#86b027]">€{supplier.cbamCost}</p>
                        <p className="text-xs text-slate-500">€{supplier.costPerTonne} per tonne</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Intensity</p>
                        <p className="font-bold text-slate-900">
                          {supplier.intensity} tCO2/t
                          {supplier.isDefault && (
                            <span className="ml-2 text-amber-600 text-xs">(default)</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Total Emissions</p>
                        <p className="font-bold text-slate-900">{supplier.totalEmissions} tCO2</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Certificates</p>
                        <p className="font-bold text-slate-900">{supplier.certificates}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Data Quality</p>
                        {supplier.isDefault ? (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-300">
                            Using Defaults
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30">
                            Verified Data
                          </Badge>
                        )}
                      </div>
                    </div>

                    {supplier.isDefault && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5" />
                        <p className="text-xs text-slate-600">
                          Missing supplier emissions data. Using EU default benchmark. Request actual data to reduce costs.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Procurement Recommendation */}
          {comparisonData.length > 1 && (
            <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-[#86b027]" />
                  Procurement Recommendation
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 mb-2"><strong>Optimal Choice:</strong> {bestOption.supplier_name}</p>
                    <p className="text-slate-600 mb-2"><strong>CBAM Impact:</strong> €{bestOption.costPerTonne}/tonne</p>
                    <p className="text-slate-600"><strong>Data Quality:</strong> {bestOption.isDefault ? '⚠️ Using defaults - request actual data' : '✓ Verified supplier data'}</p>
                  </div>
                  <div className="p-4 bg-[#86b027]/10 rounded-lg border border-[#86b027]/20">
                    <p className="text-xs text-slate-600 font-semibold mb-1">Estimated Annual Savings</p>
                    <p className="text-2xl font-bold text-[#86b027]">€{potentialSavings}</p>
                    <p className="text-xs text-slate-500 mt-1">Based on {quantity} tonnes/shipment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}