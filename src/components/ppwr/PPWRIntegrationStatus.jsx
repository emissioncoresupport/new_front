import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Link2, Database, Shield, Zap, QrCode } from "lucide-react";

export default function PPWRIntegrationStatus() {
  const integrations = [
    {
      name: 'SupplyLens SKU/BOM Sync',
      status: 'active',
      description: 'Auto-sync material data, suppliers, and BOM composition',
      icon: Database,
      color: 'text-[#86b027]'
    },
    {
      name: 'DPP Auto-Generation',
      status: 'active',
      description: 'Digital Product Passports created automatically',
      icon: QrCode,
      color: 'text-[#02a1e8]'
    },
    {
      name: 'Blockchain Audit Trail',
      status: 'active',
      description: 'Immutable compliance and change logging',
      icon: Shield,
      color: 'text-purple-600'
    },
    {
      name: 'Real-time Compliance Monitor',
      status: 'active',
      description: 'Automated checks on every packaging change',
      icon: Zap,
      color: 'text-emerald-600'
    },
    {
      name: 'Supplier Declaration Workflow',
      status: 'active',
      description: 'Auto-request PCR declarations from suppliers',
      icon: Link2,
      color: 'text-amber-600'
    }
  ];

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Link2 className="w-5 h-5" />
          Integration Architecture Status
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          All modules connected - no silos
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {integrations.map((integration, idx) => {
            const Icon = integration.icon;
            return (
              <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-slate-50 ${integration.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{integration.name}</h4>
                        <Badge className="bg-emerald-500 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {integration.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{integration.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-900">
            <strong>✓ Unified Architecture:</strong> All services connected via PPWRMasterOrchestrator. 
            Every packaging change triggers blockchain logging, compliance checks, circularity scoring, 
            DPP generation, and supplier workflows automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}