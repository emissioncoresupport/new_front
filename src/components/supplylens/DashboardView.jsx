import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Layout, TrendingUp, Globe, BarChart3, Activity, Network } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import StatCard from './StatCard';
import SupplierMap from './SupplierMap';
import RiskDistributionChart from './RiskDistributionChart';
import TierDistributionChart from './TierDistributionChart';
import RecentAlerts from './RecentAlerts';
import SupplierPerformanceChart from './SupplierPerformanceChart';
import TopCountriesChart from './TopCountriesChart';

import { motion, AnimatePresence } from "framer-motion";

export default function DashboardView({ 
  suppliers = [], 
  sites = [], 
  alerts = [], 
  stats,
  metrics,
  onViewSupplier, 
  onStatClick, 
  setActiveTab, 
  clearFilters 
}) {
  // Use metrics if stats is not provided (for UnifiedSupplierHub compatibility)
  const highRiskSuppliers = suppliers.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length;
  const sanctionedSuppliers = suppliers.filter(s => s.sanctions_status === 'blocked').length;
  const pendingOrchestration = suppliers.filter(s => s.orchestration_status === 'pending').length;

  const dashboardStats = stats || metrics || {
    total: suppliers.length,
    tier1: suppliers.filter(s => s.tier === 'tier_1').length,
    highRisk: highRiskSuppliers,
    openAlerts: alerts.filter(a => a.status === 'open').length,
    countries: new Set(suppliers.map(s => s.country)).size
  };
  // Default visible widgets
  const [visibleWidgets, setVisibleWidgets] = useState({
    stats: true,
    map: true,
    riskChart: true,
    tierChart: true,
    performanceChart: true,
    geoChart: true,
    alerts: true
  });

  const toggleWidget = (key) => {
    setVisibleWidgets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Dashboard Controls */}
      <div className="flex justify-end mb-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-md border-slate-200 hover:bg-white shadow-lg hover:shadow-xl">
              <Layout className="w-4 h-4 mr-2 text-slate-500" />
              Customize Dashboard
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-900 mb-2">Visible Widgets</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="w-stats" checked={visibleWidgets.stats} onCheckedChange={() => toggleWidget('stats')} />
                <Label htmlFor="w-stats" className="text-sm">Key Metrics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="w-map" checked={visibleWidgets.map} onCheckedChange={() => toggleWidget('map')} />
                <Label htmlFor="w-map" className="text-sm">Global Risk Map</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="w-tier" checked={visibleWidgets.tierChart} onCheckedChange={() => toggleWidget('tierChart')} />
                <Label htmlFor="w-tier" className="text-sm">Supply Chain Tiers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="w-geo" checked={visibleWidgets.geoChart} onCheckedChange={() => toggleWidget('geoChart')} />
                <Label htmlFor="w-geo" className="text-sm">Top Countries</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="w-alerts" checked={visibleWidgets.alerts} onCheckedChange={() => toggleWidget('alerts')} />
                <Label htmlFor="w-alerts" className="text-sm">Recent Alerts</Label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Row */}
      <AnimatePresence>
        {visibleWidgets.stats && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-8">
             <StatCard
                title="Total Suppliers"
                value={dashboardStats.total}
                icon={Activity}
                variant="primary"
                subtitle="+12% this quarter"
                onClick={() => { setActiveTab?.('suppliers'); clearFilters?.(); }}
              />
              <StatCard
                title="Tier 1 Direct"
                value={dashboardStats.tier1 || suppliers.filter(s => s.tier === 'tier_1').length}
                icon={Layout}
                variant="success"
                subtitle="+5 new partners"
                onClick={() => onStatClick?.('tier1')}
              />
              <StatCard
                title="High Risk"
                value={dashboardStats.highRisk || dashboardStats.highRisk}
                icon={TrendingUp}
                variant="danger"
                onClick={() => onStatClick?.('highRisk')}
              />
              <StatCard
                 title="Open Alerts"
                 value={dashboardStats.openAlerts || alerts.filter(a => a.status === 'open').length}
                 icon={BarChart3}
                 variant="warning"
                 onClick={() => { setActiveTab?.('overview'); }}
              />
              <StatCard
               title="Countries"
               value={dashboardStats.countries || new Set(suppliers.map(s => s.country)).size}
               icon={Globe}
               variant="purple"
               onClick={() => { setActiveTab?.('suppliers'); clearFilters?.(); }}
              />
              <StatCard 
               title="Sanctioned"
               value={sanctionedSuppliers}
               icon={Shield}
               variant={sanctionedSuppliers > 0 ? "danger" : "success"}
               subtitle={sanctionedSuppliers > 0 ? "⚠️ Action required" : "All clear"}
              />
              <StatCard 
               title="Pending Sync"
               value={pendingOrchestration}
               icon={Zap}
               variant="info"
               subtitle="Cross-module sync"
              />
              </motion.div>
              )}
              </AnimatePresence>

      {/* Main Content Grid - Horizontal Modern Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Row 1: Map (3 cols) + Alerts (1 col) */}
        <div className="xl:col-span-3 space-y-6">
            {/* Map - Wide and Immersive */}
            <AnimatePresence>
            {visibleWidgets.map && (
                <motion.div 
                  variants={itemVariants} 
                  className="h-[550px] rounded-2xl overflow-hidden"
                >
                  <SupplierMap 
                      suppliers={suppliers} 
                      sites={sites} 
                      onViewSupplier={onViewSupplier} 
                  />
                </motion.div>
            )}
            </AnimatePresence>
            
            {/* Enhanced Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Countries - Enhanced */}
                <AnimatePresence>
                {visibleWidgets.geoChart && (
                    <motion.div variants={itemVariants} className="h-[400px]">
                    <TopCountriesChart suppliers={suppliers} />
                    </motion.div>
                )}
                </AnimatePresence>

                {/* Tier Chart - Enhanced */}
                <AnimatePresence>
                {visibleWidgets.tierChart && (
                    <motion.div variants={itemVariants} className="h-[400px]">
                    <TierDistributionChart suppliers={suppliers} />
                    </motion.div>
                )}
                </AnimatePresence>
            </div>


        </div>

        {/* Right Column: Alerts & Feed (Vertical Stripe) */}
        <div className="xl:col-span-1 space-y-6">
          <AnimatePresence>
            {visibleWidgets.alerts && (
              <motion.div variants={itemVariants} className="h-full">
                 <RecentAlerts 
                   alerts={alerts} 
                   suppliers={suppliers}
                   onViewAll={() => setActiveTab('suppliers')}
                 />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}