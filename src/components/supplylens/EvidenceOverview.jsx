import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, Hash, Shield } from 'lucide-react';

/**
 * READ-ONLY EVIDENCE OVERVIEW
 * 
 * Displays Evidence metadata and current state.
 * NO edit controls.
 * NO inline mutations.
 * Backend projection only.
 */

export default function EvidenceOverview({ evidence }) {
  if (!evidence) return null;

  const getStateBadge = (state) => {
    const colors = {
      RAW: 'bg-slate-200 text-slate-800',
      CLASSIFIED: 'bg-blue-200 text-blue-800',
      STRUCTURED: 'bg-green-200 text-green-800',
      REJECTED: 'bg-red-200 text-red-800'
    };
    return <Badge className={colors[state] || 'bg-slate-200 text-slate-800'}>{state}</Badge>;
  };

  return (
    <Card className="p-6 bg-white border border-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Evidence Overview</h3>
        {getStateBadge(evidence.state)}
      </div>

      <div className="space-y-4">
        {/* Evidence ID */}
        <div className="flex items-start gap-3">
          <Hash className="w-4 h-4 text-slate-400 mt-1" />
          <div className="flex-1">
            <p className="text-xs text-slate-600 uppercase">Evidence ID</p>
            <p className="text-sm text-slate-900 font-mono">{evidence.evidence_id || evidence.id}</p>
          </div>
        </div>

        {/* Ingestion Path */}
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-slate-400 mt-1" />
          <div className="flex-1">
            <p className="text-xs text-slate-600 uppercase">Ingestion Path</p>
            <p className="text-sm text-slate-900">{evidence.ingestion_path}</p>
          </div>
        </div>

        {/* Created By */}
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-slate-400 mt-1" />
          <div className="flex-1">
            <p className="text-xs text-slate-600 uppercase">Created By</p>
            <p className="text-sm text-slate-900">{evidence.actor_id}</p>
          </div>
        </div>

        {/* Created At */}
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-slate-400 mt-1" />
          <div className="flex-1">
            <p className="text-xs text-slate-600 uppercase">Created At (UTC)</p>
            <p className="text-sm text-slate-900">{new Date(evidence.uploaded_at || evidence.created_date).toISOString()}</p>
          </div>
        </div>

        {/* File Hash */}
        {evidence.file_hash_sha256 && (
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-slate-400 mt-1" />
            <div className="flex-1">
              <p className="text-xs text-slate-600 uppercase">SHA-256 Hash</p>
              <p className="text-xs text-slate-900 font-mono break-all">{evidence.file_hash_sha256}</p>
            </div>
          </div>
        )}

        {/* Declared Context */}
        {evidence.declared_context && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <p className="text-xs text-slate-600 uppercase mb-2">Declared Context</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-600">Entity Type:</span>
                <span className="text-slate-900 ml-1">{evidence.declared_context.entity_type}</span>
              </div>
              <div>
                <span className="text-slate-600">Intended Use:</span>
                <span className="text-slate-900 ml-1">{evidence.declared_context.intended_use}</span>
              </div>
              <div>
                <span className="text-slate-600">Source Role:</span>
                <span className="text-slate-900 ml-1">{evidence.declared_context.source_role}</span>
              </div>
              {evidence.declared_context.reason && (
                <div className="col-span-2">
                  <span className="text-slate-600">Reason:</span>
                  <p className="text-slate-900 mt-1">{evidence.declared_context.reason}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Immutability Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-900 font-medium">🔒 Immutable Evidence</p>
          <p className="text-xs text-blue-800 mt-1">This Evidence record cannot be modified or deleted. All changes are tracked via event sourcing.</p>
        </div>
      </div>
    </Card>
  );
}