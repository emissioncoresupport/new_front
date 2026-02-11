import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertCircle, Package, FileText, CheckCircle2, XCircle, Sparkles, Search, Plus, GripHorizontal } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ReviewHistoryPanel() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterEvidence = searchParams.get('filter_evidence');
  const filterEntity = searchParams.get('filter_entity');
  const filterEntityType = searchParams.get('filter_entity_type');
  
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [activeDecision, setActiveDecision] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');
  
  // Draggable dialog state
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { data: events = [] } = useQuery({
    queryKey: ['review-history'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const allEvents = demoStore.listAuditEvents();
      return allEvents.filter(e => 
        e.object_type === 'evidence_record' || e.object_type === 'evidence_draft'
      );
    }
  });

  const { data: suggestions = [], refetch: refetchSuggestions } = useQuery({
    queryKey: ['mapping-suggestions', filterEvidence, filterEntity, filterEntityType, statusFilter],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      let suggs = demoStore.listMappingSuggestions({ status: statusFilter === 'all' ? undefined : statusFilter });
      
      // Apply filters
      if (filterEvidence) {
        const evidence = demoStore.getEvidenceByDisplayId(filterEvidence) || demoStore.getEvidenceByRecordId(filterEvidence);
        if (evidence?.linked_entities) {
          suggs = suggs.filter(s => 
            evidence.linked_entities.some(le => le.id === s.target_entity_id || le.id === s.source_entity_id)
          );
        }
      }
      
      if (filterEntity && filterEntityType) {
        suggs = suggs.filter(s => s.target_entity_id === filterEntity);
      }
      
      return suggs;
    }
  });

  const handleApprove = async (suggestion) => {
    setActiveDecision({ suggestion, action: 'APPROVE' });
  };

  const handleReject = async (suggestion) => {
    setActiveDecision({ suggestion, action: 'REJECT' });
  };

  const submitDecision = async () => {
    if (!reasonCode) {
      toast.error('Reason code is required');
      return;
    }

    if (activeDecision.action === 'REJECT' && !comment) {
      toast.error('Comment is required for rejection');
      return;
    }

    try {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const user = { email: 'admin@example.com', id: 'user_admin' };
      
      if (activeDecision.action === 'APPROVE') {
        // Approve mapping suggestion
        demoStore.approveMappingSuggestion(activeDecision.suggestion.suggestion_id, comment || reasonCode);
        
        // Find and close related work item
        const workItems = demoStore.listWorkItems({ filters: { type: 'MAPPING' } }).data;
        const relatedWI = workItems.find(wi => 
          wi.linked_evidence_record_ids?.includes(activeDecision.suggestion.evidence_id)
        );
        
        if (relatedWI) {
          demoStore.resolveWorkItem(relatedWI.work_item_id, {
            outcome: 'APPROVED',
            reason_code: reasonCode,
            comment: comment || 'Mapping approved'
          });
        }
        
        // Log audit event
        demoStore.logAuditEvent({
          object_type: 'mapping_suggestion',
          object_id: activeDecision.suggestion.suggestion_id,
          event_type: 'MAPPING_APPROVED',
          actor: user.email,
          metadata: { 
            reason_code: reasonCode, 
            target_entity_id: activeDecision.suggestion.target_entity_id,
            work_item_id: relatedWI?.work_item_id 
          }
        });
        
        toast.success('✓ Mapping confirmed - Work item closed');
      } else {
        // Reject mapping suggestion
        demoStore.rejectMappingSuggestion(activeDecision.suggestion.suggestion_id, comment || reasonCode);
        
        // Keep work item open or create follow-up
        const workItems = demoStore.listWorkItems({ filters: { type: 'MAPPING' } }).data;
        const relatedWI = workItems.find(wi => 
          wi.linked_evidence_record_ids?.includes(activeDecision.suggestion.evidence_id)
        );
        
        if (relatedWI && relatedWI.status !== 'DONE') {
          // Update status to indicate rejection
          demoStore.updateWorkItem(relatedWI.work_item_id, { 
            status: 'OPEN',
            priority: 'HIGH' 
          });
        }
        
        // Log audit event
        demoStore.logAuditEvent({
          object_type: 'mapping_suggestion',
          object_id: activeDecision.suggestion.suggestion_id,
          event_type: 'MAPPING_REJECTED',
          actor: user.email,
          metadata: { 
            reason_code: reasonCode,
            comment: comment 
          }
        });
        
        toast.success('Mapping rejected - Work item remains open');
      }

      refetchSuggestions();
      setActiveDecision(null);
      setReasonCode('');
      setComment('');
    } catch (error) {
      console.error('[ReviewHistory] Decision error:', error);
      toast.error('Failed to save decision');
    }
  };

  const getEventIcon = (eventType) => {
    const icons = {
      SEALED: Shield,
      QUARANTINED: AlertCircle,
      PACKAGE_EXPORTED: Package,
      HASH_VERIFICATION: CheckCircle2,
      DRAFT_CREATED: FileText,
      DRAFT_UPDATED: FileText,
      WORK_ITEM_CREATED: AlertCircle
    };
    return icons[eventType] || FileText;
  };

  const getEventColor = (eventType) => {
    const colors = {
      SEALED: 'text-green-600',
      QUARANTINED: 'text-red-600',
      PACKAGE_EXPORTED: 'text-blue-600',
      HASH_VERIFICATION: 'text-green-600',
      DRAFT_CREATED: 'text-slate-600',
      DRAFT_UPDATED: 'text-slate-600',
      WORK_ITEM_CREATED: 'text-amber-600'
    };
    return colors[eventType] || 'text-slate-600';
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'PENDING');

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dialogPosition.x,
      y: e.clientY - dialogPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setDialogPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div className="space-y-6">
      {/* AI Suggestions Section */}
      <Card className="border border-slate-300/50 bg-gradient-to-br from-white via-slate-50/30 to-white backdrop-blur-xl shadow-lg rounded-xl">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white via-slate-50/30 to-white backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-slate-700" />
              <CardTitle className="text-base font-light tracking-tight text-slate-900">AI Mapping Suggestions</CardTitle>
              <Badge variant="outline" className="border-slate-300 text-slate-700 text-xs">
                Suggestion Only
              </Badge>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Confirmed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500 font-light">No suggestions available</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-4 gap-2"
                onClick={() => {
                  window.location.href = createPageUrl('SupplyLens');
                }}
              >
                <Plus className="w-3 h-3" />
                Create Work Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.suggestion_id} className="border-2 border-slate-200 bg-white/90 backdrop-blur-sm hover:shadow-lg transition-all">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{suggestion.mapping_type}</Badge>
                          <Badge className={
                            suggestion.confidence_score >= 90 ? 'bg-green-100 text-green-800' :
                            suggestion.confidence_score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {suggestion.confidence_score}% confidence
                          </Badge>
                          <Badge className={
                            suggestion.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' :
                            suggestion.status === 'REJECTED' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-amber-100 text-amber-800 border-amber-200'
                          }>
                            {suggestion.status === 'APPROVED' ? 'Confirmed' : suggestion.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 mb-1">
                          {suggestion.source_entity_name || 'Unknown'} → {suggestion.target_entity_name}
                        </p>
                        <p className="text-xs text-slate-600 mb-2">
                          Target ID: <span className="font-mono">{suggestion.target_entity_id}</span>
                        </p>
                        <div className="bg-slate-50 rounded p-2 mb-2">
                          <p className="text-xs text-slate-700 font-light">{suggestion.reasoning}</p>
                        </div>
                        {suggestion.matched_attributes?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {suggestion.matched_attributes.map((attr, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {attr}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {suggestion.status === 'PENDING' && (
                      <div className="flex gap-2 pt-3 border-t border-slate-200">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-black hover:bg-slate-800 text-white gap-2"
                          onClick={() => handleApprove(suggestion)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Confirm
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 border-slate-300 text-slate-900 hover:bg-slate-50 gap-2"
                          onClick={() => handleReject(suggestion)}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Events History */}
      <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <CardTitle className="text-base font-light tracking-tight text-slate-900">Audit Events</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
      {events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-600 font-light">No events found</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />
          
          {events.map((event, idx) => {
            const Icon = getEventIcon(event.event_type);
            const iconColor = getEventColor(event.event_type);
            
            return (
              <div key={event.event_id} className="relative pl-14 pb-6">
                <div className={`absolute left-0 w-12 h-12 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <Card className="border-2 border-slate-200 bg-white/90 backdrop-blur-xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{event.event_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {new Date(event.timestamp).toLocaleString('en-GB', { 
                            timeZone: 'Europe/Amsterdam',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {event.object_type}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Object:</span>
                        {event.metadata?.display_id ? (
                          <Link 
                            to={`${createPageUrl('EvidenceVault')}?focus=${event.metadata.display_id}`}
                            className="text-blue-600 hover:underline font-mono"
                          >
                            {event.metadata.display_id}
                          </Link>
                        ) : (
                          <span className="text-slate-900 font-mono">{event.object_id}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Actor:</span>
                        <span className="text-slate-900">{event.actor}</span>
                      </div>
                      
                      {event.metadata?.evidence_type && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">Evidence Type:</span>
                          <Badge variant="outline">{event.metadata.evidence_type}</Badge>
                        </div>
                      )}
                      
                      {event.metadata?.result && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">Result:</span>
                          <Badge className={event.metadata.result === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {event.metadata.result}
                          </Badge>
                        </div>
                      )}
                      
                      {event.metadata?.draft_id && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">Draft ID:</span>
                          <span className="text-slate-900 font-mono">{event.metadata.draft_id}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
        </CardContent>
      </Card>

      {/* Decision Confirmation Dialog */}
      <Dialog open={!!activeDecision} onOpenChange={() => setActiveDecision(null)}>
        <DialogContent 
          className="max-w-md bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.08)]" 
          aria-describedby="decision-dialog-description"
          style={{
            transform: `translate(${dialogPosition.x}px, ${dialogPosition.y}px)`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          <div 
            className="absolute top-2 left-1/2 transform -translate-x-1/2 cursor-grab active:cursor-grabbing z-50"
            onMouseDown={handleMouseDown}
          >
            <GripHorizontal className="w-5 h-5 text-slate-400" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-light">
              {activeDecision?.action === 'APPROVE' ? 'Confirm Mapping' : 'Reject Mapping'}
            </DialogTitle>
          </DialogHeader>
          <div id="decision-dialog-description" className="space-y-4 p-4">
            <div>
              <Label>Reason Code *</Label>
              <Input
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                placeholder={activeDecision?.action === 'APPROVE' ? 'e.g., EXACT_MATCH, FUZZY_MATCH' : 'e.g., INCORRECT_MATCH, DATA_QUALITY'}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Comment {activeDecision?.action === 'REJECT' && '*'}</Label>
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Additional context (required for rejection)"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-slate-300 text-slate-900 hover:bg-slate-50" onClick={() => setActiveDecision(null)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-black hover:bg-slate-800 text-white"
                onClick={submitDecision}
              >
                Confirm {activeDecision?.action === 'APPROVE' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}