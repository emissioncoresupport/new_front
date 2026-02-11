import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, CheckCircle, XCircle, AlertCircle, Play, FileText, Clock, Users, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { routeToEvidenceDetail, routeToEntityDetail, isValidEvidenceId, routeToEvidenceVaultSearch } from './routingUtils';
import * as MockStore from './contract2/mockStore';

import { CONFLICT_STRATEGIES } from './workItemEnums';
import DebugPanel from './DebugPanel';
import WorkItemDetail from './WorkItemDetail';

// Portal-based dropdown to avoid modal clipping
function ConflictStrategySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [open]);

  return (
    <div>
      <div ref={triggerRef} onClick={() => setOpen(!open)} className="relative">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="mt-1 h-9 border-2 border-slate-200">
            <SelectValue placeholder="Choose resolution..." />
          </SelectTrigger>
        </Select>
      </div>
      
      {open && position && createPortal(
        <div
          className="fixed bg-white border border-slate-200 rounded-lg shadow-2xl z-[10000]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            minWidth: '300px'
          }}
        >
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {Object.entries(CONFLICT_STRATEGIES).map(([key, config]) => (
              <div
                key={key}
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className="px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
              >
                <div className="font-medium text-sm text-slate-900">{config.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{config.description}</div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {open && <div className="fixed inset-0 z-[9999]" onClick={() => setOpen(false)} />}
    </div>
  );
}

export default function WorkItemDrawer({ item, onClose, onApprove, onReject, onCreateFollowUp, onRefresh, showDebugPanel = false }) {
  // Validate required fields per data contract
  const isValidWorkItem = item && (item.work_item_id || item.id) && item.type && item.status && (item.created_at_utc || item.createdAt);
  
  const [actionState, setActionState] = useState(null);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');
  const [resolutionStrategy, setResolutionStrategy] = useState('');
  const [overrideValue, setOverrideValue] = useState('');
  const [decisions, setDecisions] = useState([]);
  const [followUpType, setFollowUpType] = useState('REVIEW');
  const [followUpPriority, setFollowUpPriority] = useState('MEDIUM');
  const [evidenceNotFound, setEvidenceNotFound] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [createdFollowUpId, setCreatedFollowUpId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [decisionLog, setDecisionLog] = useState([]); // Append-only decision log
  const [followUpTitle, setFollowUpTitle] = useState('');
  const drawerRef = React.useRef(null);
  
  // Reset form and load decisions when item changes
  React.useEffect(() => {
    if (item) {
      setReasonCode('');
      setComment('');
      setResolutionStrategy('');
      setOverrideValue('');
      setActionState(null);
      setShowFollowUpForm(false);
      setCreatedFollowUpId(null);
      const evidenceId = item.linkedEvidenceIds?.[0];
      setEvidenceNotFound(!evidenceId);
      setFollowUpType(item.type || 'REVIEW');
      
      // Load decisions for this work item from DemoDataStore
      const loadDecisions = async () => {
        try {
          const { demoStore } = await import('./DemoDataStore');
          const workItemId = item.work_item_id || item.id;
          const decisions = demoStore.listDecisions({ work_item_id: workItemId });
          setDecisionLog(decisions);
        } catch (err) {
          console.warn('[WorkItemDrawer] Failed to load decisions:', err);
          setDecisionLog([]);
        }
      };
      
      loadDecisions();
    }
  }, [item]);

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const drawer = drawerRef.current;
      const rect = drawer.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
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

  if (!item) return null;

  if (!isValidWorkItem) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-start justify-end pointer-events-none">
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity pointer-events-auto" onClick={onClose} />
        <div className="fixed right-8 top-[10rem] w-[480px] bg-white/70 backdrop-blur-2xl border border-slate-200/50 shadow-lg rounded-2xl pointer-events-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-light text-slate-900">Work Item Details</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="flex items-start gap-3 p-4 bg-red-50/60 border border-red-200/60 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-900 font-medium">Invalid Work Item</p>
              <p className="text-xs text-red-800 mt-1">This work item is missing required fields or has a temporary ID (WI-TMP).</p>
              <p className="text-xs text-red-700 mt-2 font-mono">ID: {item?.work_item_id || 'missing'}</p>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const getActionSection = () => {
    switch (item.type) {
      case 'REVIEW':
        return (
          <div className="space-y-3">
            {/* Governance microcopy */}
            <div className="flex items-start gap-2 p-3 bg-blue-50/40 backdrop-blur-xl rounded-xl border border-blue-200/30">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800 font-light">
                AI may suggest, humans decide. Every action is logged.
              </p>
            </div>
            
            <div>
              <Label className="text-xs text-slate-700 font-medium mb-1">Reason Code (Required)</Label>
              <Input
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                placeholder="e.g. DATA_QUALITY_VERIFIED, INSUFFICIENT_EVIDENCE"
                className="mt-1 h-9 border-2 border-slate-200 hover:border-slate-400 transition-all"
              />
            </div>
            {actionState === 'reject' && (
              <div>
                <Label className="text-xs text-slate-700 font-medium mb-1">Comment (Required for Reject)</Label>
                <Textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain rejection reason..."
                  className="mt-1 h-20 border-2 border-slate-200 resize-none"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!reasonCode || reasonCode.trim() === '') {
                    toast.error('Reason code is required');
                    return;
                  }
                  await onApprove?.(item, reasonCode, comment);
                  setActionState('approved');
                }}
                className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90 text-white gap-2 shadow-sm transition-all"
                disabled={!reasonCode || reasonCode.trim() === '' || actionState === 'approved' || actionState === 'rejected'}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button
                onClick={async () => {
                  if (!actionState) {
                    setActionState('reject');
                    return;
                  }
                  if (!reasonCode || reasonCode.trim() === '' || !comment || comment.trim() === '') {
                    toast.error('Reason code and comment are required for reject');
                    return;
                  }
                  await onReject?.(item, reasonCode, comment);
                  setActionState('rejected');
                  setShowFollowUpForm(true);
                 }}
                variant="outline"
                className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 gap-2 transition-all"
                disabled={!reasonCode || reasonCode.trim() === '' || (actionState === 'reject' && (!comment || comment.trim() === '')) || actionState === 'approved' || actionState === 'rejected'}
              >
                <XCircle className="w-4 h-4" />
                {actionState === 'reject' ? 'Confirm Reject' : 'Reject'}
              </Button>
              </div>
              <p className="text-xs text-slate-500 font-light mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              AI can suggest, humans decide. Every decision is logged.
              </p>
              </div>
        );
      case 'EXTRACTION':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-slate-700 font-medium mb-1">Reason Code (Required)</Label>
              <Input
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                placeholder="e.g. EXTRACTION_VERIFIED, NEEDS_REWORK"
                className="mt-1 h-9 border-2 border-slate-200 hover:border-slate-400 transition-all"
              />
            </div>
            {actionState === 'reject' && (
              <div>
                <Label className="text-xs text-slate-700 font-medium mb-1">Comment (Required for Reject)</Label>
                <Textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain rejection reason..."
                  className="mt-1 h-20 border-2 border-slate-200 resize-none"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!reasonCode || reasonCode.trim() === '') {
                    toast.error('Reason code is required');
                    return;
                  }

                  try {
                    const { demoStore } = await import('./DemoDataStore');
                    const workItemId = item.work_item_id || item.id;

                    // Check for existing decisions to set supersedes_decision_id
                    const existingDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    const previousDecision = existingDecisions.length > 0 ? existingDecisions[existingDecisions.length - 1] : null;

                    // Create decision record (append-only)
                    const decision = demoStore.createDecision({
                      work_item_id: workItemId,
                      decision_type: 'ACCEPTED',
                      outcome: 'ACCEPTED',
                      reason_code: reasonCode,
                      comment: comment || null,
                      actor: 'current_user@example.com',
                      timestamp: new Date().toISOString(),
                      supersedes_decision_id: previousDecision?.decision_id || null
                    });

                    // Update work item status
                    demoStore.updateWorkItemStatus(workItemId, 'RESOLVED');

                    // Reload decisions
                    const updatedDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    setDecisionLog(updatedDecisions);

                    toast.success('Decision logged • Work item resolved');
                    setActionState('approved');

                    if (onApprove) {
                      await onApprove(item, reasonCode, comment);
                    }
                  } catch (error) {
                    console.error('[WorkItemDrawer] Approve error:', error);
                    toast.error('Failed to log decision');
                  }
                }}
                className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90 text-white gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!reasonCode || reasonCode.trim() === '' || actionState === 'approved' || actionState === 'rejected'}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </Button>
              <Button
                onClick={async () => {
                  if (!actionState) {
                    setActionState('reject');
                    return;
                  }
                  if (!reasonCode || reasonCode.trim() === '' || !comment || comment.trim() === '') {
                    toast.error('Reason code and comment are required for reject');
                    return;
                  }

                  try {
                    const { demoStore } = await import('./DemoDataStore');
                    const workItemId = item.work_item_id || item.id;

                    // Check for existing decisions to set supersedes_decision_id
                    const existingDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    const previousDecision = existingDecisions.length > 0 ? existingDecisions[existingDecisions.length - 1] : null;

                    // Create decision record (append-only)
                    const decision = demoStore.createDecision({
                      work_item_id: workItemId,
                      decision_type: 'REJECTED',
                      outcome: 'REJECTED',
                      reason_code: reasonCode,
                      comment: comment,
                      actor: 'current_user@example.com',
                      timestamp: new Date().toISOString(),
                      supersedes_decision_id: previousDecision?.decision_id || null
                    });

                    // Update work item status
                    demoStore.updateWorkItemStatus(workItemId, 'RESOLVED');

                    // Reload decisions
                    const updatedDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    setDecisionLog(updatedDecisions);

                    toast.success('Decision logged • Work item resolved');
                    setActionState('rejected');
                    setShowFollowUpForm(true);

                    if (onReject) {
                      await onReject(item, reasonCode, comment);
                    }
                  } catch (error) {
                    console.error('[WorkItemDrawer] Reject error:', error);
                    toast.error('Failed to log decision');
                  }
                }}
                variant="outline"
                className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!reasonCode || reasonCode.trim() === '' || (actionState === 'reject' && (!comment || comment.trim() === '')) || actionState === 'approved' || actionState === 'rejected'}
              >
                <XCircle className="w-4 h-4" />
                {actionState === 'reject' ? 'Confirm Reject' : 'Reject'}
              </Button>
              </div>
            <p className="text-xs text-slate-500 font-light mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              AI can suggest, humans decide. Every decision is logged.
            </p>
          </div>
        );
      case 'MAPPING':
        return (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">Suggested Match</p>
              <p className="text-sm font-medium text-slate-900">Supplier: Acme Corp → SUP-123</p>
              <p className="text-xs text-slate-600 mt-1">Confidence: 92%</p>
            </div>
            <div>
              <Label className="text-xs text-slate-700 font-medium mb-1">Reason Code (Required)</Label>
              <Input
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                placeholder="e.g. HIGH_CONFIDENCE_MATCH, MANUAL_VERIFICATION"
                className="mt-1 h-9 border-2 border-slate-200 hover:border-slate-400 transition-all"
              />
            </div>
            {actionState === 'reject' && (
              <div>
                <Label className="text-xs text-slate-700 font-medium mb-1">Comment (Required for Reject)</Label>
                <Textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain rejection reason..."
                  className="mt-1 h-20 border-2 border-slate-200 resize-none"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!reasonCode || reasonCode.trim() === '') {
                    toast.error('Reason code is required');
                    return;
                  }

                  try {
                    const { demoStore } = await import('./DemoDataStore');
                    const workItemId = item.work_item_id || item.id;

                    // Check for existing decisions to set supersedes_decision_id
                    const existingDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    const previousDecision = existingDecisions.length > 0 ? existingDecisions[existingDecisions.length - 1] : null;

                    const decision = demoStore.createDecision({
                      work_item_id: workItemId,
                      decision_type: 'ACCEPTED',
                      outcome: 'ACCEPTED',
                      reason_code: reasonCode,
                      comment: comment || null,
                      actor: 'current_user@example.com',
                      timestamp: new Date().toISOString(),
                      supersedes_decision_id: previousDecision?.decision_id || null
                    });

                    demoStore.updateWorkItemStatus(workItemId, 'RESOLVED');
                    const updatedDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    setDecisionLog(updatedDecisions);

                    toast.success('Decision logged • Work item resolved');
                    setActionState('approved');

                    if (onApprove) {
                      await onApprove(item, reasonCode, comment);
                    }
                  } catch (error) {
                    console.error('[WorkItemDrawer] Approve error:', error);
                    toast.error('Failed to log decision');
                  }
                }}
                className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90 text-white gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!reasonCode || reasonCode.trim() === '' || actionState === 'approved' || actionState === 'rejected'}
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </Button>
              <Button
                onClick={async () => {
                  if (!actionState) {
                    setActionState('reject');
                    return;
                  }
                  if (!reasonCode || reasonCode.trim() === '' || !comment || comment.trim() === '') {
                    toast.error('Reason code and comment are required for reject');
                    return;
                  }

                  try {
                    const { demoStore } = await import('./DemoDataStore');
                    const workItemId = item.work_item_id || item.id;

                    // Check for existing decisions to set supersedes_decision_id
                    const existingDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    const previousDecision = existingDecisions.length > 0 ? existingDecisions[existingDecisions.length - 1] : null;

                    const decision = demoStore.createDecision({
                      work_item_id: workItemId,
                      decision_type: 'REJECTED',
                      outcome: 'REJECTED',
                      reason_code: reasonCode,
                      comment: comment,
                      actor: 'current_user@example.com',
                      timestamp: new Date().toISOString(),
                      supersedes_decision_id: previousDecision?.decision_id || null
                    });

                    demoStore.updateWorkItemStatus(workItemId, 'RESOLVED');
                    const updatedDecisions = demoStore.listDecisions({ work_item_id: workItemId });
                    setDecisionLog(updatedDecisions);

                    toast.success('Decision logged • Work item resolved');
                    setActionState('rejected');
                    setShowFollowUpForm(true);

                    if (onReject) {
                      await onReject(item, reasonCode, comment);
                    }
                  } catch (error) {
                    console.error('[WorkItemDrawer] Reject error:', error);
                    toast.error('Failed to log decision');
                  }
                }}
                variant="outline"
                className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!reasonCode || reasonCode.trim() === '' || (actionState === 'reject' && (!comment || comment.trim() === '')) || actionState === 'approved' || actionState === 'rejected'}
              >
                <XCircle className="w-4 h-4" />
                {actionState === 'reject' ? 'Confirm Reject' : 'Reject'}
              </Button>
            </div>
            <p className="text-xs text-slate-500 font-light mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              AI can suggest, humans decide. Every decision is logged.
            </p>
            </div>
        );
      case 'CONFLICT':
        const conflictField = item.details?.field || 'country_of_origin';
        const conflictSources = item.details?.sources || [];
        const aiSuggestion = item.aiSuggestion || item.details?.aiSuggestion;
        
        const conflictRequiresOverride = resolutionStrategy === 'MANUAL_OVERRIDE';
        const isResolveDisabled = !resolutionStrategy || !reasonCode ||
          (conflictRequiresOverride && (!overrideValue || overrideValue.trim() === '')) ||
          actionState === 'resolved' || actionState === 'resolving';
        
        return (
          <div className="space-y-3">
            {/* Conflict Details */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <p className="text-xs text-amber-900 font-semibold">Conflict Details</p>
              
              <div className="space-y-2">
                <div className="flex items-start justify-between text-xs">
                  <span className="text-amber-800 font-medium">Field:</span>
                  <span className="text-amber-900 font-mono">{conflictField}</span>
                </div>
                
                {conflictSources.map((source, idx) => (
                  <div key={idx} className="bg-white/60 rounded p-2 space-y-1">
                    <p className="text-xs text-slate-700 font-semibold">Source {idx + 1}</p>
                    <p className="text-xs text-slate-900 font-mono">Value: {source.value}</p>
                    <p className="text-xs text-slate-600">Evidence: {source.sourceId}</p>
                    <p className="text-xs text-slate-500">Trust Rank: {source.trustRank}</p>
                  </div>
                ))}
                
                {aiSuggestion && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50/60 rounded border border-blue-200/40">
                    <AlertCircle className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-800">AI Suggestion: {aiSuggestion.suggestedEntityId} ({(aiSuggestion.confidence * 100).toFixed(0)}%) - {aiSuggestion.reasoning}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Resolution Strategy - Required */}
            <div>
              <Label className="text-xs text-slate-700 font-medium mb-1">Resolution Strategy (Required)</Label>
              <Select value={resolutionStrategy} onValueChange={setResolutionStrategy}>
                <SelectTrigger className="mt-1 h-9 border-2 border-slate-200">
                  <SelectValue placeholder="Choose strategy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREFER_SOURCE_A">Prefer Source A</SelectItem>
                  <SelectItem value="PREFER_SOURCE_B">Prefer Source B</SelectItem>
                  <SelectItem value="PREFER_TRUSTED_SYSTEM">Prefer Trusted System</SelectItem>
                  <SelectItem value="MANUAL_OVERRIDE">Manual Override</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Reason Code - Required */}
            <div>
              <Label className="text-xs text-slate-700 font-medium mb-1">Reason Code (Required)</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="mt-1 h-9 border-2 border-slate-200">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXACT_MATCH">Exact Match</SelectItem>
                  <SelectItem value="FUZZY_MATCH">Fuzzy Match</SelectItem>
                  <SelectItem value="DATA_QUALITY_VERIFIED">Data Quality Verified</SelectItem>
                  <SelectItem value="PREFER_TRUSTED_SYSTEM">Prefer Trusted System</SelectItem>
                  <SelectItem value="INSUFFICIENT_EVIDENCE">Insufficient Evidence</SelectItem>
                  <SelectItem value="OUT_OF_POLICY">Out of Policy</SelectItem>
                  <SelectItem value="REQUIRES_CORRECTION">Requires Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Override Value (only for MANUAL_OVERRIDE) */}
            {conflictRequiresOverride && (
              <div>
                <Label className="text-xs text-slate-700 font-medium mb-1">Override Value (Required)</Label>
                <Input
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                  placeholder="Enter corrected value..."
                  className="mt-1 h-9 border-2 border-slate-200 hover:border-slate-400 transition-all"
                />
              </div>
            )}
            
            {/* Comment - Optional for all strategies */}
            <div>
              <Label className="text-xs text-slate-600">Comment (Optional)</Label>
              <Textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add resolution notes..."
                className="mt-1 h-16 border-2 border-slate-200 resize-none"
              />
            </div>
            
            {/* Resolve Button */}
            <Button
             onClick={async () => {
              if (isResolveDisabled) return;

              if (!resolutionStrategy || resolutionStrategy.trim() === '') {
                toast.error('Resolution strategy is required');
                return;
              }
              if (!reasonCode || reasonCode.trim() === '') {
                toast.error('Reason code is required');
                return;
              }
              if (conflictRequiresOverride && (!overrideValue || overrideValue.trim() === '')) {
                toast.error('Override value is required for manual override');
                return;
              }

              setActionState('resolving');

              try {
              const { demoStore } = await import('./DemoDataStore');
              const sources = item.details?.sources || [];

              // Compute final value based on strategy
              let finalValue = null;
              let chosenEvidenceId = null;

              if (resolutionStrategy === 'PREFER_SOURCE_A') {
                finalValue = sources[0]?.value;
                chosenEvidenceId = sources[0]?.evidenceId || sources[0]?.sourceId;
              } else if (resolutionStrategy === 'PREFER_SOURCE_B') {
                finalValue = sources[1]?.value;
                chosenEvidenceId = sources[1]?.evidenceId || sources[1]?.sourceId;
              } else if (resolutionStrategy === 'PREFER_TRUSTED_SYSTEM') {
                // Use trust rank
                const sourceSorted = [...sources].sort((a, b) => (b.trustRank || 0) - (a.trustRank || 0));
                finalValue = sourceSorted[0]?.value;
                chosenEvidenceId = sourceSorted[0]?.evidenceId || sourceSorted[0]?.sourceId;
              } else if (resolutionStrategy === 'MANUAL_OVERRIDE') {
                finalValue = overrideValue;
              }

              const workItemId = item.work_item_id || item.id;
              const decision = demoStore.resolveWorkItem(workItemId, {
                strategy: resolutionStrategy,
                selected_value: finalValue,
                selected_evidence_id: chosenEvidenceId,
                reason_code: reasonCode,
                comment
              });

              // Reload decisions
              const updatedDecisions = demoStore.listDecisions({ work_item_id: workItemId });
              setDecisionLog(updatedDecisions);

              toast.success('Conflict resolved • Decision logged');
              setActionState('resolved');

              if (onRefresh) {
                onRefresh();
              }
              } catch (error) {
              console.error('[WorkItemDrawer] Resolution failed:', error);
              toast.error(error.message || 'Failed to resolve conflict');
              setActionState(null);
              }
             }}
              className="w-full bg-[#86b027] hover:bg-[#86b027]/90 text-white gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isResolveDisabled}
            >
              <CheckCircle className="w-4 h-4" />
              {actionState === 'resolving' ? 'Resolving...' : 'Resolve Conflict'}
            </Button>
            
            {/* Governance Notice */}
            <div className="text-xs text-slate-500 font-light mt-2 p-2 bg-slate-50 rounded border border-slate-200">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              AI can suggest, humans decide. Every decision is logged.
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-end pointer-events-none">
      {/* Debug Panel (dev-only) */}
      {showDebugPanel && <DebugPanel mode="workitem" data={item || {}} />}

      {/* Overlay - Transparent click zone */}
      <div
        className="fixed inset-0 transition-opacity pointer-events-auto"
        onClick={onClose}
      />

      {/* Right Drawer - Glassmorphic Tesla Design */}
      <div 
        ref={drawerRef}
        onMouseDown={handleMouseDown}
        className="fixed w-[480px] max-h-[calc(100vh-8rem)] bg-white/70 backdrop-blur-2xl border border-slate-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden rounded-2xl pointer-events-auto"
        style={{
          top: position.y || '10rem',
          right: position.x ? 'auto' : '2rem',
          left: position.x || 'auto',
          cursor: isDragging ? 'grabbing' : 'auto',
        }}
      >
        {/* Header - Drag Handle */}
         <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-10">
           <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing drag-handle">
             <GripVertical className="w-5 h-5 text-slate-400" />
           </div>
           <div className="px-6 py-3 flex items-center justify-between border-t border-slate-200/30">
             <h2 className="text-lg font-light text-slate-900 tracking-tight">Work Item Details</h2>
             <button
               onClick={onClose}
               className="p-2 hover:bg-slate-100/70 rounded-full transition-all duration-200"
             >
               <X className="w-5 h-5 text-slate-600" />
             </button>
           </div>
         </div>

        {/* Content - Scrollable, optimized spacing */}
        <div className="p-4 pb-32 space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
        {/* Quick Links - Top Row Chips */}
        <div className="flex flex-wrap gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!item.linked_evidence_record_ids?.[0] && !item.linkedEvidenceId}
                    onClick={async () => {
                      try {
                        const evidenceId = item.linked_evidence_record_ids?.[0] || item.linkedEvidenceId;
                        if (!evidenceId) {
                          toast.error('No evidence ID linked [ERR-WI-001]');
                          return;
                        }

                        const { CTARouter } = await import('./CTARouter');
                        const result = await CTARouter.openEvidenceDetail(evidenceId);

                        if (!result.success) {
                          toast.error(`Failed to open evidence [ERR-WI-002]`, {
                            description: result.error_code || 'Unknown error'
                          });
                        }
                      } catch (error) {
                        console.error('[WorkItemDrawer] Open evidence error [ERR-WI-003]:', error);
                        toast.error('Failed to open evidence [ERR-WI-003]', {
                          description: error.message || 'Unknown error'
                        });
                      }
                    }}
                  >
                    <FileText className="w-3 h-3" />
                    Open Evidence
                  </Button>
                </span>
              </TooltipTrigger>
              {(!item.linked_evidence_record_ids?.[0] && !item.linkedEvidenceId) && (
                <TooltipContent>
                  <p>Not linked yet. Create mapping work item.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!item.linked_entity && !item.linkedEntityRef}
                    onClick={async () => {
                      try {
                        const entity = item.linked_entity || item.linkedEntityRef;
                        if (!entity) {
                          toast.error('No entity linked [ERR-WI-004]');
                          return;
                        }

                        const entityType = entity.type || entity.entityType;
                        const entityId = entity.id || entity.entityId;

                        if (!entityType || !entityId) {
                          toast.error('Invalid entity reference [ERR-WI-005]');
                          return;
                        }

                        const { CTARouter } = await import('./CTARouter');
                        const result = await CTARouter.openEntity(entityType, entityId);

                        if (!result.success) {
                          toast.error(`Failed to open entity [ERR-WI-006]`, {
                            description: result.error_code || 'Unknown error'
                          });
                        }
                      } catch (error) {
                        console.error('[WorkItemDrawer] Open entity error [ERR-WI-007]:', error);
                        toast.error('Failed to open entity [ERR-WI-007]', {
                          description: error.message || 'Unknown error'
                        });
                      }
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Entity
                  </Button>
                </span>
              </TooltipTrigger>
              {(!item.linked_entity && !item.linkedEntityRef) && (
                <TooltipContent>
                  <p>Not linked yet. Create mapping work item.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

         {/* Summary Card */}
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-900">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
             <div>
               <span className="text-slate-600 font-light">Work Item ID</span>
               <p className="font-mono text-slate-900 font-medium">{item.work_item_id || item.id}</p>
             </div>
              <div>
                <span className="text-slate-600 font-light">Type</span>
                <p className="text-slate-900">
                  <Badge variant="outline" className="mt-1">{item.type}</Badge>
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-light">Status</span>
                <p className="text-slate-900 mt-1">
                  <Badge className={
                    item.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' :
                    item.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }>{item.status}</Badge>
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-light">Priority</span>
                <p className="text-slate-900 mt-1">
                  <Badge className={
                    item.priority === 'CRITICAL' ? 'bg-red-600 text-white' :
                    item.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                    'bg-slate-500 text-white'
                  }>{item.priority}</Badge>
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-light">Owner</span>
                <p className="text-slate-900 text-xs mt-1">{item.owner || '—'}</p>
              </div>
              <div>
               <span className="text-slate-600 font-light">Created (GMT+1)</span>
               <p className="text-slate-900 text-xs">
                 {new Date(item.created_at_utc || item.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
               </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">SLA: {item.slaRemaining || item.slaHours}h remaining</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Audit Trail with Decision Count */}
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-light text-slate-900">Audit Trail (Append-Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
             <div className="flex justify-between">
               <span className="text-slate-600 font-light">Created At (GMT+1)</span>
               <span className="text-slate-900 font-mono">{new Date(item.created_at_utc || item.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
             </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-700 font-medium">Decision Count</span>
                <Badge className="bg-slate-900 text-white font-mono">{decisionLog.length}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2 italic">Append-only: each action creates a new decision entry, no overwrites</p>
            </CardContent>
          </Card>
          
          {/* Decision History (Append-Only) */}
          {decisionLog.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-light text-slate-900">Decision History (Append-Only)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {decisionLog.map((decision, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/30 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-mono">#{decision.decision_id}</span>
                        <Badge className={decision.outcome === 'ACCEPTED' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>{decision.outcome}</Badge>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{new Date(decision.timestamp).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-600">Reason: </span>
                      <span className="text-slate-800 font-medium">{decision.reason_code}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-600">Actor: </span>
                      <span className="text-slate-900">{decision.actor}</span>
                    </div>
                    {decision.comment && (
                     <div className="text-xs bg-white/60 p-2 rounded border border-slate-200">
                       <span className="text-slate-600">Comment: </span>
                       <span className="text-slate-800">{decision.comment}</span>
                     </div>
                    )}
                    {decision.supersedes_decision_id && (
                     <div className="text-xs text-slate-500 italic">
                       Supersedes: {decision.supersedes_decision_id}
                     </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Linked Evidence - Show all linked evidence */}
          {(item.linked_evidence_record_ids?.length > 0 || item.linkedEvidenceId) && (
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-light text-slate-900">Linked Evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm pt-2">
                {(item.linked_evidence_record_ids || [item.linkedEvidenceId]).filter(Boolean).map((evidenceId, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-light text-xs">Evidence {idx + 1}</span>
                      <code className="font-mono text-slate-900 font-medium text-xs">{evidenceId}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between mt-2 text-xs"
                      onClick={async () => {
                        try {
                          const { CTARouter } = await import('./CTARouter');
                          await CTARouter.openEvidenceDetail(evidenceId);
                        } catch (error) {
                          console.error('[WorkItemDrawer] Open evidence error:', error);
                        }
                      }}
                    >
                      Open Evidence
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Linked Entity (Optional) */}
          {(item.linked_entity || item.linkedEntityRef) && (
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-light text-slate-900">Linked Entity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm pt-2">
                {(() => {
                  const entity = item.linked_entity || item.linkedEntityRef;
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-light">Entity Type</span>
                        <Badge variant="outline" className="text-xs">{entity.type || entity.entityType}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-light">Entity ID</span>
                        <p className="font-mono text-slate-900 font-medium text-xs">{entity.id || entity.entityId}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full justify-between mt-2 border-2 border-slate-200 hover:border-slate-400 hover:bg-white/80 transition-all group"
                        onClick={async () => {
                          try {
                            const { CTARouter } = await import('./CTARouter');
                            const entityType = entity.type || entity.entityType;
                            const entityId = entity.id || entity.entityId;
                            await CTARouter.openEntity(entityType, entityId);
                          } catch (error) {
                            console.error('[WorkItemDrawer] Open entity error:', error);
                          }
                        }}
                      >
                        Open Entity
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                      </Button>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Work Item Details (requiredAction + auditTrail) */}
          <WorkItemDetail item={item} />

          {/* What This Does - Contextual Help */}
          <div className="bg-blue-50/40 border border-blue-200/40 rounded-lg p-3">
            <p className="text-xs text-blue-900 font-light">
              <strong>What this does:</strong> {
                item.type === 'ENTITY_MAPPING' || item.type === 'MAPPING' 
                  ? 'Links this evidence to a canonical entity, append-only decision'
                  : item.type === 'QUARANTINE_REVIEW' || item.type === 'QUARANTINE'
                  ? 'Fix missing scope/fields, then revalidate'
                  : item.type === 'REVIEW'
                  ? 'Verify data quality and approve for sealing'
                  : item.type === 'EXTRACTION'
                  ? 'Extract structured data from evidence using AI'
                  : item.type === 'CONFLICT'
                  ? 'Resolve data conflicts between multiple sources'
                  : 'Complete this work item to move evidence through the workflow'
              }
            </p>
          </div>

          {/* Required Action - Only show if action required */}
          {(item.requiresAction || ['OPEN', 'IN_PROGRESS', 'BLOCKED'].includes(item.status)) && (
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-light text-slate-900">Take Action</CardTitle>
              </CardHeader>
              <CardContent>
                {getActionSection()}
                {actionState && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-800 font-light">
                      ✓ Action recorded. Decision logged to audit trail.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Follow-up Work Item */}
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm">
            <CardHeader>
              <button
                onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                className="w-full text-left flex items-center justify-between"
              >
                <CardTitle className="text-sm font-light text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Follow-up Work Item
                </CardTitle>
                {actionState === 'rejected' && (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">Auto-opened after reject</Badge>
                )}
              </button>
            </CardHeader>
            {(showFollowUpForm || actionState === 'rejected') && (
              <CardContent className="space-y-2 pt-3">
                {createdFollowUpId ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-green-50/60 backdrop-blur-sm rounded-lg border border-green-200/60">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-green-800 font-medium">Follow-up created: {createdFollowUpId}</p>
                        <p className="text-xs text-green-700 font-light mt-1">Check Work Queue for new item</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full border-2 border-slate-300 hover:bg-slate-50 transition-all"
                      onClick={() => {
                        setCreatedFollowUpId(null);
                        setShowFollowUpForm(false);
                      }}
                    >
                      Create Another Follow-up
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-slate-700 font-medium mb-1">Type (prefilled)</Label>
                      <Select value={followUpType} onValueChange={setFollowUpType}>
                        <SelectTrigger className="mt-1 h-9 border-2 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REVIEW">Review</SelectItem>
                          <SelectItem value="EXTRACTION">Extraction</SelectItem>
                          <SelectItem value="MAPPING">Mapping</SelectItem>
                          <SelectItem value="CONFLICT">Conflict</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-700 font-medium mb-1">Priority</Label>
                      <Select value={followUpPriority} onValueChange={setFollowUpPriority}>
                        <SelectTrigger className="mt-1 h-9 border-2 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-slate-500 font-light">
                      Inherits same evidence ({item.linkedEvidenceId || 'none'}) and entity ({item.linkedEntityRef?.entityId || 'none'})
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full">
                            <Button 
                              variant="outline" 
                              className="w-full mt-2 border-2 border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={isCreatingFollowUp || !item.id || createdFollowUpId}
                              onClick={async () => {
                                try {
                                  if (isCreatingFollowUp) return;
                                  
                                  if (!item.id) {
                                    toast.error('Cannot create follow-up [ERR-FU-001]', {
                                      description: 'Work item has no ID'
                                    });
                                    return;
                                  }
                                  
                                  if (createdFollowUpId) {
                                    toast.info('Follow-up already created');
                                    return;
                                  }

                                  setIsCreatingFollowUp(true);

                                  const { CTARouter } = await import('./CTARouter');
                                  const workItemId = item.work_item_id || item.id;
                                  
                                  const result = await CTARouter.createFollowUpWorkItem(
                                    workItemId, 
                                    followUpType, 
                                    followUpPriority
                                  );
                                  
                                  if (result.success) {
                                    setCreatedFollowUpId(result.work_item_id);
                                    toast.success(`Follow-up created: ${result.work_item_id}`);
                                    
                                    if (onCreateFollowUp) {
                                      onCreateFollowUp();
                                    }
                                    
                                    if (onRefresh) {
                                      onRefresh();
                                    }
                                  } else {
                                    toast.error(`Failed to create follow-up [ERR-FU-002]`, {
                                      description: result.error_code || 'Unknown error'
                                    });
                                  }
                                } catch (err) {
                                  console.error('[WorkItemDrawer] Follow-up creation failed [ERR-FU-003]:', err);
                                  toast.error('Failed to create follow-up [ERR-FU-003]', {
                                    description: err.message || 'Unknown error'
                                  });
                                } finally {
                                  setIsCreatingFollowUp(false);
                                }
                              }}
                            >
                              {isCreatingFollowUp ? 'Creating...' : createdFollowUpId ? 'Follow-up Created' : 'Create Follow-up'}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!item.id && (
                          <TooltipContent>
                            <p>Work item has no ID - cannot create follow-up</p>
                          </TooltipContent>
                        )}
                        {createdFollowUpId && (
                          <TooltipContent>
                            <p>Follow-up already created: {createdFollowUpId}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>,
    document.body
  );
}