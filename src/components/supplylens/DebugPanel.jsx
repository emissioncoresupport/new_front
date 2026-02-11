/**
 * DEBUG PANEL (DEV-ONLY)
 * CONTRACT 2: Work Item & Evidence Vault Debugging
 * 
 * Shows operational details for troubleshooting deep-linking,
 * idempotency, tenant isolation, and evidence resolution.
 */

import React, { useState } from 'react';
import { ChevronDown, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DebugPanel({ mode = 'workitem', data = {}, className = '' }) {
  const [expanded, setExpanded] = useState(false);

  // Only render in dev
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(JSON.stringify(text, null, 2));
  };

  if (mode === 'workitem') {
    const {
      tenant_id,
      work_item_id,
      parent_id,
      idempotency_key,
      evidence_record_id,
      evidence_display_id,
      entity_type,
      entity_id,
      status,
      decision_count,
      created_at,
      updated_at
    } = data;

    return (
      <div className={`fixed bottom-0 right-0 z-[5000] w-96 ${className}`}>
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-t-lg shadow-2xl">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-mono text-slate-300">🐛 DEBUG: WorkItem</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <div className="max-h-96 overflow-y-auto p-4 space-y-3 bg-slate-950/60 text-xs font-mono">
              {/* Tenant & IDs */}
              <div className="space-y-1 pb-3 border-b border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">tenant_id:</span>
                  <span className="text-slate-200 break-all">{tenant_id || '(missing)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">work_item_id:</span>
                  <span className={`${work_item_id?.startsWith('WI-TMP') ? 'text-red-400' : 'text-slate-200'} break-all`}>
                    {work_item_id || '(missing)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">parent_id:</span>
                  <span className="text-slate-200 break-all">{parent_id || '—'}</span>
                </div>
              </div>

              {/* Idempotency */}
              <div className="space-y-1 pb-3 border-b border-slate-700">
                <div className="text-slate-300 font-semibold">Idempotency</div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400">key:</span>
                  <div className="flex-1 break-all text-slate-200">{idempotency_key || '(computed on create)'}</div>
                </div>
              </div>

              {/* Evidence & Entity */}
              <div className="space-y-1 pb-3 border-b border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">evidence_record_id:</span>
                  <span className="text-slate-200 break-all">{evidence_record_id || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">evidence_display_id:</span>
                  <span className="text-slate-200 break-all">{evidence_display_id || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">entity_type:</span>
                  <span className="text-slate-200">{entity_type || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">entity_id:</span>
                  <span className="text-slate-200 break-all">{entity_id || '—'}</span>
                </div>
              </div>

              {/* Status & Decisions */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">status:</span>
                  <Badge className={
                    status === 'OPEN' ? 'bg-blue-900 text-blue-200' :
                    status === 'IN_PROGRESS' ? 'bg-yellow-900 text-yellow-200' :
                    status === 'RESOLVED' ? 'bg-green-900 text-green-200' :
                    status === 'BLOCKED' ? 'bg-red-900 text-red-200' :
                    'bg-slate-700 text-slate-300'
                  }>{status}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">decision_count:</span>
                  <span className="text-slate-200 font-bold">{decision_count || 0}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[10px]">
                  <span>created:</span>
                  <span>{created_at ? new Date(created_at).toLocaleString() : '—'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 text-[10px]">
                  <span>updated:</span>
                  <span>{updated_at ? new Date(updated_at).toLocaleString() : '—'}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => copyToClipboard(data)}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Full Data
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'evidence') {
    const {
      active_filters,
      resolved_evidence_id,
      match_method,
      result_count,
      fuzzy_search_term,
      found_by_record_id,
      found_by_display_id
    } = data;

    return (
      <div className={`fixed bottom-0 right-0 z-[5000] w-96 ${className}`}>
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-t-lg shadow-2xl">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-mono text-slate-300">🐛 DEBUG: Evidence</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <div className="max-h-96 overflow-y-auto p-4 space-y-3 bg-slate-950/60 text-xs font-mono">
              {/* Filters */}
              <div className="space-y-1 pb-3 border-b border-slate-700">
                <div className="text-slate-300 font-semibold">Active Filters</div>
                {active_filters && Object.keys(active_filters).length > 0 ? (
                  Object.entries(active_filters).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-slate-200">{val || '(empty)'}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No filters applied</div>
                )}
              </div>

              {/* Resolution */}
              <div className="space-y-1 pb-3 border-b border-slate-700">
                <div className="text-slate-300 font-semibold">Resolution</div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">target_evidence_id:</span>
                  <span className="text-slate-200 break-all">{resolved_evidence_id || '(none)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">match_method:</span>
                  <Badge className="bg-slate-700 text-slate-200">{match_method || 'pending'}</Badge>
                </div>
                {fuzzy_search_term && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">fuzzy_term:</span>
                    <span className="text-slate-200 break-all">{fuzzy_search_term}</span>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">result_count:</span>
                  <span className="text-slate-200 font-bold">{result_count || 0}</span>
                </div>
                {found_by_record_id && (
                  <div className="text-green-400 text-[10px]">✓ Found by record_id (direct match)</div>
                )}
                {found_by_display_id && (
                  <div className="text-green-400 text-[10px]">✓ Found by display_id</div>
                )}
                {!found_by_record_id && !found_by_display_id && result_count === 0 && (
                  <div className="text-red-400 text-[10px]">✗ No matches found</div>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => copyToClipboard(data)}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Full Data
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}