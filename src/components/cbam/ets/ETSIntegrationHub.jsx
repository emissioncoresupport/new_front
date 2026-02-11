import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Database, Calculator, Activity } from "lucide-react";
import ETSAllowanceManager from './ETSAllowanceManager';
import ETSMarketIntegration from './ETSMarketIntegration';

export default function ETSIntegrationHub() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">ETS Integration</h2>
        <p className="text-slate-500 mt-1">
          EU Emissions Trading System integration for allowance management and CBAM deductions
        </p>
      </div>

      <Tabs defaultValue="market" className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="market">
            <Activity className="w-4 h-4 mr-2" />
            Market Prices
          </TabsTrigger>
          <TabsTrigger value="allowances">
            <Database className="w-4 h-4 mr-2" />
            Allowance Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market">
          <ETSMarketIntegration />
        </TabsContent>

        <TabsContent value="allowances">
          <ETSAllowanceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}