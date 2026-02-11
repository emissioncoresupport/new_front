import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, GripHorizontal } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyHashesModal({ open, onClose, evidence }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const contentRef = useRef(null);

  useEffect(() => {
    if (open && evidence) {
      performVerification();
      // Reset position when modal opens
      setPosition({ x: 0, y: 0 });
    }
  }, [open, evidence]);

  const handleDragStart = (e) => {
    if (e.target.closest('[data-no-drag]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const performVerification = async () => {
    setVerifying(true);
    
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock hash recomputation (deterministic)
    const { demoStore } = await import('@/components/supplylens/DemoDataStore');
    const payloadStr = JSON.stringify(evidence.claims || evidence.canonical_payload || {});
    const recomputedPayloadHash = demoStore.simpleHash(payloadStr);
    const recomputedMetadataHash = demoStore.simpleHash(JSON.stringify({
      dataset_type: evidence.dataset_type || evidence.datasetType,
      ingestion_method: evidence.ingestion_method || evidence.ingestionMethod,
      tenant_id: evidence.tenant_id || evidence.tenantId
    }));
    
    const payloadMatch = recomputedPayloadHash === (evidence.payload_hash_sha256 || evidence.payloadHashSha256);
    const metadataMatch = recomputedMetadataHash === (evidence.metadata_hash_sha256 || evidence.metadataHashSha256);
    
    setResult({
      payloadHash: {
        stored: evidence.payload_hash_sha256 || evidence.payloadHashSha256,
        recomputed: recomputedPayloadHash,
        match: payloadMatch
      },
      metadataHash: {
        stored: evidence.metadata_hash_sha256 || evidence.metadataHashSha256,
        recomputed: recomputedMetadataHash,
        match: metadataMatch
      },
      overall: payloadMatch && metadataMatch ? 'PASS' : 'FAIL'
    });
    
    // Log audit event
    demoStore.addAuditEvent({
      event_type: 'HASH_VERIFICATION',
      object_type: 'evidence_record',
      object_id: evidence.record_id || evidence.id,
      metadata: { result: payloadMatch && metadataMatch ? 'PASS' : 'FAIL' }
    });
    
    setVerifying(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        ref={contentRef}
        className="max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : undefined
        }}
      >
        <DialogHeader 
          className="cursor-grab active:cursor-grabbing select-none border-b border-slate-200 pb-3"
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-slate-400" />
            <DialogTitle className="text-lg font-light text-slate-900">Hash Verification</DialogTitle>
          </div>
          <p className="text-xs text-slate-500 mt-1">Evidence: {evidence?.display_id || evidence?.displayId || evidence?.evidence_id}</p>
        </DialogHeader>
        
        {verifying ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#86b027] animate-spin" />
            <p className="ml-3 text-sm text-slate-600">Recomputing hashes...</p>
          </div>
        ) : result ? (
          <div className="space-y-4 pt-4">
            {/* Overall Result */}
            <div className={`p-4 rounded-lg border backdrop-blur-sm ${result.overall === 'PASS' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-3">
                {result.overall === 'PASS' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className="text-lg font-light text-slate-900">{result.overall}</p>
                  <p className="text-xs text-slate-600">Hash integrity {result.overall === 'PASS' ? 'verified' : 'failed'}</p>
                </div>
              </div>
            </div>

            {/* Payload Hash */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-light text-slate-900">Payload Hash</p>
                <Badge className={result.payloadHash.match ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}>
                  {result.payloadHash.match ? 'MATCH' : 'MISMATCH'}
                </Badge>
              </div>
              <div className="bg-slate-50 backdrop-blur-sm border border-slate-200 rounded p-3 space-y-2">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Stored:</p>
                  <code className="text-[10px] font-mono text-slate-800 break-all">{result.payloadHash.stored}</code>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Recomputed:</p>
                  <code className="text-[10px] font-mono text-slate-800 break-all">{result.payloadHash.recomputed}</code>
                </div>
              </div>
            </div>

            {/* Metadata Hash */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-light text-slate-900">Metadata Hash</p>
                <Badge className={result.metadataHash.match ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}>
                  {result.metadataHash.match ? 'MATCH' : 'MISMATCH'}
                </Badge>
              </div>
              <div className="bg-slate-50 backdrop-blur-sm border border-slate-200 rounded p-3 space-y-2">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Stored:</p>
                  <code className="text-[10px] font-mono text-slate-800 break-all">{result.metadataHash.stored}</code>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Recomputed:</p>
                  <code className="text-[10px] font-mono text-slate-800 break-all">{result.metadataHash.recomputed}</code>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}