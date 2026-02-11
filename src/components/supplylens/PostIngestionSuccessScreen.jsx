import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ExternalLink, FileText, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PostIngestionSuccessScreen({ 
  sealedRecord, 
  createdWorkItem, 
  linkedEntity,
  onClose 
}) {
  if (!sealedRecord) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-2xl">
        <CardContent className="p-8 space-y-6">
          {/* Success Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-green-50/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto border border-green-200/60">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-light text-slate-900 tracking-tight">Evidence Sealed Successfully</h2>
              <p className="text-sm text-slate-600 font-light mt-2">
                Evidence record <span className="font-mono font-semibold text-slate-900">{sealedRecord?.display_id}</span> is now immutable
              </p>
            </div>
          </div>

          {/* Record Summary */}
          <div className="bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm rounded-xl p-4 border border-slate-200/60">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 font-light text-xs uppercase tracking-wider mb-1">Record ID</p>
                <p className="font-mono text-slate-900 font-medium text-xs">{sealedRecord?.record_id}</p>
              </div>
              <div>
                <p className="text-slate-600 font-light text-xs uppercase tracking-wider mb-1">Dataset Type</p>
                <Badge variant="outline" className="text-xs">{sealedRecord?.dataset_type}</Badge>
              </div>
              <div>
                <p className="text-slate-600 font-light text-xs uppercase tracking-wider mb-1">Status</p>
                <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs">{sealedRecord?.status}</Badge>
              </div>
              <div>
                <p className="text-slate-600 font-light text-xs uppercase tracking-wider mb-1">Retention Until</p>
                <p className="text-slate-900 text-xs font-light">
                  {sealedRecord?.retention_ends_utc ? new Date(sealedRecord.retention_ends_utc).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Next Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-[0.15em] mb-3">Next Actions</h3>
            
            {/* Open Evidence Record */}
            <Button 
              className="w-full justify-between bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-xl shadow-md hover:shadow-lg transition-all"
              onClick={() => {
                window.location.href = `${createPageUrl('EvidenceVault')}?focus=${sealedRecord.display_id}`;
              }}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">View Evidence Record</p>
                  <p className="text-xs text-slate-300 font-light">Inspect hashes, metadata, and audit trail</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4" />
            </Button>

            {/* Open Linked Entity */}
            {linkedEntity && (
              <Button 
                variant="outline"
                className="w-full justify-between border-2 border-slate-200 hover:border-slate-400 hover:bg-white/90 h-14 rounded-xl transition-all"
                onClick={() => {
                  window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity_type=${linkedEntity.type}&entity_id=${linkedEntity.id}`;
                }}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-700" />
                  <div className="text-left">
                    <p className="font-medium text-slate-900">View Linked {linkedEntity.type}</p>
                    <p className="text-xs text-slate-600 font-light">{linkedEntity.name || linkedEntity.id}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-600" />
              </Button>
            )}

            {/* View Work Queue */}
            <Button 
              variant="outline"
              className="w-full justify-between border-2 border-slate-200 hover:border-slate-400 hover:bg-white/90 h-14 rounded-xl transition-all"
              onClick={() => {
                window.location.href = `${createPageUrl('SupplyLens')}?tab=work_queue&filter_evidence=${sealedRecord.record_id}`;
              }}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-slate-700" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">View Related Tasks</p>
                  <p className="text-xs text-slate-600 font-light">Open work queue filtered to this evidence</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-600" />
            </Button>

            {/* Close */}
            <Button 
              variant="ghost" 
              className="w-full mt-4 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}