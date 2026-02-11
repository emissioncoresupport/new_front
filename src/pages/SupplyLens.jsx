import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, Shield, Clock, AlertTriangle, AlertCircle, ExternalLink, Filter, DollarSign, TrendingUp, ChevronDown, Info, Brain, Upload, Activity, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { ctaAudit } from '@/components/supplylens/services/ctaAuditService';
import QAConsole from '@/components/supplylens/QAConsole';
import IngestionWizardRegistryDriven from '@/components/supplylens/IngestionWizardRegistryDriven';
import WorkItemDrawer from '@/components/supplylens/WorkItemDrawer';
import SmartMappingPanel from '@/components/supplylens/contract2/SmartMappingPanel';
import IntegrationHealthModal from '@/components/supplylens/IntegrationHealthModal';
import FinancialRiskDrilldown from '@/components/supplylens/FinancialRiskDrilldown';
import ReminderPolicyEngine from '@/components/supplylens/ReminderPolicyEngine';
import { seedSupplyLensDemoData } from '@/components/supplylens/seedSupplyLensDemoData';

export default function ControlTower() {
  const urlParams = new URLSearchParams(window.location.search);
  const [workQueueFilter, setWorkQueueFilter] = useState(urlParams.get('workQueueFilter') || 'all');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('statusFilter') || 'all');
  const [priorityFilter, setPriorityFilter] = useState(urlParams.get('priorityFilter') || 'all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState({
    entity_type: urlParams.get('entity_type') || null,
    entity_id: urlParams.get('entity_id') || null
  });
  const [showIngestionWizard, setShowIngestionWizard] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kpiFilter, setKpiFilter] = useState(null);
  const [showIntegrationHealth, setShowIntegrationHealth] = useState(false);
  const [showFinancialRiskDrilldown, setShowFinancialRiskDrilldown] = useState(false);
  const [highlightedWorkItemId, setHighlightedWorkItemId] = useState(null);
  const [reminderFilter, setReminderFilter] = useState('all');
  const [showReminderEngine, setShowReminderEngine] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAdmin] = useState(true); // TODO: Get from user context
  const [demoDataSeeded, setDemoDataSeeded] = useState(false);
  const queryClient = useQueryClient();

  // Seed demo data on mount (dev mode only)
  useEffect(() => {
    const initDemoData = async () => {
      if (!demoDataSeeded) {
        const result = await seedSupplyLensDemoData();
        if (result.success && result.count > 0) {
          console.log('[ControlTower] Demo data seeded:', result.count, 'records');
          setDemoDataSeeded(true);
          // Refetch data after seeding
          queryClient.invalidateQueries();
        }
      }
    };
    
    initDemoData();
  }, [demoDataSeeded, queryClient]);

  // Handle highlight + filter + auto-open from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get('highlight');
    const workItemId = params.get('work_item_id');
    const filterType = params.get('filter_type');
    const tab = params.get('tab');
    const entityType = params.get('entity_type');
    const entityId = params.get('entity_id');
    
    if (highlightId) {
      setHighlightedWorkItemId(highlightId);
      setTimeout(() => setHighlightedWorkItemId(null), 3000);
    }
    
    if (filterType) {
      setWorkQueueFilter(filterType);
    }
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (entityType && entityId) {
      setEntityFilter({ entity_type: entityType, entity_id: entityId });
    }
    
    // Auto-open work item drawer
    if (workItemId) {
      const findAndOpenWorkItem = async () => {
        try {
          const { demoStore } = await import('@/components/supplylens/DemoDataStore');
          // Use indexed lookup instead of iterating
          const workItem = demoStore.getWorkItemById(workItemId);
          
          if (workItem) {
            const formattedItem = {
              id: workItem.work_item_id,
              work_item_id: workItem.work_item_id,
              type: workItem.type,
              status: workItem.status,
              priority: workItem.priority,
              title: workItem.title,
              linkedEvidenceId: workItem.linked_evidence_record_ids?.[0],
              linked_evidence_record_ids: workItem.linked_evidence_record_ids,
              linkedEntityRef: workItem.linked_entity ? { entityType: workItem.linked_entity.type, entityId: workItem.linked_entity.id } : null,
              linked_entity: workItem.linked_entity,
              createdAt: workItem.created_at_utc,
              created_at_utc: workItem.created_at_utc,
              owner: workItem.owner,
              details: workItem.details || {},
              requiresAction: true
            };
            
            setSelectedWorkItem(formattedItem);
            setHighlightedWorkItemId(workItemId);
            setTimeout(() => setHighlightedWorkItemId(null), 3000);
          } else {
            toast.error(`Work item ${workItemId} not found`);
          }
        } catch (error) {
          console.error('[SupplyLens] Auto-open work item error:', error);
          toast.error('Failed to open work item');
        }
      };
      findAndOpenWorkItem();
    }
  }, []);

  // Note: Supplier requests are now merged in workItems query via demoStore

  const { data: workItems = [], refetch: refetchWorkItems } = useQuery({
    queryKey: ['demo-work-items', workQueueFilter, statusFilter, priorityFilter],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      
      // Server-side filtering
      const filters = {};
      if (workQueueFilter !== 'all') filters.type = workQueueFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      
      const result = demoStore.listWorkItems({ page: 1, pageSize: 100, filters });
      
      return result.data.map(w => ({
        id: w.work_item_id,
        work_item_id: w.work_item_id,
        type: w.type,
        status: w.status,
        priority: w.priority,
        title: w.title,
        linkedEvidenceId: w.linked_evidence_record_ids?.[0],
        linked_evidence_record_ids: w.linked_evidence_record_ids,
        linkedEntityRef: w.linked_entity ? { entityType: w.linked_entity.type, entityId: w.linked_entity.id } : null,
        linked_entity: w.linked_entity,
        createdAt: w.created_at_utc,
        created_at_utc: w.created_at_utc,
        owner: w.owner,
        details: { 
          reason: w.required_action_text,
          financialRiskExposure: w.risk_eur || w.estimated_cost_eur || 0,
          supplier_name: w.details?.supplier_name,
          dataset_type: w.details?.dataset_type,
          due_date: w.details?.due_date
        },
        risk_eur: w.risk_eur || w.estimated_cost_eur,
        risk_eur: w.risk_eur || w.estimated_cost_eur,
        estimated_cost_eur: w.estimated_cost_eur,
        // Financial risk fields
        estimated_financial_impact_amount: w.estimated_financial_impact_amount || w.risk_eur || w.estimated_cost_eur || 0,
        currency: w.currency || 'EUR',
        impact_basis: w.impact_basis || 'CUSTOM',
        calculation_trace: w.calculation_trace || null
      }));
    },
    refetchInterval: 5000,
    staleTime: 2000
  });

  const { data: evidenceRecords = [] } = useQuery({
    queryKey: ['demo-evidence-vault'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const result = demoStore.listEvidence({ page: 1, pageSize: 1000 });
      return result.data;
    },
    staleTime: 60000 // Cache for 60 seconds
  });
  
  const { data: kpis = {} } = useQuery({
    queryKey: ['demo-kpis'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.getKPIs();
    }
  });
  
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['demo-activity'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.getRecentActivity(10);
    }
  });

  const handleOpenWorkItem = async (workItem) => {
    const result = await ctaAudit(
      'WORK_ITEM_OPEN',
      'SupplyLens/ControlTower',
      'user@example.com',
      'tenant-123',
      'Open work item drawer for review/action',
      async () => ({
        ids: [workItem.id],
      }),
      { workItemId: workItem.id, type: workItem.type }
    );
    if (result.success) setSelectedWorkItem(workItem);
    else toast.error(`Failed to open work item: ${result.error}`);
  };
  
  const handleCloseWorkItem = () => {
    setSelectedWorkItem(null);
    refetchWorkItems();
  };
  
  const handleApprove = async (item, reasonCode, comment) => {
    const result = await ctaAudit(
      'WORK_ITEM_APPROVE',
      'SupplyLens/ControlTower',
      'user@example.com',
      'tenant-123',
      'Approve work item and write decision to log',
      async () => {
        const { demoStore } = await import('@/components/supplylens/DemoDataStore');
        demoStore.resolveWorkItem(item.id, { outcome: 'APPROVED', reason_code: reasonCode, comment });
        refetchWorkItems();
        return { ids: [item.id] };
      },
      { workItemId: item.id, reasonCode }
    );
    if (result.success) {
      toast.success(`Work item ${item.id} approved • Decision logged`);
      setSelectedWorkItem(null);
    } else {
      toast.error(`Failed to approve: ${result.error}`);
    }
  };

  const handleReject = async (item, reasonCode, comment) => {
    const result = await ctaAudit(
      'WORK_ITEM_REJECT',
      'SupplyLens/ControlTower',
      'user@example.com',
      'tenant-123',
      'Reject work item and write decision to log',
      async () => {
        const { demoStore } = await import('@/components/supplylens/DemoDataStore');
        demoStore.resolveWorkItem(item.id, { outcome: 'REJECTED', reason_code: reasonCode, comment });
        refetchWorkItems();
        return { ids: [item.id] };
      },
      { workItemId: item.id, reasonCode }
    );
    if (result.success) {
      toast.error(`Work item ${item.id} rejected • Decision logged`);
      setSelectedWorkItem(null);
    } else {
      toast.error(`Failed to reject: ${result.error}`);
    }
  };

  const filteredWorkQueue = workItems.filter(item => {
    const itemWorkItemId = item.id || '';
    const itemEvidenceId = item.linkedEvidenceId || '';
    const itemEntityId = item.linkedEntityRef?.entityId || '';
    const itemSupplierName = item.details?.supplier_name || '';
    const itemDatasetType = item.details?.dataset_type || '';
    
    const typeMatch = workQueueFilter === 'all' || item.type === workQueueFilter;
    const statusMatch = statusFilter === 'all' || item.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || item.priority === priorityFilter;
    const moduleMatch = moduleFilter === 'all' || item.type === moduleFilter;
    
    // Entity filter for deep-linking from Network
    let entityMatch = true;
    if (entityFilter.entity_type && entityFilter.entity_id) {
      entityMatch = item.linkedEntityRef?.entityType === entityFilter.entity_type && 
                    item.linkedEntityRef?.entityId === entityFilter.entity_id;
    }
    
    const searchMatch = searchQuery === '' || 
                        itemWorkItemId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        itemEvidenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        itemEntityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        itemSupplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        itemDatasetType.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Reminder filter for DATA_REQUEST items
    let reminderMatch = true;
    if (item.type === 'DATA_REQUEST' && reminderFilter !== 'all') {
      const dueDate = item.details?.due_date ? new Date(item.details.due_date) : null;
      const now = new Date();
      const daysUntilDue = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;
      
      if (reminderFilter === 'due_soon') {
        reminderMatch = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;
      } else if (reminderFilter === 'overdue') {
        reminderMatch = daysUntilDue !== null && daysUntilDue < 0;
      } else if (reminderFilter === 'escalated') {
        reminderMatch = (item.details?.escalation_level || 0) > 0;
      }
    }
    
    return typeMatch && statusMatch && priorityMatch && moduleMatch && searchMatch && reminderMatch && entityMatch;
  });

  const exceptions = workItems.filter(item => 
    item.status === 'BLOCKED' || item.priority === 'CRITICAL'
  );
  
  // Extract KPI values for UI
  const sealedCount = evidenceRecords.filter(e => e.status === 'SEALED').length;
  const pendingReview = kpis.pending_decisions || 0;
  const pendingMapping = workItems.filter(w => w.type === 'MAPPING' && w.status === 'OPEN').length;
  
  // Financial Risk: deterministic calculation from store
  const financialRiskEur = kpis.financial_risk_eur || 0;
  const financialRiskBreakdown = kpis.financial_risk_breakdown || { CRITICAL: 0, HIGH: 0, OTHER: 0 };
  const financialRiskCount = kpis.financial_risk_count || 0;
  
  const integrationHealth = kpis.integration_health || 98;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-slate-900 tracking-tight">Control Tower</h1>
              <p className="text-slate-600 font-light mt-1">Work queue, evidence flow, and operational control</p>
            </div>
            <div className="flex flex-col items-end gap-4 mt-[1cm]">
              <Button
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-lg rounded-xl"
                onClick={() => {
                  try {
                    setShowIngestionWizard(true);
                    toast.success('Opening ingestion wizard');
                  } catch (error) {
                    console.error('[ControlTower] Ingest Evidence error [ERR-CT-001]:', error);
                    toast.error('Failed to open wizard [ERR-CT-001]', {
                      description: 'Please refresh and try again'
                    });
                  }
                }}
              >
                Ingest Evidence
                <Upload className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-[1920px] mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="queue" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              Work Queue
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Exceptions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards - Clickable Drilldowns */}
            <div className="grid grid-cols-4 gap-4">
              <Link to={createPageUrl('EvidenceVault')} className="group">
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Shield className="w-5 h-5 text-black" />
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black" />
                    </div>
                    <p className="text-3xl font-light text-slate-900">{sealedCount}</p>
                    <p className="text-sm text-slate-600 mt-1">Evidence Sealed</p>
                  </CardContent>
                </Card>
              </Link>

              <button
                onClick={() => {
                  setKpiFilter('review');
                  setWorkQueueFilter('REVIEW');
                  setStatusFilter('OPEN');
                  setActiveTab('queue');
                }}
                className="group"
              >
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="w-5 h-5 text-black" />
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black" />
                    </div>
                    <p className="text-3xl font-light text-slate-900">{pendingReview}</p>
                    <p className="text-sm text-slate-600 mt-1">Pending Review</p>
                  </CardContent>
                </Card>
              </button>

              <button
                onClick={() => {
                  setKpiFilter('mapping');
                  setWorkQueueFilter('MAPPING');
                  setStatusFilter('all');
                  setActiveTab('queue');
                }}
                className="group"
              >
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Database className="w-5 h-5 text-black" />
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black" />
                    </div>
                    <p className="text-3xl font-light text-slate-900">{pendingMapping}</p>
                    <p className="text-sm text-slate-600 mt-1">Pending Mapping</p>
                  </CardContent>
                </Card>
              </button>

              <button onClick={() => setShowIntegrationHealth(true)} className="group w-full">
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-all cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Database className="w-5 h-5 text-black" />
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black" />
                    </div>
                    <p className="text-3xl font-light text-slate-900">{integrationHealth}%</p>
                    <p className="text-sm text-slate-600 mt-1">Integration Health</p>
                  </CardContent>
                </Card>
              </button>
            </div>



            {/* Recent Activity */}
            <Card className="border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-200 bg-slate-50/40 px-6 py-4">
                <CardTitle className="text-lg font-light text-slate-900 tracking-tight">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/60 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Dataset</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Evidence ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Created By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Source System</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                     {recentActivity.length > 0 ? recentActivity.map(ev => (
                     <tr 
                       key={ev.event_id} 
                       className="hover:bg-slate-50/40 transition-colors cursor-pointer"
                       onClick={async () => {
                         try {
                           const isDraft = ev.event_type === 'DRAFT_CREATED' || ev.object_type === 'draft';
                           if (isDraft) {
                             window.location.href = `${createPageUrl('EvidenceVault')}?tab=drafts`;
                           } else {
                             const { CTARouter } = await import('@/components/supplylens/CTARouter');
                             await CTARouter.openEvidenceDetail(ev.display_id);
                           }
                         } catch (error) {
                           console.error('[ControlTower] Navigate error:', error);
                           toast.error('Failed to navigate');
                         }
                       }}
                     >
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-900">{ev.dataset_type}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-600 font-mono">{ev.display_id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              ev.event_type === 'SEALED' ? 'bg-green-500' : 
                              ev.event_type === 'QUARANTINED' ? 'bg-red-500' :
                              'bg-orange-500'
                            }`} />
                            <span className="text-xs text-slate-600">{ev.event_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs border-slate-300 bg-slate-50 text-slate-700">{ev.ingestion_method}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600">{ev.created_by || ev.actor || 'system'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600">{ev.source_system || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600">{new Date(ev.timestamp).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                           size="sm"
                           variant="ghost"
                           className="h-8 w-8 p-0 hover:bg-slate-100"
                           onClick={async (e) => {
                             e.stopPropagation();
                             try {
                               const isDraft = ev.event_type === 'DRAFT_CREATED' || ev.object_type === 'draft';
                               if (isDraft) {
                                 window.location.href = `${createPageUrl('EvidenceVault')}?tab=drafts`;
                               } else {
                                 const { CTARouter } = await import('@/components/supplylens/CTARouter');
                                 await CTARouter.openEvidenceDetail(ev.display_id);
                               }
                             } catch (error) {
                               console.error('[ControlTower] Navigate error:', error);
                               toast.error('Failed to navigate');
                             }
                           }}
                          >
                           <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-900" />
                          </Button>
                        </td>
                      </tr>
                     )) : (
                       <tr>
                         <td colSpan="8" className="px-6 py-8 text-center text-sm text-slate-500">No recent activity</td>
                       </tr>
                     )}
                     </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Queue Tab */}
          <TabsContent value="queue" className="space-y-6">
            {/* Reminder Policy Trigger */}
            {workQueueFilter === 'DATA_REQUEST' && (
              <Card className="border border-slate-300 bg-white/70 backdrop-blur-xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-900" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Reminder Policy</p>
                      <p className="text-xs text-slate-600 font-light">Deterministic schedules: T-14, T-7, T-2, T+1 escalation</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => setShowReminderEngine(true)}
                  >
                    Run Policy
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Filters - Tesla Minimalist */}
            <div className="flex flex-wrap gap-3">
              <Input
                type="text"
                placeholder="Search work items, evidence, entities, suppliers, datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-64 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm"
              />
              <Select value={workQueueFilter} onValueChange={setWorkQueueFilter}>
                <SelectTrigger className="w-48 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="EXTRACTION">Extraction</SelectItem>
                  <SelectItem value="MAPPING">Mapping</SelectItem>
                  <SelectItem value="CONFLICT">Conflict</SelectItem>
                  <SelectItem value="DATA_REQUEST">Supplier Requests</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="EXTRACTION">Extraction</SelectItem>
                  <SelectItem value="MAPPING">Mapping</SelectItem>
                  <SelectItem value="CONFLICT">Conflict</SelectItem>
                  <SelectItem value="DATA_REQUEST">Supplier Requests</SelectItem>
                </SelectContent>
              </Select>

              {workQueueFilter === 'DATA_REQUEST' && (
                <Select value={reminderFilter} onValueChange={setReminderFilter}>
                  <SelectTrigger className="w-40 bg-white/80 backdrop-blur-sm border-2 border-slate-200 hover:border-slate-400 transition-all shadow-sm">
                    <SelectValue placeholder="Reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="due_soon">Due Soon (T-7)</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              )}
              </div>

            {/* Work Queue Table - Glassmorphic */}
            <Card className="border-2 border-slate-200 bg-white/70 backdrop-blur-md shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b-2 border-slate-200/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Work Item</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Object / Entity</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Priority</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Owner</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Created</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">SLA</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Financial Impact</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      {filteredWorkQueue.map((item) => {
                        const isHighlighted = highlightedWorkItemId === item.id;
                        return (
                        <tr 
                        key={item.id} 
                        className={`hover:bg-white/50 backdrop-blur-sm transition-all duration-200 border-slate-200/30 cursor-pointer ${
                          isHighlighted ? 'bg-amber-100/50 animate-pulse-highlight' : ''
                        }`}
                        onClick={(e) => {
                          if (e.target.tagName === 'A' || e.target.closest('a')) return;
                          handleOpenWorkItem(item);
                        }}
                        >
                        <td className="px-6 py-4 text-sm font-mono text-slate-900 font-medium">{item.id}</td>
                        <td className="px-6 py-4 text-sm">
                           <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                             {item.type}
                           </Badge>
                         </td>
                        <td className="px-6 py-4 text-sm">
                         {item.type === 'DATA_REQUEST' ? (
                           <div className="flex flex-col gap-1">
                             {item.details?.supplier_name && (
                               <div className="flex items-center gap-2">
                                 <span className="text-xs text-slate-500">Supplier:</span>
                                 <span className="text-sm font-medium text-slate-900">{item.details.supplier_name}</span>
                               </div>
                             )}
                             {item.details?.dataset_type && (
                               <Badge variant="outline" className="text-xs w-fit">{item.details.dataset_type}</Badge>
                             )}
                             {item.details?.due_date && (
                               <div className="flex items-center gap-1 text-xs text-slate-600">
                                 <Clock className="w-3 h-3" />
                                 Due: {new Date(item.details.due_date).toLocaleDateString()}
                               </div>
                             )}
                           </div>
                         ) : (
                           <div className="flex flex-col gap-1">
                            {item.linkedEvidenceId ? (
                                <button
                                  onClick={async (e) => {
                                                  e.stopPropagation();
                                                  try {
                                                    const { CTARouter } = await import('@/components/supplylens/CTARouter');
                                                    await CTARouter.openEvidenceDetail(item.linkedEvidenceId);
                                                  } catch (error) {
                                                    console.error('[ControlTower] Open evidence error:', error);
                                                  }
                                                }}
                                className="text-slate-900 hover:underline font-medium flex items-center gap-1 text-left"
                                >
                                {item.linkedEvidenceId}
                                <ExternalLink className="w-3 h-3" />
                                </button>
                            ) : (
                              <span className="text-slate-400 text-xs">No evidence</span>
                            )}
                            {item.linkedEntityRef ? (
                              <button
                                onClick={async (e) => {
                                   e.stopPropagation();
                                   try {
                                     const { CTARouter } = await import('@/components/supplylens/CTARouter');
                                     const entityType = item.linkedEntityRef.entityType;
                                     const entityId = item.linkedEntityRef.entityId;
                                     await CTARouter.openEntity(entityType, entityId);
                                   } catch (error) {
                                     console.error('[ControlTower] Open entity error:', error);
                                   }
                                 }}
                                className="text-blue-600 hover:underline text-xs flex items-center gap-1 text-left"
                              >
                                {item.linkedEntityRef.entityType}: {item.linkedEntityRef.entityId}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs">No entity</span>
                            )}
                           </div>
                         )}
                        </td>
                         <td className="px-6 py-4 text-sm">
                           <Badge variant="outline" className="border-slate-300 bg-white text-slate-900">{item.status}</Badge>
                         </td>
                         <td className="px-6 py-4 text-sm">
                           <Badge className="bg-slate-900 text-white">{item.priority}</Badge>
                         </td>
                         <td className="px-6 py-4 text-sm text-slate-600 font-light">{item.owner}</td>
                         <td className="px-6 py-4 text-sm text-slate-600 font-light">
                           {new Date(item.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                         </td>
                         <td className="px-6 py-4 text-sm">
                           <span className="text-slate-600 font-light">—</span>
                         </td>
                         <td className="px-6 py-4 text-sm">
                           <span className={`font-semibold ${(item.details?.financialRiskExposure || item.risk_eur || 0) > 10000 ? 'text-red-700' : 'text-slate-700'}`}>
                             €{((item.details?.financialRiskExposure || item.risk_eur || 0) / 1000).toFixed(1)}k
                           </span>
                         </td>
                         <td className="px-6 py-4 text-sm">
                           <Button
                               size="sm"
                               variant="outline"
                               className="border-2 border-slate-300 hover:border-slate-400 hover:bg-white/80 transition-all"
                               onClick={async (e) => {
                                 e.stopPropagation();
                                 await handleOpenWorkItem(item);
                               }}
                              >
                               Open
                              </Button>
                         </td>
                        </tr>
                        );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exceptions Tab - Filtered Work Queue */}
          <TabsContent value="exceptions" className="space-y-6">
            {/* Exceptions Table - Filtered Work Queue */}
            <Card className="border-2 border-slate-200 bg-white/70 backdrop-blur-md shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b-2 border-slate-200/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Work Item</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Object / Entity</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Priority</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Owner</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Financial Impact</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      {exceptions.length > 0 ? exceptions.map((item) => (
                        <tr 
                          key={item.id} 
                          className="hover:bg-red-50/30 backdrop-blur-sm transition-all duration-200 border-slate-200/30 cursor-pointer"
                          onClick={(e) => {
                            if (e.target.tagName === 'A' || e.target.closest('a')) return;
                            handleOpenWorkItem(item);
                          }}
                        >
                          <td className="px-6 py-4 text-sm font-mono text-slate-900 font-medium">{item.id}</td>
                          <td className="px-6 py-4 text-sm">
                            <Badge variant="outline" className="border-slate-300 bg-slate-50/50 text-slate-700">
                              {item.type}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-col gap-1">
                              {item.linkedEvidenceId ? (
                                  <button
                                    onClick={async (e) => {
                                         e.stopPropagation();
                                         try {
                                           const { CTARouter } = await import('@/components/supplylens/CTARouter');
                                           await CTARouter.openEvidenceDetail(item.linkedEvidenceId);
                                         } catch (error) {
                                           console.error('[ControlTower] Open evidence error (exceptions):', error);
                                         }
                                       }}
                                    className="text-slate-900 hover:underline font-medium flex items-center gap-1 text-left text-xs"
                                  >
                                    {item.linkedEvidenceId}
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                              ) : (
                                <span className="text-slate-400 text-xs">No evidence</span>
                              )}
                              {item.linkedEntityRef ? (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { CTARouter } = await import('@/components/supplylens/CTARouter');
                                      const entityType = item.linkedEntityRef.entityType;
                                      const entityId = item.linkedEntityRef.entityId;
                                      await CTARouter.openEntity(entityType, entityId);
                                    } catch (error) {
                                      console.error('[ControlTower] Open entity error (exceptions):', error);
                                    }
                                  }}
                                  className="text-blue-600 hover:underline text-xs flex items-center gap-1 text-left"
                                >
                                  {item.linkedEntityRef.entityType}: {item.linkedEntityRef.entityId}
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">No entity</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Badge variant="outline" className="border-slate-300 bg-white text-slate-900">{item.status}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Badge className="bg-slate-900 text-white">{item.priority}</Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-light">{item.owner}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="font-semibold text-slate-900">
                              €{((item.details?.financialRiskExposure || item.risk_eur || 0) / 1000).toFixed(1)}k
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50/80 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWorkItem(item);
                              }}
                            >
                              Resolve
                            </Button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="8" className="px-6 py-8 text-center text-sm text-slate-500">No exceptions detected</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          </Tabs>
      </div>

      {/* Ingestion Wizard Modal */}
      {showIngestionWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <IngestionWizardRegistryDriven
            onComplete={() => setShowIngestionWizard(false)}
            onCancel={() => setShowIngestionWizard(false)}
            mode="production"
          />
        </div>
      )}

      {/* Work Item Drawer */}
      {selectedWorkItem && (
        <WorkItemDrawer
          item={selectedWorkItem}
          onClose={handleCloseWorkItem}
          onApprove={handleApprove}
          onReject={handleReject}
          onRefresh={refetchWorkItems}
        />
      )}
      
      {/* Integration Health Modal */}
      <IntegrationHealthModal open={showIntegrationHealth} onClose={() => setShowIntegrationHealth(false)} />
      
      {/* Financial Risk Drilldown */}
      <FinancialRiskDrilldown 
        open={showFinancialRiskDrilldown} 
        onClose={() => setShowFinancialRiskDrilldown(false)}
        workItems={workItems}
      />
      
      {/* Reminder Policy Engine */}
      <ReminderPolicyEngine 
        open={showReminderEngine} 
        onClose={() => {
          setShowReminderEngine(false);
          refetchWorkItems();
        }} 
      />

      {/* QA Console - Admin Only */}
      <QAConsole isAdmin={isAdmin} />
      </div>
    </TooltipProvider>
  );
}