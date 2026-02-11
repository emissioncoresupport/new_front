import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function EvidenceReviewQueue() {
  const queryClient = useQueryClient();

  const { data: pendingRecords = [], isLoading } = useQuery({
    queryKey: ['evidenceRecordsPendingReview'],
    queryFn: () => base44.entities.EvidenceRecord.filter({ review_status: 'PENDING_REVIEW' }, '-created_date', 100)
  });

  const approveMutation = useMutation({
    mutationFn: async (recordId) => {
      const user = await base44.auth.me();
      await base44.entities.EvidenceRecord.update(recordId, { review_status: 'APPROVED' });
      await base44.entities.ReviewEvent.create({
        tenant_id: user.email.split('@')[1] || 'default',
        evidence_record_id: recordId,
        reviewer_user_id: user.id,
        action: 'APPROVED',
        reason: 'Approved via review queue',
        reviewed_at_utc: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['evidenceRecordsPendingReview']);
      toast.success('Evidence approved');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ recordId, reason }) => {
      const user = await base44.auth.me();
      await base44.entities.EvidenceRecord.update(recordId, { review_status: 'REJECTED' });
      await base44.entities.ReviewEvent.create({
        tenant_id: user.email.split('@')[1] || 'default',
        evidence_record_id: recordId,
        reviewer_user_id: user.id,
        action: 'REJECTED',
        reason: reason || 'Rejected via review queue',
        reviewed_at_utc: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['evidenceRecordsPendingReview']);
      toast.success('Evidence rejected');
    }
  });

  const getTrustBadge = (level) => {
    const colors = {
      HIGH: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-orange-100 text-orange-800'
    };
    return <Badge className={colors[level]}>{level}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading review queue...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#86b027]" />
            <div>
              <h1 className="text-3xl font-light text-slate-900 tracking-tight">Evidence Review Queue</h1>
              <p className="text-sm text-slate-600 mt-1">
                {pendingRecords.length} items pending review
              </p>
            </div>
          </div>
        </div>

        {pendingRecords.length === 0 ? (
          <div className="glassmorphic-panel rounded-xl border border-slate-200/60 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">All Clear!</h3>
            <p className="text-sm text-slate-600">No evidence records pending review</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRecords.map((record) => (
              <div key={record.id} className="glassmorphic-panel rounded-xl border border-slate-200/60 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-900">
                          {record.snapshot_json?.evidence_type || 'Evidence Record'}
                        </div>
                        <div className="text-xs text-slate-600 font-mono mt-1">{record.id.substring(0, 16)}...</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Trust:</span> {getTrustBadge(record.trust_level)}
                      </div>
                      <div>
                        <span className="text-slate-600">Module:</span>{' '}
                        <Badge variant="outline">{record.originating_module || 'SUPPLYLENS'}</Badge>
                      </div>
                      <div>
                        <span className="text-slate-600">Channel:</span>{' '}
                        <Badge variant="outline">{record.snapshot_json?.submission_channel || 'N/A'}</Badge>
                      </div>
                    </div>

                    {record.trust_level === 'LOW' && (
                      <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div className="text-xs text-orange-900">
                          <strong>Low trust evidence:</strong> Review carefully before approval. This evidence will not be
                          used in regulatory calculations until approved.
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-slate-600">
                      Sealed: {new Date(record.sealed_at_utc).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link to={createPageUrl(`EvidenceRecordDetail?id=${record.id}`)}>
                      <Button size="sm" variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(record.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('Rejection reason (optional):');
                        rejectMutation.mutate({ recordId: record.id, reason });
                      }}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
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