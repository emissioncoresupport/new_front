import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportPackageModal({ open, onClose, evidence }) {
  const handleExport = async () => {
    const { demoStore } = await import('@/components/supplylens/DemoDataStore');
    
    // Log export event
    demoStore.addAuditEvent({
      event_type: 'PACKAGE_EXPORTED',
      object_type: 'evidence_record',
      object_id: evidence.record_id || evidence.id,
      metadata: { format: 'JSON', include_decisions: true }
    });
    
    // Create export package
    const exportPackage = {
      evidence: {
        record_id: evidence.record_id || evidence.id,
        display_id: evidence.display_id || evidence.displayId,
        dataset_type: evidence.dataset_type || evidence.datasetType,
        status: evidence.status,
        ingested_at_utc: evidence.ingested_at_utc || evidence.ingestedAtUtc,
        payload_hash_sha256: evidence.payload_hash_sha256 || evidence.payloadHashSha256,
        metadata_hash_sha256: evidence.metadata_hash_sha256 || evidence.metadataHashSha256
      },
      linked_decisions: demoStore.listDecisions().filter(d => 
        d.evidence_refs?.includes(evidence.record_id || evidence.id)
      ),
      audit_trail: demoStore.listAuditEvents({ object_id: evidence.record_id || evidence.id })
    };
    
    // Trigger download
    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-package-${evidence.display_id || evidence.displayId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Evidence package exported');
    onClose();
  };

  if (!evidence) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-light">Export Evidence Package</DialogTitle>
          <p className="text-sm text-slate-600">Evidence: {evidence.display_id || evidence.displayId || evidence.evidence_id}</p>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-sm font-medium text-slate-900 mb-3">Package Contents</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Evidence metadata (record_id, display_id, dataset_type, status)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Cryptographic hashes (payload_hash_sha256, metadata_hash_sha256)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Linked decisions (mapping approvals, conflict resolutions)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Complete audit trail (append-only event log)</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> Export creates an audit event (PACKAGE_EXPORTED) in Review History.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleExport} className="gap-2 bg-slate-900 hover:bg-slate-800">
              <Download className="w-4 h-4" />
              Export Package
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}