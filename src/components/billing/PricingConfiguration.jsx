import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Save, Settings } from "lucide-react";
import { toast } from "sonner";

export default function PricingConfiguration() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState(null);

  const { data: pricingPlans = [] } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: () => base44.entities.PricingPlan.list()
  });

  const savePricingMutation = useMutation({
    mutationFn: (plan) => {
      if (plan.id) {
        return base44.entities.PricingPlan.update(plan.id, plan);
      }
      return base44.entities.PricingPlan.create(plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-plans'] });
      toast.success('Pricing plan saved');
      setEditingPlan(null);
    }
  });

  const createDefaultPlan = () => {
    const defaultPlan = {
      plan_name: 'Default Plan',
      module: 'ALL',
      is_default: true,
      pricing: {
        AI_LLM_CALL: { per_1k_tokens: 0.002 },
        AI_IMAGE_GENERATION: { per_image: 0.05 },
        AI_DOCUMENT_ANALYSIS: { per_document: 0.10 },
        CBAM_CALCULATION: { per_entry: 0.01 },
        CBAM_REPORT_GENERATION: { per_report: 2.00 },
        CBAM_DDS_SUBMISSION: { per_submission: 5.00 },
        EUDR_DDS_SUBMISSION: { per_submission: 5.00 },
        EUDR_RISK_ASSESSMENT: { per_assessment: 0.50 },
        EUDR_SATELLITE_ANALYSIS: { per_analysis: 2.00 },
        LCA_CALCULATION: { per_calculation: 0.50 },
        PCF_CALCULATION: { per_product: 0.25 },
        LOGISTICS_EMISSION_CALC: { per_shipment: 0.05 },
        SUPPLIER_ONBOARDING: { per_supplier: 1.00 },
        SUPPLIER_RISK_SCAN: { per_scan: 0.50 },
        DATA_IMPORT: { per_100_records: 0.50 },
        REPORT_GENERATION: { per_report: 1.00 },
        VERIFICATION_REQUEST: { per_request: 5.00 },
        BLOCKCHAIN_TRANSACTION: { per_transaction: 0.10 }
      },
      monthly_minimum: 50.00,
      free_tier: {},
      currency: 'EUR',
      active: true
    };
    savePricingMutation.mutate(defaultPlan);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pricing Plans</CardTitle>
            <Button onClick={createDefaultPlan} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Default Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pricingPlans.map(plan => (
              <Card key={plan.id} className="border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{plan.plan_name}</h3>
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-blue-100 text-blue-700">{plan.module}</Badge>
                        {plan.is_default && <Badge className="bg-emerald-100 text-emerald-700">Default</Badge>}
                        {plan.active && <Badge className="bg-slate-100 text-slate-700">Active</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        Monthly minimum: €{plan.monthly_minimum || 0}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    {Object.entries(plan.pricing || {}).map(([op, price]) => (
                      <div key={op} className="p-2 bg-slate-50 rounded">
                        <p className="text-slate-600">{op.replace(/_/g, ' ')}</p>
                        <p className="font-semibold text-blue-600">
                          €{Object.values(price)[0]?.toFixed(4) || '0.0000'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-slate-700">
            <strong>Note:</strong> Pricing changes will apply to new usage logs. Configure per-tenant pricing
            by creating plans with specific tenant_id values. The default plan applies when no tenant-specific pricing exists.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}