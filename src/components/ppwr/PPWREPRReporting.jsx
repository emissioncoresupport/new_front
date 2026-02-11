import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Euro, FileText, Download, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PPWREPRReporting() {
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const eprRegisteredPackaging = packaging.filter(p => p.epr_registered);

  const eprFeeRates = {
    'Plastic': 0.65,
    'Paper/Cardboard': 0.15,
    'Glass': 0.12,
    'Metal': 0.45,
    'Wood': 0.20,
    'Composite': 0.80
  };

  const calculateEPRFees = () => {
    return packaging.map(pkg => {
      const weight = pkg.total_weight_kg || 0;
      const rate = eprFeeRates[pkg.material_category] || 0.50;
      const fee = weight * rate;
      
      return {
        ...pkg,
        calculated_epr_fee: fee
      };
    }).reduce((acc, pkg) => {
      if (!acc[pkg.material_category]) {
        acc[pkg.material_category] = { material: pkg.material_category, totalFee: 0, weight: 0, items: 0 };
      }
      acc[pkg.material_category].totalFee += pkg.calculated_epr_fee;
      acc[pkg.material_category].weight += pkg.total_weight_kg || 0;
      acc[pkg.material_category].items += 1;
      return acc;
    }, {});
  };

  const eprByMaterial = Object.values(calculateEPRFees());
  const totalEPRFees = eprByMaterial.reduce((sum, m) => sum + m.totalFee, 0);

  const registerEPRMutation = useMutation({
    mutationFn: async ({ packagingId, schemeId }) => {
      await base44.entities.PPWRPackaging.update(packagingId, {
        epr_registered: true,
        epr_scheme_id: schemeId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('EPR registration updated');
    }
  });

  const generateEPRReportMutation = useMutation({
    mutationFn: async () => {
      const reportData = {
        year: reportYear,
        packaging_data: packaging.map(pkg => ({
          name: pkg.packaging_name,
          material: pkg.material_category,
          weight_kg: pkg.total_weight_kg,
          epr_fee: (pkg.total_weight_kg || 0) * (eprFeeRates[pkg.material_category] || 0.50),
          epr_registered: pkg.epr_registered,
          epr_scheme: pkg.epr_scheme_id
        })),
        summary: eprByMaterial,
        total_fees: totalEPRFees,
        compliance_status: eprRegisteredPackaging.length === packaging.length ? 'Compliant' : 'Pending'
      };

      const prompt = `Generate a comprehensive EPR (Extended Producer Responsibility) compliance report for ${reportYear}:

Data: ${JSON.stringify(reportData, null, 2)}

Include:
1. Executive Summary
2. EPR fees by material category
3. Total packaging weight and fees
4. Compliance status
5. Registration summary
6. Recommendations for optimization

Format as professional report.`;

      return await base44.integrations.Core.InvokeLLM({
        prompt
      });
    },
    onSuccess: (report) => {
      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EPR_Report_${reportYear}.txt`;
      a.click();
      toast.success('EPR report generated and downloaded');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#02a1e8]/20 bg-gradient-to-br from-[#02a1e8]/5 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#02a1e8]/10">
              <Euro className="w-6 h-6 text-[#02a1e8]" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Extended Producer Responsibility (EPR)</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Article 48 - Track obligations, fees, and generate compliance reports
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total EPR Fees</p>
                <h3 className="text-3xl font-bold text-slate-900">€{totalEPRFees.toFixed(2)}</h3>
                <p className="text-xs text-slate-500 mt-1">Annual estimate</p>
              </div>
              <Euro className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">Registered</p>
                <h3 className="text-3xl font-bold text-[#02a1e8]">{eprRegisteredPackaging.length}</h3>
                <p className="text-xs text-[#02a1e8]/70 mt-1">of {packaging.length} items</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Total Weight</p>
                <h3 className="text-3xl font-bold text-[#86b027]">
                  {eprByMaterial.reduce((sum, m) => sum + m.weight, 0).toFixed(0)}
                </h3>
                <p className="text-xs text-[#86b027]/70 mt-1">kg packaging</p>
              </div>
              <TrendingUp className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 uppercase font-bold">Avg Fee Rate</p>
                <h3 className="text-3xl font-bold text-purple-600">
                  €{packaging.length > 0 ? (totalEPRFees / eprByMaterial.reduce((sum, m) => sum + m.weight, 0)).toFixed(2) : '0.00'}
                </h3>
                <p className="text-xs text-purple-600 mt-1">per kg</p>
              </div>
              <FileText className="w-10 h-10 text-purple-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Euro className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong>Article 48 EPR:</strong> Producers must register with approved EPR schemes and pay fees based on packaging weight and material.
          Fees fund collection, sorting, and recycling infrastructure. Non-compliance penalties: €5,000-€50,000.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>EPR Fees by Material Category</CardTitle>
            <div className="flex items-center gap-2">
              <Label>Report Year:</Label>
              <Input
                type="number"
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="w-24"
              />
              <Button
                onClick={() => generateEPRReportMutation.mutate()}
                disabled={generateEPRReportMutation.isPending}
                className="bg-[#02a1e8] hover:bg-[#0189c9]"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={eprByMaterial}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="material" tick={{ fill: '#64748b' }} />
              <YAxis tick={{ fill: '#64748b' }} label={{ value: 'EPR Fee (€)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalFee" fill="#02a1e8" name="Total EPR Fee (€)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>EPR Fee Rates (€/kg)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(eprFeeRates).map(([material, rate]) => (
              <div key={material} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-900">{material}</span>
                  <Badge className="bg-[#02a1e8]">€{rate}/kg</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Packaging Items - EPR Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packaging.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                  <p className="text-sm text-slate-600">
                    {pkg.material_category} • {pkg.total_weight_kg} kg • 
                    EPR Fee: €{((pkg.total_weight_kg || 0) * (eprFeeRates[pkg.material_category] || 0.50)).toFixed(2)}
                  </p>
                </div>

                {pkg.epr_registered ? (
                  <div className="text-right">
                    <Badge className="bg-[#86b027] text-white mb-1">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                    {pkg.epr_scheme_id && (
                      <p className="text-xs text-slate-500">Scheme: {pkg.epr_scheme_id}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="EPR Scheme ID"
                      className="w-32"
                      id={`scheme-${pkg.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById(`scheme-${pkg.id}`);
                        registerEPRMutation.mutate({
                          packagingId: pkg.id,
                          schemeId: input.value
                        });
                      }}
                      className="bg-[#02a1e8] hover:bg-[#0189c9]"
                    >
                      Register
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}