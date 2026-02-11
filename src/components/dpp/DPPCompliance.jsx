import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertTriangle, XCircle, FileText } from "lucide-react";

export default function DPPCompliance() {
  const { data: dppRecords = [] } = useQuery({
    queryKey: ['dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list()
  });

  // ESPR Compliance Requirements
  const requirements = [
    { 
      id: 'material_composition', 
      name: 'Material Composition Declaration', 
      description: 'List all materials with CAS numbers and percentages',
      mandatory: true
    },
    { 
      id: 'recyclability', 
      name: 'Recyclability Information', 
      description: 'Declare recyclability score and end-of-life instructions',
      mandatory: true
    },
    { 
      id: 'carbon_footprint', 
      name: 'Product Carbon Footprint', 
      description: 'Total lifecycle CO2e emissions',
      mandatory: false
    },
    { 
      id: 'repairability', 
      name: 'Repairability & Durability', 
      description: 'Expected lifetime and repairability index',
      mandatory: true
    },
    { 
      id: 'supply_chain', 
      name: 'Supply Chain Transparency', 
      description: 'Manufacturing location and key suppliers',
      mandatory: true
    }
  ];

  const checkCompliance = (dpp, requirementId) => {
    switch(requirementId) {
      case 'material_composition':
        return dpp.material_composition?.length > 0;
      case 'recyclability':
        return dpp.circularity_metrics?.recyclability_score > 0 && dpp.eol_instructions;
      case 'carbon_footprint':
        return dpp.sustainability_info?.carbon_footprint_kg > 0;
      case 'repairability':
        return dpp.circularity_metrics?.repairability_index > 0 && dpp.circularity_metrics?.expected_lifetime_years > 0;
      case 'supply_chain':
        return dpp.supply_chain_info?.suppliers?.length > 0;
      default:
        return false;
    }
  };

  const getComplianceStatus = (dpp) => {
    const mandatoryReqs = requirements.filter(r => r.mandatory);
    const passed = mandatoryReqs.filter(r => checkCompliance(dpp, r.id)).length;
    return {
      passed,
      total: mandatoryReqs.length,
      percentage: Math.round((passed / mandatoryReqs.length) * 100)
    };
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">ESPR Compliance Framework</h3>
              <p className="text-sm text-blue-800">
                The EU Ecodesign for Sustainable Products Regulation (ESPR) mandates Digital Product Passports 
                for transparency across product lifecycle. Ensure all mandatory data points are completed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dppRecords.map(dpp => {
          const status = getComplianceStatus(dpp);
          return (
            <Card key={dpp.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{dpp.general_info?.product_name || 'Unnamed Product'}</CardTitle>
                  <Badge className={
                    status.percentage === 100 ? 'bg-emerald-500' :
                    status.percentage >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                  }>
                    {status.percentage}% Compliant
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requirements.map(req => {
                    const isCompliant = checkCompliance(dpp, req.id);
                    return (
                      <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg border">
                        {isCompliant ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : req.mandatory ? (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{req.name}</p>
                          <p className="text-xs text-slate-500">{req.description}</p>
                          {req.mandatory && <span className="text-xs text-rose-600">Mandatory</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}