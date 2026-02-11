import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle, Shield, CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function DraftsPanel() {
  const [expandedDrafts, setExpandedDrafts] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const [sealSuccessModal, setSealSuccessModal] = useState(null);
  const [isSealing, setIsSealing] = useState({});

  const { data: drafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['evidence-drafts'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.listEvidenceDrafts();
    }
  });

  const handleValidate = async (draft) => {
    try {
      const draftId = draft.draft_id || draft.id;
      const response = await base44.functions.invoke('validateEvidenceDraft', { draft_id: draftId });
      
      if (!response.data) {
        throw new Error('No response data from validation');
      }
      
      setValidationResults(prev => ({
        ...prev,
        [draftId]: { 
          valid: response.data.status === 'READY_FOR_SEAL',
          errors: response.data.errors?.map(e => ({ field: 'general', message: e })) || []
        }
      }));
      
      setExpandedDrafts(prev => ({
        ...prev,
        [draftId]: true
      }));
      
      await refetchDrafts();
      
      if (response.data.status === 'READY_FOR_SEAL') {
        toast.success('✓ Validation passed - Ready to seal');
      } else {
        toast.error(`Validation failed - ${response.data.errors?.length || 0} issue(s) detected`);
      }
    } catch (error) {
      console.error('[DraftsPanel] Validate error:', error);
      toast.error('Validation failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleSeal = async (draft) => {
    const draftId = draft.draft_id || draft.id;
    
    if (draft.status !== 'READY_TO_SEAL' && draft.status !== 'READY_FOR_SEAL') {
      toast.error('Draft must be validated before sealing');
      return;
    }
    
    setIsSealing(prev => ({ ...prev, [draftId]: true }));
    
    try {
      const response = await base44.functions.invoke('sealEvidenceDraft', { draft_id: draftId });
      
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Sealing failed');
      }
      
      await refetchDrafts();
      
      // Fetch the sealed evidence record
      const evidenceRecords = await base44.entities.EvidenceRecord.filter({ evidence_draft_id: draftId });
      const sealedEvidence = evidenceRecords[0];
      
      if (sealedEvidence) {
        const displayId = sealedEvidence.display_id || `EV-${String(sealedEvidence.id).padStart(4, '0')}`;
        
        setSealSuccessModal({
          evidence: {
            display_id: displayId,
            record_id: sealedEvidence.id,
            ingestion_method: draft.ingestion_method,
            source_system: draft.source_system || 'MANUAL',
            sealed_at_utc: sealedEvidence.sealed_at_utc,
            retention_ends_utc: new Date(new Date(sealedEvidence.sealed_at_utc).getTime() + (7 * 365 * 24 * 60 * 60 * 1000)).toISOString(),
            bound_entity_id: sealedEvidence.bound_entity_id,
            bound_entity_type: sealedEvidence.binding_target_type,
            payload_hash_sha256: sealedEvidence.payload_sha256,
            metadata_hash_sha256: sealedEvidence.metadata_sha256,
            blocking_issues: sealedEvidence.reconciliation_status === 'UNBOUND' ? ['Scope binding not resolved'] : []
          },
          draft: draft
        });
        
        toast.success(`✓ Evidence sealed: ${displayId}`);
      } else {
        toast.success(`✓ Evidence sealed successfully`);
      }
    } catch (error) {
      console.error('[DraftsPanel] Seal error:', error);
      toast.error(error.message || 'Failed to seal evidence');
    } finally {
      setIsSealing(prev => ({ ...prev, [draftId]: false }));
    }
  };

  const toggleExpand = (draftId) => {
    setExpandedDrafts(prev => ({
      ...prev,
      [draftId]: !prev[draftId]
    }));
  };

  const getRetentionDisplay = (draft) => {
    if (draft.retention_ends_utc) {
      return new Date(draft.retention_ends_utc).toLocaleDateString();
    }
    return 'Policy Default (7 years)';
  };

  return (
    <div className="space-y-3">
      {drafts.length === 0 ? (
        <Card className="border-2 border-slate-200 bg-white/80 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">No drafts found</p>
          </CardContent>
        </Card>
      ) : (
        drafts.map((draft) => {
          const draftId = draft.draft_id || draft.id;
          const isExpanded = expandedDrafts[draftId];
          const validation = validationResults[draftId] || { 
            valid: draft.status === 'READY_TO_SEAL' || draft.status === 'READY_FOR_SEAL', 
            errors: draft.validation_errors || [] 
          };
          const isQuarantined = draft.status === 'QUARANTINED' || validation.errors.length > 0;
          
          return (
            <Card key={draftId} className="border-2 border-slate-200 bg-white/90 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <button
                    onClick={() => toggleExpand(draftId)}
                    className="w-full flex items-center justify-between hover:bg-slate-50/50 -m-2 p-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <FileText className="w-4 h-4 text-slate-600" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-900">{draft.evidence_type}</p>
                        <p className="text-xs text-slate-600 font-mono">{draftId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{draft.ingestion_method}</Badge>
                      <Badge className={
                        draft.status === 'READY_TO_SEAL' || draft.status === 'READY_FOR_SEAL' ? 'bg-green-100 text-green-800 border-green-200' :
                        draft.status === 'VALIDATION_FAILED' || draft.status === 'QUARANTINED' ? 'bg-red-100 text-red-800 border-red-200' :
                        draft.status === 'SEALED' ? 'bg-slate-900 text-white' :
                        'bg-slate-100 text-slate-600'
                      }>
                        {draft.status}
                      </Badge>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 pt-3 border-t border-slate-200/60">
                      {/* Validation Results */}
                      <div className="bg-slate-50/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Validation Status</p>
                        
                        {validation.errors.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <p className="text-xs font-semibold text-red-900">Quarantine Reasons:</p>
                            </div>
                            {validation.errors.map((err, idx) => (
                              <div key={idx} className="text-xs text-red-700 ml-6">
                                • {err.field}: {err.message}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <p className="text-xs text-green-700 font-semibold">All validations passed</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          <div>
                            <p className="text-slate-600 font-medium">Scope Binding</p>
                            <p className="text-slate-900 font-mono">{draft.bound_entity_id ? 'BOUND' : 'UNRESOLVED'}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">Retention Ends</p>
                            <p className="text-slate-900">{getRetentionDisplay(draft)}</p>
                          </div>
                          {draft.payload_hash_sha256 && (
                            <>
                              <div className="col-span-2">
                                <p className="text-slate-600 font-medium">Payload Hash (SHA-256)</p>
                                <code className="text-[10px] font-mono text-slate-700 break-all">{draft.payload_hash_sha256}</code>
                              </div>
                              <div className="col-span-2">
                                <p className="text-slate-600 font-medium">Metadata Hash (SHA-256)</p>
                                <code className="text-[10px] font-mono text-slate-700 break-all">{draft.metadata_hash_sha256}</code>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {draft.status !== 'SEALED' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 border-slate-300 hover:bg-slate-50"
                            onClick={() => handleValidate(draft)}
                            disabled={isSealing[draftId]}
                          >
                            <Shield className="w-3 h-3" />
                            Validate
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleSeal(draft)}
                            disabled={(draft.status !== 'READY_TO_SEAL' && draft.status !== 'READY_FOR_SEAL') || isSealing[draftId]}
                          >
                            <Shield className="w-3 h-3" />
                            {isSealing[draftId] ? 'Sealing...' : 'Seal Evidence'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Seal Success Modal */}
      <Dialog open={!!sealSuccessModal} onOpenChange={() => setSealSuccessModal(null)}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-white/95 to-slate-50/90 backdrop-blur-xl border-2 border-slate-200/60 cursor-grab active:cursor-grabbing" draggable aria-describedby="seal-success-description">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-1">
              <Shield className="w-5 h-5 text-green-600" />
              <DialogTitle className="text-lg font-light tracking-tight">Evidence Sealed</DialogTitle>
            </div>
            <div className="w-12 h-1 bg-gradient-to-r from-transparent via-[#86b027]/30 to-transparent rounded-full cursor-grab"></div>
          </DialogHeader>
          <div id="seal-success-description" className="space-y-6 p-4">
            {sealSuccessModal && (
              <>
                {/* Evidence Details */}
                <Card className="bg-white/60 border border-slate-200/60">
                  <CardHeader className="border-b border-slate-200/50 pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Sealed Evidence</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-slate-600 font-medium">Evidence ID</p>
                        <code className="text-slate-900 font-mono font-semibold">{sealSuccessModal.evidence.display_id}</code>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Record ID</p>
                        <code className="text-slate-900 font-mono text-[10px]">{sealSuccessModal.evidence.record_id}</code>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Ingestion Method</p>
                        <p className="text-slate-900">{sealSuccessModal.evidence.ingestion_method}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Source System</p>
                        <p className="text-slate-900">{sealSuccessModal.evidence.source_system}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Sealed At (UTC)</p>
                        <p className="text-slate-900">{new Date(sealSuccessModal.evidence.sealed_at_utc).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Retention Ends (UTC)</p>
                        <p className="text-slate-900">{new Date(sealSuccessModal.evidence.retention_ends_utc).toLocaleDateString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-600 font-medium">Scope Binding</p>
                        <Badge className={
                          sealSuccessModal.evidence.bound_entity_id ? 'bg-green-100 text-green-800' :
                          sealSuccessModal.evidence.blocking_issues?.length > 0 ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }>
                          {sealSuccessModal.evidence.bound_entity_id ? 'BOUND' : 
                           sealSuccessModal.evidence.blocking_issues?.length > 0 ? 'QUARANTINED' : 
                           'UNRESOLVED'}
                        </Badge>
                        {sealSuccessModal.evidence.blocking_issues?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {sealSuccessModal.evidence.blocking_issues.map((issue, idx) => (
                              <p key={idx} className="text-xs text-red-700">• {issue}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-600 font-medium mb-1">Payload Hash (SHA-256)</p>
                        <code className="text-[9px] font-mono text-slate-700 break-all">{sealSuccessModal.evidence.payload_hash_sha256}</code>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-600 font-medium mb-1">Metadata Hash (SHA-256)</p>
                        <code className="text-[9px] font-mono text-slate-700 break-all">{sealSuccessModal.evidence.metadata_hash_sha256}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Next Actions */}
                <Card className="bg-gradient-to-br from-[#86b027]/5 to-[#86b027]/10 border border-[#86b027]/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Next Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start gap-2 border-slate-300 hover:bg-white"
                      onClick={() => {
                        setSealSuccessModal(null);
                        window.location.href = `${createPageUrl('EvidenceRecordDetail')}?id=${sealSuccessModal.evidence.record_id}`;
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Evidence Record
                    </Button>
                    
                    {sealSuccessModal.evidence.bound_entity_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start gap-2 border-slate-300 hover:bg-white"
                        onClick={() => {
                          setSealSuccessModal(null);
                          window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity_type=${sealSuccessModal.evidence.bound_entity_type}&entity_id=${sealSuccessModal.evidence.bound_entity_id}`;
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Bound {sealSuccessModal.evidence.bound_entity_type}
                      </Button>
                    )}
                    
                    {sealSuccessModal.evidence.blocking_issues?.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start gap-2 border-red-300 hover:bg-red-50 text-red-700"
                        onClick={async () => {
                          try {
                            const { demoStore } = await import('@/components/supplylens/DemoDataStore');
                            const workItem = demoStore.createWorkItem({
                              type: 'REVIEW',
                              priority: 'HIGH',
                              title: `Resolve quarantine: ${sealSuccessModal.evidence.display_id}`,
                              required_action_text: `Address blocking issues: ${sealSuccessModal.evidence.blocking_issues.join(', ')}`,
                              linked_evidence_record_ids: [sealSuccessModal.evidence.record_id],
                              reason_codes: ['QUARANTINE_RESOLUTION']
                            });
                            
                            toast.success(`Work item created: ${workItem.work_item_id}`);
                            setSealSuccessModal(null);
                            window.location.href = `${createPageUrl('SupplyLens')}?highlight=${workItem.work_item_id}`;
                          } catch (error) {
                            toast.error('Failed to create work item');
                          }
                        }}
                      >
                        <AlertCircle className="w-3 h-3" />
                        Resolve Quarantine
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start gap-2 border-slate-300 hover:bg-white"
                      onClick={async () => {
                        try {
                          const { demoStore } = await import('@/components/supplylens/DemoDataStore');
                          const workItem = demoStore.createWorkItem({
                            type: 'MAPPING',
                            priority: 'MEDIUM',
                            title: `Mapping work for ${sealSuccessModal.evidence.display_id}`,
                            required_action_text: 'USER_INITIATED_MAPPING',
                            linked_evidence_record_ids: [sealSuccessModal.evidence.record_id],
                            linked_evidence_display_ids: [sealSuccessModal.evidence.display_id]
                          });
                          
                          toast.success(`Work item created: ${workItem.work_item_id}`);
                          setSealSuccessModal(null);
                          window.location.href = `${createPageUrl('SupplyLens')}?highlight=${workItem.work_item_id}`;
                        } catch (error) {
                          toast.error('Failed to create work item');
                        }
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Create Mapping Work Item
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}