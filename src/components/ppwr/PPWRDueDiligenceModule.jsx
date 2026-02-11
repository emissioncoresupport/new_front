import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Shield, CheckCircle2, AlertTriangle, FileCheck, MapPin, Factory } from "lucide-react";

export default function PPWRDueDiligenceModule() {
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const dueDiligenceStats = {
    total: packaging.length,
    completed: packaging.filter(p => p.due_diligence_completed).length,
    pending: packaging.filter(p => !p.due_diligence_completed).length,
    highRisk: packaging.filter(p => !p.due_diligence_completed && p.material_category === 'Plastic').length
  };

  const performDueDiligenceMutation = useMutation({
    mutationFn: async (packagingId) => {
      const pkg = packaging.find(p => p.id === packagingId);
      
      const dueDiligencePrompt = `Perform PPWR Article 12 supply chain due diligence assessment for:
      
Packaging: ${pkg.packaging_name}
Material: ${pkg.material_category}
Manufacturer: ${pkg.manufacturer_id}

Check:
1. Manufacturer compliance with PPWR requirements
2. Recycled content certification validity
3. Supply chain transparency
4. Material origin verification
5. Substance restrictions compliance (PFAS, bisphenols)
6. Recyclability design criteria

Return JSON with findings and recommendations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: dueDiligencePrompt,
        response_json_schema: {
          type: "object",
          properties: {
            compliant: { type: "boolean" },
            risk_level: { type: "string" },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      await base44.entities.PPWRPackaging.update(packagingId, {
        due_diligence_completed: true,
        conformity_assessment: {
          assessed: true,
          assessment_date: new Date().toISOString().split('T')[0],
          assessed_by: (await base44.auth.me()).email,
          conforms: result.compliant
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('Due diligence completed');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#86b027]/10">
              <Shield className="w-6 h-6 text-[#86b027]" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Supply Chain Due Diligence</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Article 12 compliance - Verify material origin, manufacturer compliance, and supply chain transparency
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
                <p className="text-xs text-slate-500 uppercase font-bold">Total Items</p>
                <h3 className="text-3xl font-bold text-slate-900">{dueDiligenceStats.total}</h3>
              </div>
              <FileCheck className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Completed</p>
                <h3 className="text-3xl font-bold text-[#86b027]">{dueDiligenceStats.completed}</h3>
              </div>
              <CheckCircle2 className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Pending</p>
                <h3 className="text-3xl font-bold text-amber-600">{dueDiligenceStats.pending}</h3>
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-700 uppercase font-bold">High Risk</p>
                <h3 className="text-3xl font-bold text-rose-600">{dueDiligenceStats.highRisk}</h3>
              </div>
              <Shield className="w-10 h-10 text-rose-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong>Article 12 Requirements:</strong> Economic operators must implement supply chain due diligence to verify
          material origin, recycled content certification, manufacturer compliance, and absence of restricted substances.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Packaging Items - Due Diligence Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packaging.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-4">
                  {pkg.due_diligence_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Factory className="w-3 h-3" />
                        {pkg.material_category}
                      </span>
                      {pkg.manufacturer_id && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {pkg.manufacturer_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {pkg.due_diligence_completed ? (
                  <Badge className="bg-[#86b027] text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => performDueDiligenceMutation.mutate(pkg.id)}
                    disabled={performDueDiligenceMutation.isPending}
                    className="bg-[#86b027] hover:bg-[#769c22]"
                  >
                    Run Due Diligence
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}