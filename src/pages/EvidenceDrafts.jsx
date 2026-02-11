import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function EvidenceDrafts() {
  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['evidenceDrafts'],
    queryFn: () => base44.entities.EvidenceDraft.filter({ status: ['DRAFT', 'READY_FOR_SEAL', 'SEAL_FAILED'] }, '-created_date', 100)
  });

  const getStatusBadge = (status) => {
    const config = {
      DRAFT: { icon: Clock, color: 'bg-slate-100 text-slate-700', label: 'Draft' },
      READY_FOR_SEAL: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: 'Ready' },
      SEAL_FAILED: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Failed' },
      SEALED: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Sealed' }
    };
    const { icon: Icon, color, label } = config[status] || config.DRAFT;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading drafts...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#86b027]" />
              <div>
                <h1 className="text-3xl font-light text-slate-900 tracking-tight">Evidence Drafts</h1>
                <p className="text-sm text-slate-600 mt-1">{drafts.length} in progress</p>
              </div>
            </div>
            <Link to={createPageUrl('SupplyLens')}>
              <Button className="bg-[#86b027] hover:bg-[#86b027]/90">
                <Play className="w-4 h-4 mr-2" />
                New Draft
              </Button>
            </Link>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="glassmorphic-panel rounded-xl border border-slate-200/60 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Drafts</h3>
            <p className="text-sm text-slate-600">Start a new evidence ingestion to create a draft</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="glassmorphic-panel rounded-xl border border-slate-200/60 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-900">{draft.evidence_type}</div>
                        <div className="text-xs text-slate-600 font-mono mt-1">{draft.id.substring(0, 16)}...</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div>{getStatusBadge(draft.status)}</div>
                      <div>
                        <span className="text-slate-600">Method:</span>{' '}
                        <Badge variant="outline">{draft.ingestion_method}</Badge>
                      </div>
                      <div>
                        <span className="text-slate-600">Channel:</span>{' '}
                        <Badge variant="outline">{draft.submission_channel}</Badge>
                      </div>
                    </div>

                    {draft.status === 'SEAL_FAILED' && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="text-xs text-red-900">
                          <strong>Seal failed:</strong> Check validation requirements and try again
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-600">
                      Created: {new Date(draft.created_date).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link to={createPageUrl(`SupplyLens?draft_id=${draft.id}`)}>
                      <Button size="sm" variant="outline" className="w-full">
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}