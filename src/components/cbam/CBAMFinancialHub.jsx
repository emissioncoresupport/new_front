import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Shield, BarChart3, Users, Activity } from "lucide-react";
import VCCFinancialHedging from './VCCFinancialHedging';
import CostSummary from './CostSummary';
import ForecastCosts from './ForecastCosts';
// Supplier comparison temporarily unavailable
import CBAMUnifiedCertificatesHub from './unified/CBAMUnifiedCertificatesHub';
import CBAMCertificateAutomation from './CBAMCertificateAutomation';
import CostScenarioChart from './charts/CostScenarioChart';
import ETSIntegrationHub from './ets/ETSIntegrationHub';
import CBAMAutomationSettings from './CBAMAutomationSettings';
import CBAMCertificateTrading from './CBAMCertificateTrading';
import eventBus, { CBAM_EVENTS } from './services/CBAMEventBus';

export default function CBAMFinancialHub({ entries, certificates, purchaseOrders }) {
  const [realtimeEntries, setRealtimeEntries] = React.useState(entries);

  // Listen for real-time entry updates
  React.useEffect(() => {
    setRealtimeEntries(entries);
  }, [entries]);

  React.useEffect(() => {
    const unsubscribe = eventBus.on(CBAM_EVENTS.ENTRY_UPDATED, () => {
      // Trigger refresh via query invalidation handled by parent
    });
    return unsubscribe;
  }, []);

  const totalEmissions = realtimeEntries.reduce((sum, e) => sum + (e.total_embedded_emissions || 0), 0);
  // CORRECT: Certificates = chargeable emissions (1:1), no multiplication
  const chargeableEmissions = totalEmissions; // Simplified without benchmarks
  const requiredCertificates = Math.ceil(chargeableEmissions);
  
  const currentBalance = certificates
    .filter(c => c.status === 'active')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    
  const pendingOrdersQuantity = purchaseOrders
    .filter(o => o.status === 'draft' || o.status === 'pending_approval' || o.status === 'approved')
    .reduce((acc, curr) => acc + (curr.quantity || 0), 0);

  const shortfall = Math.max(0, requiredCertificates - (currentBalance + pendingOrdersQuantity));
  const avgPrice = 88;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <h2 className="text-base font-medium text-slate-900">Financial Management</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Cost tracking, forecasting, hedging strategies, and supplier comparison
        </p>
      </div>

      {/* Clean Automation Card */}
      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <CBAMCertificateAutomation 
          shortfall={shortfall}
          totalEmissions={totalEmissions}
          currentBalance={currentBalance}
          pendingOrders={pendingOrdersQuantity}
          avgPrice={avgPrice}
        />
      </div>

      <Tabs defaultValue="summary" className="space-y-5">
        <TabsList className="bg-slate-50/50 border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Cost Summary
          </TabsTrigger>
          <TabsTrigger value="automation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Automation
          </TabsTrigger>
          <TabsTrigger value="forecast" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Forecast
          </TabsTrigger>
          <TabsTrigger value="ets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            ETS Integration
          </TabsTrigger>
          <TabsTrigger value="vcc" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            VCC Hedging
          </TabsTrigger>
          {/* Supplier Compare tab temporarily removed */}
          <TabsTrigger value="certificates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Certificates
          </TabsTrigger>
          <TabsTrigger value="trading" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 hover:bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all">
            Trading
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <CostSummary purchaseOrders={purchaseOrders} />
        </TabsContent>

        <TabsContent value="automation">
          <CBAMAutomationSettings />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <CostScenarioChart entries={entries} />
          <ForecastCosts />
        </TabsContent>

        <TabsContent value="ets">
          <ETSIntegrationHub />
        </TabsContent>

        <TabsContent value="vcc">
          <VCCFinancialHedging 
            totalEmissions={totalEmissions}
            requiredCertificates={requiredCertificates}
          />
        </TabsContent>

        {/* Supplier comparison deferred */}

        <TabsContent value="certificates">
          <CBAMUnifiedCertificatesHub />
        </TabsContent>

        <TabsContent value="trading">
          <CBAMCertificateTrading />
        </TabsContent>
      </Tabs>
    </div>
  );
}