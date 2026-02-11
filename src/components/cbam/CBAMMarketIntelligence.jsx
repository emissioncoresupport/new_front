import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, Scale } from "lucide-react";
import CBAMMarketDashboard from './CBAMMarketDashboard';
import CBAMBenchmarkManager from './legacy/CBAMBenchmarkManager';
import CBAMCarbonLeakageModule from './legacy/CBAMCarbonLeakageModule';

/**
 * Market Intelligence Hub
 * Real-time ETS prices, benchmarks, and carbon leakage analysis
 * Compliant with ETS pricing directives and benchmark methodologies
 */
export default function CBAMMarketIntelligence() {
  return (
    <div className="space-y-5">
      <Tabs defaultValue="market" className="space-y-5">
        <TabsList className="bg-slate-50 border border-slate-200 rounded-lg p-1">
          <TabsTrigger value="market" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="w-3.5 h-3.5 mr-2" />
            Market Prices
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Target className="w-3.5 h-3.5 mr-2" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="leakage" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Scale className="w-3.5 h-3.5 mr-2" />
            Carbon Leakage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market">
          <CBAMMarketDashboard />
        </TabsContent>

        <TabsContent value="benchmarks">
          <CBAMBenchmarkManager />
        </TabsContent>

        <TabsContent value="leakage">
          <CBAMCarbonLeakageModule />
        </TabsContent>
      </Tabs>
    </div>
  );
}