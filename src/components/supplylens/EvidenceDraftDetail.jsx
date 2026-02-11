import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle, Shield, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EvidenceService, AuditEventService } from './contract2/services';
import { ACTIVE_TENANT_ID } from './contract2/data';

export default function EvidenceDraftDetail({ draft, onClose, onSealed }) {
  const [sealing, setSealing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drawerRef = React.useRef(null);

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

  const handleSealDraft = async () => {
    setSealing(true);
    try {
      const result = await EvidenceService.sealDraft(draft.id, ACTIVE_TENANT_ID);
      
      if (result.success) {
        // Log audit event
        await AuditEventService.logEvent(ACTIVE_TENANT_ID, {
          eventType: 'EVIDENCE_SEALED',
          objectType: 'EVIDENCE',
          objectId: result.evidence.id,
          actor: 'admin@emissioncore.io',
          details: { action: 'SEAL', draftId: draft.id }
        });
        
        toast.success(`✓ Evidence sealed: ${result.evidence.displayId}`);
        onSealed?.();
        onClose();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Failed to seal draft');
    } finally {
      setSealing(false);
    }
  };

  if (!draft) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-end pointer-events-none">
      <div className="fixed inset-0 pointer-events-auto" onClick={onClose} />
      
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
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-10">
          <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing drag-handle">
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>
          <div className="px-6 py-3 flex items-center justify-between border-t border-slate-200/30">
            <h2 className="text-lg font-light text-slate-900 tracking-tight">Evidence Draft</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100/70 rounded-full transition-all">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-light">Draft Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-slate-600 font-light">Draft ID</span>
                <p className="font-mono text-slate-900">{draft.id}</p>
              </div>
              <div>
                <span className="text-slate-600 font-light">Display ID</span>
                <p className="font-mono text-slate-900">{draft.displayId}</p>
              </div>
              <div>
                <span className="text-slate-600 font-light">Status</span>
                <Badge className={
                  draft.status === 'READY_TO_SEAL' ? 'bg-green-100 text-green-800' :
                  draft.status === 'VALIDATION_FAILED' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }>{draft.status}</Badge>
              </div>
              <div>
                <span className="text-slate-600 font-light">Dataset Type</span>
                <p className="text-slate-900">{draft.datasetType}</p>
              </div>
            </CardContent>
          </Card>

          {draft.validationErrors?.length > 0 && (
            <Card className="bg-red-50/50 border-red-200">
              <CardHeader>
                <CardTitle className="text-sm font-light text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Validation Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {draft.validationErrors.map((error, idx) => (
                  <div key={idx} className="text-xs text-red-800 bg-white/60 p-2 rounded border border-red-200">
                    {error}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60">
            <CardHeader>
              <CardTitle className="text-sm font-light">Draft Payload</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-3 rounded">
                {JSON.stringify(draft.draftPayload, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {draft.status === 'READY_TO_SEAL' && (
              <Button 
                onClick={handleSealDraft} 
                disabled={sealing}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Shield className="w-4 h-4" />
                {sealing ? 'Sealing...' : 'Seal Evidence'}
              </Button>
            )}
            
            <Button variant="outline" className="w-full" disabled>
              Submit for Review
            </Button>
            
            <Button variant="outline" className="w-full" disabled>
              Edit Draft
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}