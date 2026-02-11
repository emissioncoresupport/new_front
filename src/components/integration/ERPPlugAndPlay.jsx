import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle2, AlertCircle, Settings } from "lucide-react";

/**
 * ERP Plug-and-Play Integration Hub
 * Pre-built connectors for major ERP systems
 */

const ERP_CONNECTORS = [
  {
    name: 'SAP S/4HANA',
    logo: '🔷',
    status: 'active',
    modules: ['Material Master', 'Purchase Orders', 'Suppliers', 'BOM'],
    last_sync: '2 hours ago',
    records_synced: 15234
  },
  {
    name: 'Oracle NetSuite',
    logo: '🟠',
    status: 'active',
    modules: ['Items', 'Vendors', 'Assemblies', 'Transactions'],
    last_sync: '30 minutes ago',
    records_synced: 8721
  },
  {
    name: 'Microsoft Dynamics 365',
    logo: '🔵',
    status: 'configured',
    modules: ['Products', 'Suppliers', 'Production Orders'],
    last_sync: 'Not synced yet',
    records_synced: 0
  },
  {
    name: 'Infor M3',
    logo: '🟣',
    status: 'not_configured',
    modules: ['Items', 'Suppliers', 'Manufacturing Orders'],
    last_sync: null,
    records_synced: 0
  }
];

export default function ERPPlugAndPlay() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">ERP Integrations</h2>
          <p className="text-sm text-slate-600">Connect your ERP system for automated data sync</p>
        </div>
        <Button className="bg-[#86b027] hover:bg-[#769c22]">
          <Zap className="w-4 h-4 mr-2" />
          Add New ERP
        </Button>
      </div>

      <div className="grid gap-4">
        {ERP_CONNECTORS.map((erp, i) => (
          <Card key={i} className="border-l-4" style={{
            borderLeftColor: erp.status === 'active' ? '#10b981' :
                            erp.status === 'configured' ? '#f59e0b' : '#94a3b8'
          }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{erp.logo}</div>
                  <div>
                    <h3 className="font-bold text-lg">{erp.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={
                        erp.status === 'active' ? 'bg-emerald-500' :
                        erp.status === 'configured' ? 'bg-amber-500' : 'bg-slate-400'
                      }>
                        {erp.status === 'active' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                         erp.status === 'configured' ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                        {erp.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {erp.last_sync && (
                        <span className="text-xs text-slate-500">Last sync: {erp.last_sync}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Synced Modules:</p>
                  <div className="flex flex-wrap gap-1">
                    {erp.modules.map((mod, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{mod}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Records Synced:</p>
                  <p className="text-2xl font-bold text-[#86b027]">
                    {erp.records_synced.toLocaleString()}
                  </p>
                </div>
              </div>

              {erp.status === 'active' && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-800">
                    ✓ Auto-sync enabled • Updates every 15 minutes • Last batch: {erp.records_synced} records
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}