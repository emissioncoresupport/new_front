import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Lock, Link as LinkIcon, Clock } from 'lucide-react';

export default function RecordContextHeader({ recordId, evidenceType, ingestionMethod, binding, sealedAt, reconciliationStatus }) {
  if (!recordId) return null;

  const getStatusColor = (status) => {
    const colors = {
      NOT_READY: 'bg-blue-100 text-blue-800',
      READY_WITH_GAPS: 'bg-yellow-100 text-yellow-800',
      PENDING_MATCH: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="bg-white border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link to={createPageUrl(`EvidenceRecordDetail?id=${recordId}`)}>
            <Button variant="ghost" size="sm" className="gap-2 text-[#86b027] hover:text-[#86b027]/90">
              <ArrowLeft className="w-4 h-4" />
              Back to Record
            </Button>
          </Link>

          <div className="h-8 w-px bg-slate-200"></div>

          <div className="text-sm">
            <div className="font-mono font-semibold text-slate-900">{recordId}</div>
            <div className="text-xs text-slate-600">{evidenceType} via {ingestionMethod}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 gap-1">
            <Lock className="w-3 h-3" />
            SEALED
          </Badge>

          {binding?.target_id && (
            <Badge className="bg-blue-100 text-blue-800 gap-1">
              <LinkIcon className="w-3 h-3" />
              BOUND
            </Badge>
          )}

          {reconciliationStatus && (
            <Badge className={getStatusColor(reconciliationStatus)}>
              {reconciliationStatus}
            </Badge>
          )}

          {sealedAt && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {new Date(sealedAt).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}