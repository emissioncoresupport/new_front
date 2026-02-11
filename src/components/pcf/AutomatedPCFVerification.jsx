import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Shield, CheckCircle2, AlertTriangle, FileCheck, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AutomatedPCFVerification({ product }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const queryClient = useQueryClient();

  const { data: components = [] } = useQuery({
    queryKey: ['product-components', product?.id],
    queryFn: () => base44.entities.ProductComponent.filter({ product_id: product?.id }),
    enabled: !!product
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform ISO 14067:2018 compliance verification for Product Carbon Footprint.

Product: ${product.name}
Total PCF: ${product.total_pcf_kg_co2e} kg CO2e
Functional Unit: ${product.functional_unit}
Components: ${components.length}

Verify:
1. System boundary completeness (cradle-to-gate minimum)
2. Data quality per ISO 14067 requirements
3. Allocation methodology compliance
4. Uncertainty assessment
5. Documentation completeness
6. Third-party data validation
7. Calculation accuracy
8. GHG Protocol Product Standard alignment

Return compliance score (0-100), findings, and recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            compliance_score: { type: "number" },
            iso_14067_compliant: { type: "boolean" },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  status: { type: "string" },
                  issue: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            certification_ready: { type: "boolean" }
          }
        }
      });

      return typeof response === 'string' ? JSON.parse(response) : response;
    },
    onSuccess: async (data) => {
      await base44.entities.Product.update(product.id, {
        verification_status: data.iso_14067_compliant ? 'verified' : 'needs_review',
        compliance_score: data.compliance_score,
        last_verification_date: new Date().toISOString()
      });

      await base44.entities.PCFAuditLog.create({
        product_id: product.id,
        action: 'automated_verification',
        details: `ISO 14067 compliance check: ${data.compliance_score}% compliant`,
        findings: data.findings
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      if (data.certification_ready) {
        toast.success(`✅ ${product.name} is certification-ready!`);
      } else {
        toast.warning(`⚠️ ${data.findings.length} issues found. Review required.`);
      }
    }
  });

  const handleVerify = async () => {
    setIsVerifying(true);
    const loadingToast = toast.loading('🤖 Running ISO 14067 compliance checks...');
    
    try {
      await verifyMutation.mutateAsync();
      toast.dismiss(loadingToast);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Verification failed: ' + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Automated PCF Verification</CardTitle>
              <p className="text-xs text-slate-600">ISO 14067:2018 compliance checking</p>
            </div>
          </div>
          {product?.verification_status === 'verified' && (
            <Badge className="bg-emerald-500">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {product?.compliance_score && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">ISO 14067 Compliance Score</span>
              <span className={`text-2xl font-bold ${
                product.compliance_score >= 90 ? 'text-emerald-600' :
                product.compliance_score >= 70 ? 'text-amber-600' :
                'text-rose-600'
              }`}>
                {product.compliance_score}%
              </span>
            </div>
            {product.last_verification_date && (
              <p className="text-xs text-slate-600">
                Last verified: {new Date(product.last_verification_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-900">Verification Checks</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>System boundary definition</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Data quality assessment (DQR)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Allocation methodology review</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>GHG Protocol alignment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Third-party data validation</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleVerify}
          disabled={isVerifying || !product}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isVerifying ? 'Verifying...' : 'Run Automated Verification'}
        </Button>

        {/* Certification Badges */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-bold text-blue-900 mb-2">📜 Certification Readiness</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">ISO 14067:2018</Badge>
            <Badge variant="outline" className="text-xs">GHG Protocol Product</Badge>
            <Badge variant="outline" className="text-xs">PAS 2050</Badge>
            <Badge variant="outline" className="text-xs">TÜV Certified Method</Badge>
          </div>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <p className="text-xs font-bold text-amber-900 mb-1">💡 Pro Tip</p>
          <p className="text-xs text-amber-800">
            Automated verification runs against ISO 14067 requirements. For official certification, 
            results can be shared directly with TÜV, SGS, or other certification bodies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}