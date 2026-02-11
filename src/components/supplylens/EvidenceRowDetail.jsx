import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Download, Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getTenant } from './mockDataRegistry';
import { EvidenceService } from './contract2/services';
import { ACTIVE_TENANT_ID } from './contract2/data';
import { safeDate } from './contract2/utils';
import VerifyHashesModal from './VerifyHashesModal';
import ExportPackageModal from './ExportPackageModal';
import { createGDPRExportRequest, createGDPRDeletionRequest } from './GDPRControlsUtility';
import EvidenceRecordDetailModal from './EvidenceRecordDetailModal';

export default function EvidenceRowDetail({ evidence, autoExpand = false, isExpanded = false, onToggleExpand = null, isHighlighted = false }) {
  const [expanded, setExpanded] = useState(autoExpand || isExpanded);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCreatingWorkItem, setIsCreatingWorkItem] = useState(false);
  const [bytesAccessDenied, setBytesAccessDenied] = useState(false);
  const tenant = getTenant();
  const currentTenant = 'BuyerOrgA'; // Auth context simulation
  const currentUserRole = 'buyer_user'; // Role simulation (buyer_user, admin, etc.)
  
  // Check if this is supplier-owned evidence viewed via grant
  const isGrantedEvidence = evidence.owner_org_id && evidence.owner_org_id !== currentTenant;
  const canViewBytes = currentUserRole === 'admin' || !isGrantedEvidence;
  
  // Auto-expand if highlighted
  useEffect(() => {
    if (isHighlighted || autoExpand || isExpanded) {
      setExpanded(true);
    }
  }, [isHighlighted, autoExpand, isExpanded]);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleCreateMappingWorkItem = async () => {
    if (isCreatingWorkItem) return;
    
    const recordId = evidence.record_id || evidence.recordId || evidence.id;
    if (!recordId) {
      toast.error('No record ID available [ERR-MAP-001]', {
        description: 'Cannot create work item without evidence ID'
      });
      return;
    }
    
    setIsCreatingWorkItem(true);
    
    try {
      const { CTARouter } = await import('./CTARouter');
      const result = await CTARouter.createMappingWorkItem(
        recordId,
        evidence.linked_entity?.id || null
      );
      
      if (result.success) {
        toast.success('Work item created', {
          description: `ID: ${result.work_item_id}`
        });
        // Navigate to work queue with auto-open
        await CTARouter.navigateToWorkQueue({ 
          work_item_id: result.work_item_id, 
          highlight: result.work_item_id 
        });
      } else {
        toast.error(`Failed to create work item [ERR-MAP-002]`, {
          description: result.error_code || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('[EvidenceRowDetail] Create mapping work item error [ERR-MAP-003]:', error);
      toast.error('Failed to create work item [ERR-MAP-003]', {
        description: error.message || 'Unknown error'
      });
    } finally {
      setIsCreatingWorkItem(false);
    }
  };



  return (
    <div className="border-t border-slate-200">
      <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors bg-white">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 font-mono">{evidence.displayId || evidence.evidence_id}</p>
              <Badge variant="outline" className="text-xs border-slate-300">{evidence.datasetType || evidence.dataset_type}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">{evidence.ingestionMethod || evidence.ingestion_method} • {evidence.sourceSystem || evidence.source_system}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Contract 2 Reconciliation Columns */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="text-slate-500 font-light">{safeDate(evidence.ingestedAtUtc, 'full')}</span>
          </div>
          <Badge className={
            evidence.mapStatus === 'MAPPED' ? 'bg-green-100 text-green-800 text-xs' :
            evidence.mapStatus === 'PENDING' ? 'bg-blue-100 text-blue-800 text-xs' :
            evidence.mapStatus === 'CONFLICT' ? 'bg-red-100 text-red-800 text-xs' :
            'bg-slate-100 text-slate-700 text-xs'
          }>{evidence.mapStatus}</Badge>
          <Badge className={
            evidence.readinessImpact === 'READY' ? 'bg-green-100 text-green-800 text-xs' :
            evidence.readinessImpact === 'READY_WITH_GAPS' ? 'bg-yellow-100 text-yellow-800 text-xs' :
            evidence.readinessImpact === 'PENDING_MATCH' ? 'bg-blue-100 text-blue-800 text-xs' :
            'bg-red-100 text-red-800 text-xs'
          }>{evidence.readinessImpact}</Badge>
          <Badge className={
            evidence.sealedStatus === 'SEALED' ? 'bg-green-100 text-green-700' :
            evidence.status === 'INGESTED' ? 'bg-blue-100 text-blue-700' :
            evidence.status === 'QUARANTINED' ? 'bg-red-100 text-red-700' :
            'bg-slate-100 text-slate-700'
          }>
            {evidence.sealedStatus}
          </Badge>
        </div>
      </div>

      {/* Actions - Always visible in compact row */}
      <div className="px-4 py-3 bg-slate-50/50 flex gap-2 border-t border-slate-200/60 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!evidence.record_id && !evidence.recordId && !evidence.id}
                    onClick={async () => {
                      try {
                        const recordId = evidence.record_id || evidence.recordId || evidence.id;
                        if (!recordId) {
                          toast.error('No record ID available [ERR-EV-001]');
                          return;
                        }
                        
                        const { CTARouter } = await import('./CTARouter');
                        const result = await CTARouter.openEvidenceDetail(recordId);
                        
                        if (!result.success) {
                          if (result.error_code === 'EVIDENCE_NOT_FOUND') {
                            toast.error('Evidence not found [ERR-EV-002]', {
                              description: 'BLOCKED work item created'
                            });
                          } else {
                            toast.error(`Navigation failed [ERR-EV-003]`, {
                              description: result.error_code || 'Unknown error'
                            });
                          }
                        }
                      } catch (error) {
                        console.error('[EvidenceRowDetail] View detail error [ERR-EV-004]:', error);
                        toast.error('Failed to open detail [ERR-EV-004]', {
                          description: error.message || 'Unknown error'
                        });
                      }
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Detail
                  </Button>
                </TooltipTrigger>
                {(!evidence.record_id && !evidence.recordId && !evidence.id) && (
                  <TooltipContent>
                    <p>No record ID - cannot open detail</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button size="sm" variant="outline" onClick={() => setShowVerifyModal(true)} className="gap-2 border border-slate-300 hover:bg-white/90 rounded-lg">
              <Shield className="w-3 h-3" />
              Verify Hashes
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      if (!canViewBytes) {
                        // Log denied access attempt
                        const accessLog = {
                          log_id: `LOG-${Date.now()}`,
                          evidence_id: evidence.recordId || evidence.record_id,
                          tenant: currentTenant,
                          actor: 'buyer_user@example.com',
                          action: 'EXPORT_BYTES_ATTEMPT',
                          allowed: false,
                          reason: 'ROLE_INSUFFICIENT',
                          timestamp: new Date().toISOString()
                        };
                        const logs = JSON.parse(localStorage.getItem('buyer_access_logs') || '[]');
                        logs.push(accessLog);
                        localStorage.setItem('buyer_access_logs', JSON.stringify(logs));
                        
                        toast.error('Bytes access restricted for granted evidence');
                        setBytesAccessDenied(true);
                        return;
                      }
                      setShowExportModal(true);
                    }} 
                    className="gap-2 border border-slate-300 hover:bg-white/90 rounded-lg"
                    disabled={isGrantedEvidence && !canViewBytes}
                  >
                    <Download className="w-3 h-3" />
                    Export Package
                  </Button>
                </TooltipTrigger>
                {isGrantedEvidence && !canViewBytes && (
                  <TooltipContent>
                    <p>Bytes access requires admin role for granted evidence</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {evidence.personal_data_flag && (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => {
                  const workItem = createGDPRDeletionRequest(
                    evidence.recordId || evidence.record_id,
                    currentTenant,
                    'user@example.com'
                  );
                  toast.success('GDPR Deletion Request submitted', {
                    description: 'Tombstone mark applied; crypto-shred on schedule'
                  });
                }}
              >
                <Trash2 className="w-3 h-3" />
                GDPR Delete
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleCreateMappingWorkItem} 
                    disabled={isCreatingWorkItem || (!evidence.record_id && !evidence.recordId && !evidence.id)}
                    className="gap-2 border border-slate-300 hover:bg-white/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                    {isCreatingWorkItem ? 'Creating...' : 'Create Mapping Work Item'}
                  </Button>
                </TooltipTrigger>
                {(!evidence.record_id && !evidence.recordId && !evidence.id) && (
                  <TooltipContent>
                    <p>No record ID - cannot create work item</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
              </div>

              <VerifyHashesModal open={showVerifyModal} onClose={() => setShowVerifyModal(false)} evidence={evidence} />
      <ExportPackageModal open={showExportModal} onClose={() => setShowExportModal(false)} evidence={evidence} />
      <EvidenceRecordDetailModal 
        evidence={evidence}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onNavigateToWorkQueue={(evidenceId) => {
          setShowDetailModal(false);
          window.location.href = `${createPageUrl('SupplyLens')}?filter=evidence:${evidenceId}`;
        }}
        onNavigateToEntity={(entityId) => {
          setShowDetailModal(false);
          window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity=${entityId}`;
        }}
        onNavigateToReview={(evidenceId) => {
          setShowDetailModal(false);
          window.location.href = `${createPageUrl('EvidenceVault')}?focus=${evidenceId}&tab=history`;
        }}
        onCreateWorkItem={handleCreateMappingWorkItem}
      />
    </div>
  );
}