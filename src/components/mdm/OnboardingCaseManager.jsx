import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FolderOpen, Clock, CheckCircle2, XCircle, AlertCircle,
  Building2, ChevronRight, Eye, GitBranch, FileText, Zap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function OnboardingCaseManager() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: cases = [] } = useQuery({
    queryKey: ['onboarding-cases'],
    queryFn: () => base44.entities.OnboardingCase.list('-created_date')
  });

  const { data: approvalTasks = [] } = useQuery({
    queryKey: ['approval-tasks'],
    queryFn: () => base44.entities.ApprovalTask.list('-created_date')
  });

  const { data: sourceRecords = [] } = useQuery({
    queryKey: ['source-records'],
    queryFn: () => base44.entities.SourceRecord.list('-created_date', 50)
  });

  const pendingCases = cases.filter(c => c.status !== 'approved' && c.status !== 'rejected' && c.status !== 'published');
  const approvalPending = cases.filter(c => c.status === 'approval_pending');

  // Publish approved case to golden record
  const publishMutation = useMutation({
    mutationFn: async (onboardingCase) => {
      const sourceRecord = sourceRecords.find(r => r.id === onboardingCase.source_record_id);
      
      if (!sourceRecord || !sourceRecord.normalized_data) {
        throw new Error('No normalized data available');
      }

      // Create golden Supplier record
      const goldenSupplier = await base44.entities.Supplier.create({
        ...sourceRecord.normalized_data,
        source: 'onboarding_case',
        onboarding_status: 'completed',
        onboarding_completion_date: new Date().toISOString()
      });

      // Update case
      await base44.entities.OnboardingCase.update(onboardingCase.id, {
        status: 'published',
        published_entity_id: goldenSupplier.id,
        completion_percentage: 100
      });

      // Update source record
      await base44.entities.SourceRecord.update(sourceRecord.id, {
        processing_status: 'published',
        matched_entity_id: goldenSupplier.id,
        matched_entity_type: 'Supplier'
      });

      // Create change log
      await base44.entities.ChangeLog.create({
        entity_type: 'Supplier',
        entity_id: goldenSupplier.id,
        change_type: 'publish',
        change_reason: `Published from onboarding case ${onboardingCase.case_number}`,
        approved_by: (await base44.auth.me()).email
      });

      return goldenSupplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-cases'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier published to master data');
      setShowDetailModal(false);
    }
  });

  const approveCase = async (caseId) => {
    try {
      await base44.entities.OnboardingCase.update(caseId, {
        status: 'approved'
      });

      // Create approval task
      await base44.entities.ApprovalTask.create({
        task_type: 'approve_supplier',
        onboarding_case_id: caseId,
        requested_by: (await base44.auth.me()).email,
        status: 'approved',
        decision_date: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['onboarding-cases'] });
      toast.success('Case approved');
    } catch (error) {
      toast.error('Approval failed: ' + error.message);
    }
  };

  const statusConfig = {
    initiated: { color: 'bg-slate-100 text-slate-600', icon: Clock },
    data_collection: { color: 'bg-blue-100 text-blue-700', icon: FileText },
    validation: { color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
    approval_pending: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
    approved: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    published: { color: 'bg-[#86b027]/10 text-[#86b027]', icon: Zap },
    rejected: { color: 'bg-rose-100 text-rose-700', icon: XCircle }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#02a1e8]" />
            Onboarding Case Manager
          </h3>
          <p className="text-sm text-slate-500">
            Track and approve supplier onboarding workflows
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Active Cases</p>
                <p className="text-2xl font-bold text-[#545454]">{pendingCases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Awaiting Approval</p>
                <p className="text-2xl font-bold text-[#545454]">{approvalPending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Published</p>
                <p className="text-2xl font-bold text-[#545454]">
                  {cases.filter(c => c.status === 'published').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <GitBranch className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Avg Completion</p>
                <p className="text-2xl font-bold text-[#545454]">
                  {cases.length > 0 
                    ? Math.round(cases.reduce((s, c) => s + (c.completion_percentage || 0), 0) / cases.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {cases.map(c => {
              const config = statusConfig[c.status] || statusConfig.initiated;
              const StatusIcon = config.icon;

              return (
                <div 
                  key={c.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:border-[#86b027] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCase(c);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn("p-2 rounded-lg", config.color)}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-slate-900">{c.case_number}</p>
                        <Badge variant="outline" className="capitalize text-xs">
                          {c.case_type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={config.color}>
                          {c.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Created {new Date(c.created_date).toLocaleDateString()}</span>
                        {c.assigned_to && <span>Assigned: {c.assigned_to}</span>}
                        {c.target_completion_date && (
                          <span>Due: {new Date(c.target_completion_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Progress</p>
                      <Progress value={c.completion_percentage || 0} className="h-2 w-24" />
                      <p className="text-xs font-bold text-slate-600 mt-1">{c.completion_percentage || 0}%</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Case Detail Modal */}
      {selectedCase && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#02a1e8]" />
                {selectedCase.case_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Status</p>
                  <Badge className={statusConfig[selectedCase.status]?.color}>
                    {selectedCase.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Completion</p>
                  <Progress value={selectedCase.completion_percentage || 0} className="h-2 mb-2" />
                  <p className="font-bold text-slate-900">{selectedCase.completion_percentage || 0}%</p>
                </div>
              </div>

              {selectedCase.status === 'approval_pending' && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await base44.entities.OnboardingCase.update(selectedCase.id, { status: 'rejected' });
                      queryClient.invalidateQueries({ queryKey: ['onboarding-cases'] });
                      toast.success('Case rejected');
                      setShowDetailModal(false);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => approveCase(selectedCase.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}

              {selectedCase.status === 'approved' && (
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    className="bg-[#86b027] hover:bg-[#769c22]"
                    onClick={() => publishMutation.mutate(selectedCase)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Publish to Master Data
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}