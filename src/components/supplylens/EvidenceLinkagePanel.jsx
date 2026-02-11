// Evidence Linkage & Decisions Panel - for Network pages
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Plus, CheckCircle, XCircle, GripVertical, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { MappingService, WorkItemService, DecisionService } from './contract2/services';
import { ACTIVE_TENANT_ID } from './contract2/data';
import { useQueryClient } from '@tanstack/react-query';
import AISuggestionsReviewModal from './AISuggestionsReviewModal';

export default function EvidenceLinkagePanel({ entity, entityType, linkedEvidence = [], onClose, onRefresh }) {
  const [showAISuggestionsModal, setShowAISuggestionsModal] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drawerRef = React.useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadData = async () => {
      if (entity?.entityId) {
        const { demoStore } = await import('./DemoDataStore');
        
        // Load AI suggestions
        const suggestions = demoStore.listMappingSuggestions({ status: 'PENDING' });
        const entitySuggestions = suggestions.filter(s => 
          s.target_entity_id === entity.entityId || s.source_entity_name?.includes(entity.name)
        );
        setAISuggestions(entitySuggestions);
        
        // Load decisions
        const allDecisions = demoStore.listDecisions();
        const entityDecisions = allDecisions.filter(d => 
          d.entity_refs?.includes(entity.entityId)
        );
        setDecisions(entityDecisions);
      }
    };
    
    loadData();
  }, [entity]);

  const handleMouseDown = (e) => {
    // Exclude buttons, links, and interactive elements
    if (e.target.closest('button, a, input, textarea, select')) {
      return;
    }
    
    setIsDragging(true);
    const drawer = drawerRef.current;
    const rect = drawer.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && drawerRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleApproveSuggestion = async (suggestion, reasonCode, comment) => {
    const { demoStore } = await import('./DemoDataStore');
    
    // Update suggestion status
    const updatedSuggestion = demoStore.approveMappingSuggestion(
      suggestion.suggestion_id, 
      comment || 'Approved via AI Suggestions modal'
    );
    
    // Refresh local state
    setAISuggestions(aiSuggestions.filter(s => s.suggestion_id !== suggestion.suggestion_id));
    
    // Fetch updated decisions
    const allDecisions = demoStore.listDecisions();
    const entityDecisions = allDecisions.filter(d => 
      d.entity_refs?.includes(entity.entityId)
    );
    setDecisions(entityDecisions);
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['demo-decisions'] });
    
    toast.success('✓ Mapping approved • Decision logged');
    onRefresh?.();
  };

  const handleRejectSuggestion = async (suggestion, reasonCode, comment) => {
    const { demoStore } = await import('./DemoDataStore');
    
    // Update suggestion status
    demoStore.rejectMappingSuggestion(suggestion.suggestion_id, comment);
    
    // Refresh local state
    setAISuggestions(aiSuggestions.filter(s => s.suggestion_id !== suggestion.suggestion_id));
    
    toast.error('✗ Mapping rejected • Decision logged');
    onRefresh?.();
  };

  const handleCreateMappingWorkItem = async () => {
    const { demoStore } = await import('./DemoDataStore');
    
    // Determine priority based on readiness
    const priority = entity.readiness === 'NOT_READY' ? 'CRITICAL' : 
                     entity.readiness === 'CONFLICT' ? 'HIGH' : 'HIGH';
    
    // Calculate financial risk
    const financial_risk_eur = entityType === 'SUPPLIER' ? 1500 : 800;
    
    // Determine reason codes
    const reasonCodes = [];
    if (entity.readiness === 'NOT_READY') reasonCodes.push('ENTITY_NOT_READY');
    if (entity.readiness === 'CONFLICT') reasonCodes.push('DATA_CONFLICT');
    if (entity.readiness === 'PENDING_MATCH') reasonCodes.push('PENDING_MATCH');
    if (linkedEvidence.length === 0) reasonCodes.push('NO_EVIDENCE');
    if (reasonCodes.length === 0) reasonCodes.push('NAME_MISMATCH');
    
    const workItem = demoStore.createWorkItem({
      type: 'MAPPING',
      priority,
      title: `Map ${entityType} ${entity.legalName || entity.name}`,
      required_action_text: `Resolve mapping for ${entityType} ${entity.entityId}`,
      reason_codes: reasonCodes,
      linked_entity: { type: entityType, id: entity.entityId },
      linked_evidence_record_ids: linkedEvidence.map(e => e.id || e.record_id),
      estimated_cost_eur: financial_risk_eur,
      risk_eur: financial_risk_eur
    });
    
    // Invalidate queries to refresh UI
    queryClient.invalidateQueries({ queryKey: ['demo-work-items'] });
    queryClient.invalidateQueries({ queryKey: ['demo-kpis'] });
    
    toast.success(`✓ Work item ${workItem.work_item_id} created`, {
      description: `Priority: ${priority} • Risk: €${financial_risk_eur}`
    });
    
    // Navigate to Control Tower Work Queue
    setTimeout(() => {
      navigate(`${createPageUrl('SupplyLens')}?highlight=${workItem.work_item_id}`);
      onClose?.();
    }, 500);
  };

  const handleRequestEvidence = () => {
    if (entityType !== 'SUPPLIER') {
      toast.error('Evidence requests only supported for suppliers');
      return;
    }

    // Create SUPPLIER_REQUEST work item
    const workItem = WorkItemService.create(ACTIVE_TENANT_ID, {
      type: 'SUPPLIER_REQUEST',
      priority: 'MEDIUM',
      linkedEntityRef: { entityType: 'SUPPLIER', entityId: entity.entityId },
      details: {
        reason: `Evidence request for ${entity.legalName || entity.name}`,
        request_token: `token_${Date.now()}`,
        requested_datasets: ['SUPPLIER_MASTER_V1', 'EMISSIONS_DECLARATION_V1']
      }
    });

    const portalUrl = `${window.location.origin}${window.location.pathname}#/supplier-portal?token=demo`;
    
    toast.success('Request created! Portal link copied to clipboard', {
      description: 'Share this link with the supplier'
    });
    
    navigator.clipboard.writeText(portalUrl);
  };

  if (!entity) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div 
        ref={drawerRef}
        onMouseDown={handleMouseDown}
        className="fixed w-[640px] bg-white/95 backdrop-blur-2xl border border-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.15)] overflow-hidden rounded-2xl pointer-events-auto flex flex-col"
        style={{
          top: position.y ? `${position.y}px` : '50%',
          left: position.x ? `${position.x}px` : '50%',
          transform: !position.x && !position.y ? 'translate(-50%, -50%)' : 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          maxHeight: '85vh',
          height: '85vh',
        }}
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-10">
          <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <h2 className="text-lg font-light text-slate-900">Evidence Linkage & Decisions</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar" style={{scrollbarColor: 'rgba(100, 116, 139, 0.3) transparent'}}>
          {/* Coverage Summary Banner */}
           <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 backdrop-blur-sm">
             <p className="text-xs text-slate-700 font-light">
               <strong>Coverage Summary:</strong> These evidence records support this entity. Exports depend on this coverage.
             </p>
           </div>

           <Card className="bg-white/80 backdrop-blur-xl border border-slate-200">
             <CardHeader>
               <CardTitle className="text-sm font-light text-slate-900">Entity</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2 text-sm">
               <div className="flex justify-between">
                 <span className="text-slate-600">Type</span>
                 <Badge className="bg-slate-100 text-slate-800 border border-slate-300">{entityType}</Badge>
               </div>
               <div className="flex justify-between">
                 <span className="text-slate-600">ID</span>
                 <p className="font-mono text-slate-900">{entity.entityId}</p>
               </div>
               <div className="flex justify-between">
                 <span className="text-slate-600">Name</span>
                 <p className="text-slate-900">{entity.legalName || entity.name}</p>
               </div>
             </CardContent>
           </Card>

           {/* Evidence Coverage Section */}
           <Card className="bg-white/80 backdrop-blur-xl border border-slate-200">
             <CardHeader>
               <CardTitle className="text-sm font-light text-slate-900">Evidence Coverage ({linkedEvidence.length})</CardTitle>
             </CardHeader>
             <CardContent className="space-y-2">
               {linkedEvidence.map((ev) => (
                 <Link 
                   key={ev.id} 
                   to={`${createPageUrl('EvidenceRecordDetail')}?record_id=${ev.id}`}
                   className="block"
                 >
                   <div className="bg-slate-50 p-3 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-100 transition-all cursor-pointer">
                     <div className="flex items-center justify-between">
                       <p className="font-mono text-xs text-slate-900 font-semibold">{ev.displayId}</p>
                       <ExternalLink className="w-3 h-3 text-slate-400" />
                     </div>
                     <p className="text-xs text-slate-600 mt-1">{ev.datasetType}</p>
                   </div>
                 </Link>
               ))}
               {linkedEvidence.length === 0 && (
                 <p className="text-xs text-slate-400 text-center py-4">No linked evidence</p>
               )}
             </CardContent>
           </Card>

           <Card className="bg-white/80 backdrop-blur-xl border border-slate-200">
             <CardHeader>
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-light text-slate-900">Mapping Decisions ({decisions.length})</CardTitle>
                 <Button 
                   size="sm" 
                   variant="outline"
                   onClick={() => setShowAISuggestionsModal(true)}
                   className="text-xs bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                 >
                   Review AI Suggestions
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="space-y-2">
               {decisions.map((decision) => (
                 <div key={decision.decision_id} className="bg-slate-50 p-3 rounded border border-slate-200">
                   <div className="flex items-center justify-between mb-2">
                     <Badge className={
                       decision.decision_type?.includes('APPROVE') ? 'bg-green-100 text-green-800 border border-green-300' :
                       'bg-red-100 text-red-800 border border-red-300'
                     }>{decision.decision_type}</Badge>
                     <span className="text-xs text-slate-500 font-mono">{new Date(decision.timestamp).toLocaleDateString('en-GB', { timeZone: 'Europe/Amsterdam', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                   </div>
                   <p className="text-xs text-slate-700">Reason: {decision.reason_code}</p>
                   <p className="text-xs text-slate-600">By: {decision.actor}</p>
                 </div>
               ))}
               {decisions.length === 0 && (
                 <p className="text-xs text-slate-400 text-center py-4">No decisions yet</p>
               )}
             </CardContent>
           </Card>

           {/* Open Work Items Section */}
           <Card className="bg-white/80 backdrop-blur-xl border border-slate-200">
             <CardHeader>
               <CardTitle className="text-sm font-light text-slate-900">Open Work Items</CardTitle>
             </CardHeader>
             <CardContent>
               <Link to={`${createPageUrl('SupplyLens')}?entity_id=${entity.entityId}`}>
                 <Button 
                   variant="outline"
                   className="w-full justify-between bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                 >
                   View Work Queue for this Entity
                   <ExternalLink className="w-4 h-4" />
                 </Button>
               </Link>
               <p className="text-xs text-slate-500 mt-2 text-center">Filtered by entity ID</p>
             </CardContent>
           </Card>

           <div className="flex flex-wrap gap-2">
             <Button 
               onClick={handleCreateMappingWorkItem}
               size="sm"
               className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-light"
             >
               <Plus className="w-3 h-3" />
               Create Mapping Work Item
             </Button>

             {entityType === 'SUPPLIER' && (
               <Button 
                 onClick={handleRequestEvidence}
                 size="sm"
                 className="bg-slate-900 hover:bg-slate-800 text-white gap-2 font-light border border-slate-900"
               >
                 <Send className="w-3 h-3" />
                 Request Evidence from Supplier
               </Button>
             )}
           </div>
        </div>
      </div>

      {/* AI Suggestions Modal */}
      <AISuggestionsReviewModal
        open={showAISuggestionsModal}
        onClose={() => setShowAISuggestionsModal(false)}
        suggestions={aiSuggestions}
        onApprove={handleApproveSuggestion}
        onReject={handleRejectSuggestion}
        entityType={entityType}
      />
    </div>,
    document.body
  );
}