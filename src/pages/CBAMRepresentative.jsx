import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, Users, Package, Calculator, FileText, 
  Briefcase, UserCheck, AlertCircle, Plus, ArrowUpRight
} from "lucide-react";
import RepDashboardOverview from '../components/cbam/representative/RepDashboardOverview';
import RepClientList from '../components/cbam/representative/RepClientList';
import RepImportManager from '../components/cbam/representative/RepImportManager';
import RepCalculations from '../components/cbam/representative/RepCalculations';
import RepReports from '../components/cbam/representative/RepReports';
import RepClientDeMinimisTracker from '../components/cbam/representative/RepClientDeMinimisTracker';
import CBAMInviteModal from '../components/cbam/CBAMInviteModal';
import CBAMEntryModal from '../components/cbam/CBAMEntryModal';
import ClientOnboardingWizard from '../components/cbam/representative/ClientOnboardingWizard';

export default function CBAMRepresentative() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isClientWizardOpen, setIsClientWizardOpen] = useState(false);

  // Fetch Clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['cbam-clients'],
    queryFn: () => base44.entities.CBAMClient.list()
  });

  // Fetch Imports (Delegated)
  const { data: imports = [], isLoading: importsLoading } = useQuery({
    queryKey: ['cbam-emission-entries-rep'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Calculated KPIs
  const totalClients = clients.length;
  const totalImports = imports.length;
  const totalEmissions = imports.reduce((sum, i) => sum + (i.total_embedded_emissions || 0), 0);
  const readinessAvg = clients.length > 0 
    ? clients.reduce((sum, c) => sum + (c.readiness_score || 0), 0) / clients.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header - Tesla Minimalist */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.15em] font-medium mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                Representative Console
              </div>
              <h1 className="text-3xl font-light text-slate-900 tracking-tight">CBAM Representative</h1>
              <p className="text-slate-600 font-light mt-1">Manage customs declarations and compliance for multiple clients</p>
            </div>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-2 mt-4" onClick={() => setIsEntryModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Import
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-8">

        {/* KPI Cards - Tesla Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold">Clients Managed</span>
              <Users className="w-4 h-4 text-slate-900" />
            </div>
            <div className="text-4xl font-light text-slate-900 tracking-tight">{totalClients}</div>
            <div className="flex items-center gap-1 mt-3 text-xs text-slate-600 font-medium">
              <UserCheck className="w-3 h-3" />
              Active Accounts
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold">Total Imports</span>
              <Package className="w-4 h-4 text-slate-900" />
            </div>
            <div className="text-4xl font-light text-slate-900 tracking-tight">{totalImports}</div>
            <div className="text-xs text-slate-500 mt-3">
              Across all declarants
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold">Total Emissions</span>
              <ArrowUpRight className="w-4 h-4 text-slate-900" />
            </div>
            <div className="text-4xl font-light text-slate-900 tracking-tight">{totalEmissions.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            <div className="text-xs text-slate-500 mt-3">
              tCO2e (Verified + Default)
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold">Avg. Readiness</span>
              <AlertCircle className="w-4 h-4 text-slate-900" />
            </div>
            <div className="text-4xl font-light text-slate-900 tracking-tight">{readinessAvg.toFixed(0)}%</div>
            <div className="text-xs text-slate-500 mt-3">
              Compliance Score
            </div>
          </div>
        </div>

        {/* Tabs - Tesla Design */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/60 backdrop-blur-xl border border-slate-200/60 p-1 inline-flex rounded-lg">
            <TabsTrigger value="overview" className="gap-2 px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md transition-all">
              <LayoutDashboard className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="imports" className="gap-2 px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md transition-all">
              <Package className="w-4 h-4" /> Imports
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md transition-all">
              <Users className="w-4 h-4" /> Clients
            </TabsTrigger>
            <TabsTrigger value="calculations" className="gap-2 px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md transition-all">
              <Calculator className="w-4 h-4" /> Calculated Data
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 px-6 py-3 text-sm font-light data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md transition-all">
              <FileText className="w-4 h-4" /> Manage Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <RepDashboardOverview clients={clients} imports={imports} setActiveTab={setActiveTab} />
            <RepClientDeMinimisTracker clients={clients} imports={imports} />
          </TabsContent>

          <TabsContent value="imports">
            <RepImportManager imports={imports} clients={clients} onAddImport={() => setIsEntryModalOpen(true)} />
          </TabsContent>

          <TabsContent value="clients">
            <RepClientList clients={clients} onAddClient={() => setIsClientWizardOpen(true)} />
          </TabsContent>

          <TabsContent value="calculations">
            <RepCalculations clients={clients} imports={imports} />
          </TabsContent>

          <TabsContent value="reports">
            <RepReports clients={clients} />
          </TabsContent>
        </Tabs>
      </div>

      <CBAMEntryModal open={isEntryModalOpen} onOpenChange={setIsEntryModalOpen} clients={clients} />
      <ClientOnboardingWizard open={isClientWizardOpen} onOpenChange={setIsClientWizardOpen} />
    </div>
  );
}