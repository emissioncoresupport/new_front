import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, TrendingDown, TrendingUp, DollarSign, Leaf, MapPin, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CompareSuppliers() {
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);

  const { data: installations = [] } = useQuery({
    queryKey: ['cbam-installations'],
    queryFn: () => base44.entities.CBAMInstallation.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  // Enrich installations with supplier data
  const enrichedInstallations = installations.map(inst => {
    const supplier = suppliers.find(s => s.id === inst.supplier_id);
    return {
      ...inst,
      supplierName: supplier?.legal_name || 'Unknown',
      country: inst.country || supplier?.country || 'Unknown',
      riskLevel: supplier?.risk_level || 'medium'
    };
  });

  const toggleSupplier = (instId) => {
    setSelectedSuppliers(prev => 
      prev.includes(instId) ? prev.filter(id => id !== instId) : [...prev, instId].slice(-4)
    );
  };

  const comparisonData = selectedSuppliers.map(id => {
  const inst = enrichedInstallations.find(i => i.id === id);
  return {
    name: inst?.supplierName?.substring(0, 20) || 'Unknown',
    emissions: inst?.emissions_intensity || 0,
    cost: (inst?.emissions_intensity || 0) * 85,
    verified: inst?.verification_status === 'verified'
  };
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-medium text-slate-900">Compare Suppliers</h2>
        <p className="text-xs text-slate-500 mt-0.5">Analyze CBAM cost impact</p>
      </div>

      {selectedSuppliers.length > 0 && (
        <>
          {/* Comparison Chart */}
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">Emissions & Cost Comparison</h3>
            </div>
            <div className="p-5">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="emissions" fill="#86b027" name="Emissions (tCO2e/t)" />
                    <Bar dataKey="cost" fill="#02a1e8" name="Cost per ton (€)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="border-b border-slate-200/60 px-5 py-4">
              <h3 className="text-sm font-medium text-slate-900">Detailed Analysis</h3>
            </div>
            <div className="p-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Emissions Intensity</TableHead>
                    <TableHead>Est. Cost per ton</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((sup, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{sup.name}</TableCell>
                      <TableCell>
                        {enrichedInstallations.find(i => i.supplierName?.substring(0, 20) === sup.name)?.country}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{(sup.emissions || 0).toFixed(2)} tCO2e/t</span>
                          {sup.emissions < 1 && <TrendingDown className="w-4 h-4 text-emerald-600" />}
                          {sup.emissions > 1.5 && <TrendingUp className="w-4 h-4 text-rose-600" />}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">€{(sup.cost || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {sup.verified ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {sup.emissions < 1 ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Preferred</Badge>
                        ) : sup.emissions > 1.5 ? (
                          <Badge className="bg-rose-100 text-rose-700">High Cost</Badge>
                        ) : (
                          <Badge variant="outline">Acceptable</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Supplier Selection */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="border-b border-slate-200/60 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-900">Select Suppliers to Compare (max 4)</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enrichedInstallations.map(inst => (
              <div 
                key={inst.id}
                onClick={() => toggleSupplier(inst.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSuppliers.includes(inst.id) 
                    ? 'border-[#86b027] bg-[#86b027]/5' 
                    : 'border-slate-200 hover:border-[#86b027]/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900">{inst.supplierName}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {inst.country}
                    </p>
                  </div>
                  {selectedSuppliers.includes(inst.id) && (
                    <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {inst.production_technology || 'Standard'}
                  </Badge>
                  {inst.verification_status === 'verified' && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Verified</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}