import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TrendingUp, Shield, DollarSign, BarChart3, Lightbulb, RefreshCw } from "lucide-react";
import VCCRegistry from './VCCRegistry';
import VCCPriceTracker from './VCCPriceTracker';
import VCCCostComparison from './VCCCostComparison';
import VCCHedgingStrategy from './VCCHedgingStrategy';
import VCCPurchaseModal from './VCCPurchaseModal';

export default function VCCFinancialHedging({ totalEmissions, requiredCertificates }) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { data: vccHoldings = [] } = useQuery({
    queryKey: ['vcc-certificates'],
    queryFn: () => base44.entities.VCCertificate.list('-purchase_date')
  });

  const { data: priceHistory = [] } = useQuery({
    queryKey: ['cbam-price-history'],
    queryFn: () => base44.entities.CBAMPriceHistory.list('-date', 100)
  });

  // Calculate total VCC position
  const totalVCCQuantity = vccHoldings
    .filter(v => v.status === 'Active')
    .reduce((sum, v) => sum + (v.remaining_quantity || v.quantity), 0);

  const totalVCCValue = vccHoldings
    .filter(v => v.status === 'Active')
    .reduce((sum, v) => sum + ((v.remaining_quantity || v.quantity) * v.purchase_price_per_unit), 0);

  const hedgingPercentage = requiredCertificates > 0 
    ? Math.round((totalVCCQuantity / requiredCertificates) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-base font-medium text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            Financial Hedging & VCC Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Protect your profits with Virtual CBAM Certificates - Lock in costs today, convert when required
          </p>
        </div>
        <Button 
          onClick={() => setShowPurchaseModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm"
        >
          <DollarSign className="w-3.5 h-3.5 mr-2" />
          Purchase VCC
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-slate-500 uppercase">Active VCC Holdings</p>
            <Shield className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-light text-slate-900">{totalVCCQuantity.toFixed(0)}</p>
          <p className="text-xs text-slate-400 mt-1">units locked</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-slate-500 uppercase">Total VCC Value</p>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-light text-slate-900">€{totalVCCValue.toFixed(0)}</p>
          <p className="text-xs text-slate-400 mt-1">locked investment</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-slate-500 uppercase">Hedging Coverage</p>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-light text-slate-900">{hedgingPercentage}%</p>
          <p className="text-xs text-slate-400 mt-1">of projected need</p>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-lg p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-medium text-slate-500 uppercase">Exposure Remaining</p>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-3xl font-light text-slate-900">
            {Math.max(0, requiredCertificates - totalVCCQuantity).toFixed(0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">units unhedged</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="registry" className="space-y-5">
        <TabsList className="bg-slate-50/50 border border-slate-200/60 h-9">
          <TabsTrigger value="registry" className="text-xs h-8">
            <Shield className="w-3 h-3 mr-1.5" />
            VCC Registry
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs h-8">
            <TrendingUp className="w-3 h-3 mr-1.5" />
            Price Tracking
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs h-8">
            <BarChart3 className="w-3 h-3 mr-1.5" />
            Cost Comparison
          </TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs h-8">
            <Lightbulb className="w-3 h-3 mr-1.5" />
            Hedging Strategy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry">
          <VCCRegistry 
            vccHoldings={vccHoldings} 
            priceHistory={priceHistory}
          />
        </TabsContent>

        <TabsContent value="pricing">
          <VCCPriceTracker priceHistory={priceHistory} />
        </TabsContent>

        <TabsContent value="comparison">
          <VCCCostComparison 
            requiredCertificates={requiredCertificates}
            priceHistory={priceHistory}
          />
        </TabsContent>

        <TabsContent value="strategy">
          <VCCHedgingStrategy 
            totalEmissions={totalEmissions}
            requiredCertificates={requiredCertificates}
            currentVCCHoldings={totalVCCQuantity}
            priceHistory={priceHistory}
          />
        </TabsContent>
      </Tabs>

      <VCCPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        currentPrice={priceHistory[0]?.cbam_certificate_price || 85}
      />
    </div>
  );
}