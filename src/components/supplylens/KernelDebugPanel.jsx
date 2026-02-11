import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

/**
 * Kernel Debug Panel
 * 
 * Displays server-authoritative state for migration readiness.
 * Shows draft_id, scope binding, attachments, and correlation IDs.
 */
export default function KernelDebugPanel({ 
  draftId, 
  declaration, 
  draftSnapshot, 
  lastCorrelationId,
  visible = true 
}) {
  if (!visible) return null;

  return (
    <Card className="border-2 border-blue-500 bg-blue-50/50 backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Kernel Debug Panel (Migration Readiness)
          </p>
        </div>

        <div className="space-y-2 text-[10px] font-mono">
          {/* Draft ID */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold w-24">draft_id:</span>
            {draftId ? (
              <code className="text-green-700 bg-green-50 px-2 py-0.5 rounded">{draftId}</code>
            ) : (
              <Badge variant="outline" className="text-amber-700 border-amber-400">NOT_CREATED</Badge>
            )}
          </div>

          {/* Scope Target */}
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold w-24">scope:</span>
            <code className="text-slate-900">{declaration?.declared_scope || 'N/A'}</code>
          </div>

          {declaration?.scope_target_id && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-semibold w-24">target_id:</span>
              <code className="text-green-700 bg-green-50 px-2 py-0.5 rounded">{declaration.scope_target_id}</code>
            </div>
          )}

          {/* Attachments */}
          {draftSnapshot?.attachments && draftSnapshot.attachments.length > 0 && (
            <div className="pt-2 border-t border-blue-200">
              <p className="text-slate-600 font-semibold mb-1">Attachments ({draftSnapshot.attachments.length}):</p>
              {draftSnapshot.attachments.map((att, idx) => (
                <div key={idx} className="ml-2 pl-2 border-l-2 border-blue-300 mb-1">
                  <p className="text-slate-700">{att.filename}</p>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="text-slate-600">file_id:</span>
                    <code className="text-slate-900">{att.attachment_id}</code>
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="text-slate-600">sha256:</span>
                    <code className="text-green-700">{att.sha256?.substring(0, 16)}...</code>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Can Seal Status */}
          {draftSnapshot && (
            <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
              <span className="text-slate-600 font-semibold w-24">can_seal:</span>
              {draftSnapshot.can_seal ? (
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>TRUE</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-700">
                  <AlertCircle className="w-3 h-3" />
                  <span>FALSE</span>
                </div>
              )}
            </div>
          )}

          {/* Correlation ID */}
          {lastCorrelationId && (
            <div className="pt-2 border-t border-blue-200">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold w-24">correlation:</span>
                <code className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-[9px]">{lastCorrelationId}</code>
              </div>
            </div>
          )}

          {/* Server State Indicator */}
          <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
            <span className="text-[9px] text-slate-600">Server-authoritative state</span>
            <Clock className="w-3 h-3 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}