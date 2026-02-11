import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Database, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function WorkItemDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const workItemId = searchParams.get('id') || searchParams.get('work_item_id');

  const { data: workItem = null, isLoading } = useQuery({
    queryKey: ['workItem', workItemId],
    queryFn: async () => {
      if (!workItemId) return null;
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const item = demoStore.getWorkItem(workItemId);
      if (!item) {
        toast.error(`Work item ${workItemId} not found`);
        navigate(createPageUrl('SupplyLens'));
        return null;
      }
      return item;
    },
    enabled: !!workItemId
  });

  const { data: linkedEvidence = [] } = useQuery({
    queryKey: ['workItem-evidence', workItemId],
    queryFn: async () => {
      if (!workItem?.linked_evidence_record_ids) return [];
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return workItem.linked_evidence_record_ids.map(id => 
        demoStore.getEvidenceByRecordId(id)
      ).filter(Boolean);
    },
    enabled: !!workItem
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Loading work item...</div>
      </div>
    );
  }

  if (!workItem) return null;

  const handleOpenEvidence = (evidenceRecordId) => {
    const { demoStore } = require('@/components/supplylens/DemoDataStore');
    const evidence = demoStore.getEvidenceByRecordId(evidenceRecordId);
    if (evidence?.display_id) {
      navigate(`${createPageUrl('EvidenceVault')}?focus=${evidence.display_id}`);
    } else {
      toast.error('Evidence record not found');
    }
  };

  const handleOpenEntity = () => {
    if (!workItem.linked_entity) {
      toast.error('No linked entity');
      return;
    }
    const entityType = workItem.linked_entity.type;
    const entityId = workItem.linked_entity.id;
    const tab = entityType === 'SUPPLIER' ? 'suppliers' : 
                entityType === 'SKU' ? 'skus' :
                entityType === 'BOM' ? 'bom' :
                entityType === 'SITE' ? 'suppliers' : 'suppliers';
    navigate(`${createPageUrl('SupplyLensNetwork')}?tab=${tab}&focus=${entityId}&entity_type=${entityType}&entity_id=${entityId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to={createPageUrl('SupplyLens')}>
              <Button variant="ghost" size="sm" className="hover:bg-white/50 backdrop-blur-sm gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
                Back to Control Tower
              </Button>
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.15em] font-medium mb-2">
              <Database className="w-3.5 h-3.5" />
              SupplyLens • Work Queue
            </div>
            <h1 className="text-3xl font-light text-slate-900 tracking-tight">Work Item {workItem.work_item_id}</h1>
            <p className="text-slate-600 font-light mt-1">{workItem.title}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        {/* Status Bar */}
        <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg p-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Type</p>
              <Badge variant="outline" className="text-sm">{workItem.type}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Status</p>
              <Badge className={
                workItem.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                workItem.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                workItem.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                'bg-slate-100 text-slate-800'
              }>{workItem.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Priority</p>
              <Badge className={
                workItem.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                workItem.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                'bg-slate-500 text-white'
              }>{workItem.priority}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Owner</p>
              <p className="text-sm text-slate-900">{workItem.owner || 'Unassigned'}</p>
            </div>
          </div>
        </div>

        {/* Required Action */}
        <Card className="border-2 border-slate-200 bg-white/80">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Required Action</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{workItem.required_action_text || 'No action specified'}</p>
            {workItem.estimated_cost_eur && (
              <p className="text-xs text-amber-700 mt-2">Estimated Impact: €{workItem.estimated_cost_eur.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>

        {/* Linked Objects */}
        <div className="grid grid-cols-2 gap-6">
          {/* Linked Evidence */}
          <Card className="border border-slate-200 bg-white/80">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Linked Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedEvidence.length > 0 ? linkedEvidence.map(ev => (
                <div key={ev.record_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-mono text-slate-900">{ev.display_id}</p>
                    <p className="text-xs text-slate-600">{ev.dataset_type}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOpenEvidence(ev.record_id)}
                    className="gap-2"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No linked evidence</p>
              )}
            </CardContent>
          </Card>

          {/* Linked Entity */}
          <Card className="border border-slate-200 bg-white/80">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Linked Entity</CardTitle>
            </CardHeader>
            <CardContent>
              {workItem.linked_entity ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900">{workItem.linked_entity.type}</p>
                  <p className="text-xs text-slate-600 font-mono">{workItem.linked_entity.id}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleOpenEntity}
                    className="gap-2 mt-3 w-full"
                  >
                    Open Entity <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No linked entity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => toast.info('Reject functionality: POST /api/work_items/:id/reject with {reason_code, comment}')}
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
          <Button
            className="gap-2 bg-slate-900 hover:bg-slate-800"
            onClick={() => toast.info('Approve functionality: POST /api/work_items/:id/approve with {reason_code, comment}')}
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}