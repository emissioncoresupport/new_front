import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Calculator, Layers, TrendingUp, Shield, Plug, Activity } from "lucide-react";
import CBAMInstantCalculator from './CBAMInstantCalculator';
import CBAMInventory from './CBAMInventory';
import CBAMComplexGoodsManager from './CBAMComplexGoodsManager';
import CBAMMarketIntelligence from './CBAMMarketIntelligence';
import CBAMQualityControl from './CBAMQualityControl';
import CBAMIntegrationHub from './CBAMIntegrationHub';
import CBAMSystemDiagnostics from './CBAMSystemDiagnostics';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * CBAM Data & Import Management Hub
 * Compliant with January 2026 regulations (C(2025) 8151, 8552, Reg 2023/956)
 * Scalable, integrable, and automated architecture
 */
export default function CBAMDataManagementHub({ entries = [] }) {
  const [activeTab, setActiveTab] = useState('inventory');
  
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium text-slate-900">CBAM Data & Import Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compliant with C(2025) 8151 & 8552 • Definitive Regime 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-full">
              <span className="text-xs font-medium text-slate-900">2026 Regime Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start overflow-x-auto">
          <TabsTrigger 
            value="inventory" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Goods & Imports
          </TabsTrigger>
          
          <TabsTrigger 
            value="calculator" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5 mr-1.5" />
            Calculator
          </TabsTrigger>
          
          <TabsTrigger 
            value="complex" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Complex Goods
          </TabsTrigger>
          
          <TabsTrigger 
            value="market" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Market Intelligence
          </TabsTrigger>
          
          <TabsTrigger 
            value="quality" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Quality Control
          </TabsTrigger>
          
          <TabsTrigger 
            value="integrations" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <Plug className="w-3.5 h-3.5 mr-1.5" />
            Integrations
          </TabsTrigger>
          
          <TabsTrigger 
            value="diagnostics" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all whitespace-nowrap"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="inventory" className="m-0">
          <CBAMInventory entries={entries} />
        </TabsContent>

        <TabsContent value="calculator" className="m-0">
          <CBAMInstantCalculator />
        </TabsContent>

        <TabsContent value="complex" className="m-0">
          <CBAMComplexGoodsManager />
        </TabsContent>

        <TabsContent value="market" className="m-0">
          <CBAMMarketIntelligence />
        </TabsContent>

        <TabsContent value="quality" className="m-0">
          <CBAMQualityControl entries={entries} />
        </TabsContent>

        <TabsContent value="integrations" className="m-0">
          <CBAMIntegrationHub />
        </TabsContent>

        <TabsContent value="diagnostics" className="m-0">
          <CBAMSystemDiagnostics />
        </TabsContent>
      </Tabs>
    </div>
  );
}