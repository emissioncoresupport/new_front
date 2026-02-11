import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Copy, Lock, AlertTriangle, CheckCircle2, Link2, FileText, History, Plus, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import { safeDate } from './contract2/utils';

export default function EvidenceRecordDetailModal({ evidence, isOpen, onClose, onNavigateToWorkQueue, onNavigateToEntity, onNavigateToReview, onCreateWorkItem }) {
  const [copied, setCopied] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  if (!evidence) return null;

  // Compute retention_end_utc with policy default
  const computeRetentionEnd = () => {
    if (evidence.retention_end_utc) {
      return evidence.retention_end_utc;
    }
    // Policy default: 7 years from ingestion
    const ingestedDate = new Date(evidence.ingested_at_utc || evidence.ingestedAtUtc);
    const retentionDate = new Date(ingestedDate);
    retentionDate.setFullYear(retentionDate.getFullYear() + 7);
    return retentionDate.toISOString();
  };

  const retentionEnd = computeRetentionEnd();
  const isSealed = evidence.status === 'SEALED' || evidence.sealedStatus === 'SEALED';
  const isImmutable = isSealed;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copied`);
  };

  const scopeBindingStatus = () => {
    if (evidence.scope_binding === 'BOUND') {
      return { status: 'BOUND', color: 'bg-green-100 text-green-800', icon: CheckCircle2 };
    } else if (evidence.scope_binding === 'QUARANTINED') {
      return { status: 'QUARANTINED', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    }
    return { status: 'UNRESOLVED', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle };
  };

  const scopeStatus = scopeBindingStatus();
  const ScopeIcon = scopeStatus.icon;

  const handleHeaderMouseDown = (e) => {
    if (e.target.closest('[data-no-drag]')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!dragRef.current) return;
      dragRef.current.style.position = 'fixed';
      dragRef.current.style.left = `${e.clientX - dragOffset.x}px`;
      dragRef.current.style.top = `${e.clientY - dragOffset.y}px`;
      dragRef.current.style.zIndex = '9999';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const Content = (
    <div className="space-y-3">
      {/* Immutability Lock Notice */}
      {isImmutable && (
        <div className="p-2.5 bg-[#86b027]/10 border border-[#86b027]/30 rounded-lg flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-[#86b027] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#86b027]">
            <p className="font-semibold">Immutable Record</p>
            <p className="font-light text-[11px] mt-0.5">This evidence is sealed and cannot be edited.</p>
          </div>
        </div>
      )}

      {/* Core Identifiers */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">IDs</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <code className="bg-white/80 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-slate-700 flex-1 truncate">
              {evidence.display_id || evidence.displayId || 'N/A'}
            </code>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={() => copyToClipboard(evidence.display_id || evidence.displayId || '', 'Display ID')}
            >
              <Copy className={`w-2.5 h-2.5 ${copied === 'Display ID' ? 'text-[#86b027]' : 'text-slate-600'}`} />
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <code className="bg-white/80 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700 flex-1 truncate">
              {evidence.record_id || evidence.recordId || evidence.id || 'N/A'}
            </code>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={() => copyToClipboard(evidence.record_id || evidence.recordId || evidence.id || '', 'Record ID')}
            >
              <Copy className={`w-2.5 h-2.5 ${copied === 'Record ID' ? 'text-[#86b027]' : 'text-slate-600'}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata Grid - Compact */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Metadata</p>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="text-slate-900 font-medium">{isSealed ? 'SEALED' : 'INGESTED'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Dataset:</span>
            <span className="text-slate-900 font-medium">{evidence.dataset_type || evidence.datasetType || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Method:</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {evidence.ingestion_method || evidence.ingestionMethod || '—'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Source:</span>
            <span className="text-slate-900 font-mono text-[10px]">{evidence.source_system || evidence.sourceSystem || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">By:</span>
            <span className="text-slate-900 text-[10px]">{evidence.ingested_by || evidence.ingestedBy || 'system'}</span>
          </div>
        </div>
      </div>

      {/* Hashes - Minimal */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Hashes</p>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <code className="bg-white/80 px-2 py-0.5 rounded text-[9px] font-mono text-slate-500 flex-1 truncate">
              {(evidence.payload_hash_sha256 || evidence.payloadHashSha256 || 'N/A').substring(0, 20)}...
            </code>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 flex-shrink-0"
              onClick={() => copyToClipboard(evidence.payload_hash_sha256 || evidence.payloadHashSha256 || '', 'Payload Hash')}
            >
              <Copy className={`w-2.5 h-2.5 ${copied === 'Payload Hash' ? 'text-[#86b027]' : 'text-slate-600'}`} />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <code className="bg-white/80 px-2 py-0.5 rounded text-[9px] font-mono text-slate-500 flex-1 truncate">
              {(evidence.metadata_hash_sha256 || evidence.metadataHashSha256 || 'N/A').substring(0, 20)}...
            </code>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 flex-shrink-0"
              onClick={() => copyToClipboard(evidence.metadata_hash_sha256 || evidence.metadataHashSha256 || '', 'Metadata Hash')}
            >
              <Copy className={`w-2.5 h-2.5 ${copied === 'Metadata Hash' ? 'text-[#86b027]' : 'text-slate-600'}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Retention & Binding - Minimal */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Governance</p>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-500">Retention:</span>
            <span className="text-slate-900 font-medium">{safeDate(retentionEnd, 'date').substring(0, 10)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Binding:</span>
            <Badge className={`${scopeStatus.color} text-[10px] h-5 px-1.5`}>
              <ScopeIcon className="w-2.5 h-2.5 mr-0.5" />
              {scopeStatus.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Actions - Compact */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Actions</p>
        <div className="grid grid-cols-2 gap-1.5">
          <Button 
            size="sm"
            variant="outline"
            className="text-[10px] h-7 px-2"
            onClick={() => onNavigateToWorkQueue && onNavigateToWorkQueue(evidence.display_id || evidence.displayId || evidence.evidence_id)}
          >
            <Link2 className="w-2.5 h-2.5 mr-1" />
            Work Items
          </Button>
          
          {evidence.linked_entity_id && (
            <Button 
              size="sm"
              variant="outline"
              className="text-[10px] h-7 px-2"
              onClick={() => onNavigateToEntity && onNavigateToEntity(evidence.linked_entity_id)}
            >
              <FileText className="w-2.5 h-2.5 mr-1" />
              Entity
            </Button>
          )}

          <Button 
            size="sm"
            variant="outline"
            className="text-[10px] h-7 px-2"
            onClick={() => onNavigateToReview && onNavigateToReview(evidence.display_id || evidence.displayId || evidence.evidence_id)}
          >
            <History className="w-2.5 h-2.5 mr-1" />
            History
          </Button>

          <Button 
            size="sm"
            variant="outline"
            className="text-[10px] h-7 px-2"
            onClick={() => onCreateWorkItem && onCreateWorkItem(evidence)}
          >
            <Plus className="w-2.5 h-2.5 mr-1" />
            Item
          </Button>
        </div>
      </div>

      {/* Quarantine Notice */}
      {evidence.quarantine_reason && (
        <div className="p-2 bg-red-50/80 border border-red-200/60 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-3 h-3 text-red-700 mt-0.5 flex-shrink-0" />
          <div className="text-[10px] text-red-800">
            <p className="font-semibold">Quarantined</p>
            <p className="font-light mt-0.5">{evidence.quarantine_reason}</p>
          </div>
        </div>
      )}
    </div>
  );



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      <div
        ref={dragRef}
        className="relative w-[480px] max-h-[90vh] rounded-2xl pointer-events-auto bg-white/50 backdrop-blur-[20px] -webkit-backdrop-blur-[20px] border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col z-50"
      >
        {/* Draggable Header */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b border-slate-200/30 bg-gradient-to-b from-white/90 to-white/50 backdrop-blur-xl -webkit-backdrop-blur-xl cursor-move group hover:bg-white/60 transition-all duration-200 shadow-sm"
          onMouseDown={handleHeaderMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all" />
            <div className="flex items-center gap-2">
              {isSealed && <Lock className="w-3.5 h-3.5 text-[#86b027]" />}
              <h2 className="text-sm font-semibold text-slate-900">Evidence Detail</h2>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100/60 px-2 py-0.5 rounded">
                {evidence.display_id || 'EV-???'}
              </span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-red-50 text-slate-600 hover:text-red-600"
            onClick={onClose}
            data-no-drag
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto sidebar-scroll-track p-5 space-y-4">
          {Content}
        </div>
      </div>
    </div>
  );
}