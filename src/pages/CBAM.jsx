import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, FileText, TrendingUp, AlertCircle, CheckCircle2, 
  Download, Upload, Plus, Users, BarChart3, BookOpen, LayoutDashboard, Zap
} from "lucide-react";

import CBAMDashboard from '../components/cbam/CBAMDashboard';
import CBAMDataManagementHub from '../components/cbam/CBAMDataManagementHub';
import CBAMSupplierHub from '../components/cbam/CBAMSupplierHub';
import CBAMComplianceModule from '../components/cbam/CBAMComplianceModule';
import CBAMCompliance2026Dashboard from '../components/cbam/CBAMCompliance2026Dashboard';
import CBAMFinancialHub from '../components/cbam/CBAMFinancialHub';
import CBAMReportDashboard from '../components/cbam/reporting/CBAMReportDashboard';
import CBAMAssistant from '../components/cbam/CBAMAssistant';
import CBAMAutomationMonitor from '../components/cbam/CBAMAutomationMonitor';
import CBAMKnowledgeHub from '../components/cbam/CBAMKnowledgeHub';
import CBAMUnifiedVerificationHub from '../components/cbam/unified/CBAMUnifiedVerificationHub';
import CBAMUnifiedCertificatesHub from '../components/cbam/unified/CBAMUnifiedCertificatesHub';

import CBAMSubmissionQueue from '../components/cbam/CBAMSubmissionQueue';
import CBAMSystemHealthMonitor from '../components/cbam/CBAMSystemHealthMonitor';
import CBAMRealTimeSync from '../components/cbam/services/CBAMRealTimeSync';
import CBAMIntegrationWizard from '../components/cbam/integration/CBAMIntegrationWizard';
import CBAMIntegrationStatus from '../components/cbam/integration/CBAMIntegrationStatus';
import CBAMUnifiedReportWorkflow from '../components/cbam/reporting/CBAMUnifiedReportWorkflow';
import CBAMLoadTestingPanel from '../components/cbam/CBAMLoadTestingPanel';
import { toast } from "sonner";

export default function CBAMPage() {
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'dashboard';
  });
  const [showIntegrationWizard, setShowIntegrationWizard] = useState(false);
  const [showIntegrationStatus, setShowIntegrationStatus] = useState(false);
  const [showReportWorkflow, setShowReportWorkflow] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  const queryClient = useQueryClient();

  // Fetch Reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['cbam-reports'],
    queryFn: () => base44.entities.CBAMReport.list('-period')
  });

  // Fetch Emission Entries (Active Inventory)
  const { data: emissionEntries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  // Current period for declarations
  const currentYear = new Date().getFullYear().toString();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
  
  // Fetch Certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['cbam-certificates'],
    queryFn: () => base44.entities.CBAMCertificate.list()
  });

  // Fetch Purchase Orders
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['cbam-purchase-orders'],
    queryFn: () => base44.entities.CBAMPurchaseOrder.list('-created_date')
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white p-8 md:p-12">
      {/* Tesla-Style Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-[0.2em] font-light mb-3">
            <Globe className="w-3.5 h-3.5" />
            Importer Console
          </div>
          <h1 className="text-4xl font-extralight text-slate-900 tracking-tight mb-2">CBAM</h1>
          <p className="text-slate-500 font-light text-base mt-1">Carbon Border Adjustment Mechanism • Definitive Regime 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setShowIntegrationStatus(true)}
            className="bg-white/60 backdrop-blur-2xl border border-white/60 hover:bg-white/90 hover:shadow-lg transition-all h-10 px-5 rounded-xl text-sm font-light shadow-md"
          >
            <Zap className="w-4 h-4 mr-2" />
            Integrations
          </Button>
          <Button 
            onClick={() => {
              setSelectedPeriod(`Q${currentQuarter}-${currentYear}`);
              setShowReportWorkflow(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all h-10 px-6 rounded-xl text-sm font-light"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Declaration
          </Button>
        </div>
      </div>

      {/* Clean Supply Lens-Style Tabs */}
      <div className="relative bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="relative bg-transparent border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="data-management" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Data & Import</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Verification</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Suppliers</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Certificates</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">System</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Entries Card */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <span className="text-2xl font-extralight text-slate-900">{emissionEntries.length}</span>
                </div>
                <p className="text-sm text-slate-600 font-light">Emission Entries</p>
              </div>

              {/* Reports Card */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                  <span className="text-2xl font-extralight text-slate-900">{reports.length}</span>
                </div>
                <p className="text-sm text-slate-600 font-light">Quarterly Reports</p>
              </div>

              {/* Certificates Card */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <CheckCircle2 className="w-5 h-5 text-slate-900" />
                  <span className="text-2xl font-extralight text-slate-900">{certificates.filter(c => c.status === 'active').length}</span>
                </div>
                <p className="text-sm text-slate-600 font-light">Active Certificates</p>
              </div>

              {/* Purchase Orders Card */}
              <div className="bg-white/60 backdrop-blur-xl border border-slate-200/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-5 h-5 text-slate-600" />
                  <span className="text-2xl font-extralight text-slate-900">{purchaseOrders.length}</span>
                </div>
                <p className="text-sm text-slate-600 font-light">Purchase Orders</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data-management" className="mt-4 p-6">
            <CBAMDataManagementHub entries={emissionEntries} />
          </TabsContent>

          <TabsContent value="verification" className="mt-4 p-6">
            <CBAMUnifiedVerificationHub />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4 p-6">
            <CBAMSupplierHub />
          </TabsContent>

          <TabsContent value="financial" className="mt-4 p-6">
            <CBAMFinancialHub 
              entries={emissionEntries}
              certificates={certificates}
              purchaseOrders={purchaseOrders}
            />
          </TabsContent>

          <TabsContent value="reports" className="mt-4 p-6">
            <CBAMSubmissionQueue />
            <CBAMReportDashboard />
          </TabsContent>

          <TabsContent value="certificates" className="mt-4 p-6">
            <CBAMUnifiedCertificatesHub />
          </TabsContent>

          <TabsContent value="system" className="mt-4 p-6">
            <CBAMSystemHealthMonitor />
            <CBAMLoadTestingPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Real-Time Event Sync */}
      <CBAMRealTimeSync />

      {/* AI Assistant - Always Available */}
      <CBAMAssistant 
        entries={emissionEntries}
        reports={reports}
        validationErrors={[]}
      />

      {/* Background Automation Monitor */}
      <CBAMAutomationMonitor 
        entries={emissionEntries}
        certificates={certificates}
        purchaseOrders={purchaseOrders}
      />

      {/* Integration Status Modal */}
      {showIntegrationStatus && (
        <CBAMIntegrationStatus 
          onClose={() => setShowIntegrationStatus(false)} 
        />
      )}

      {/* Report Workflow */}
      {showReportWorkflow && (
        <CBAMUnifiedReportWorkflow
          period={selectedPeriod}
          entries={emissionEntries}
          onComplete={() => setShowReportWorkflow(false)}
        />
      )}
    </div>
  );
}