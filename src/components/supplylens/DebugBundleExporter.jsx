import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * DEBUG BUNDLE EXPORTER
 * Exports JSON bundle containing:
 * - draft_id, correlation_id, build_id
 * - Last 20 server logs for correlation_id
 * - Snapshot state
 * - Validation errors
 */

export default function DebugBundleExporter({ 
  draftId, 
  correlationId, 
  draftSnapshot, 
  validationErrors 
}) {
  const exportBundle = async () => {
    try {
      const bundle = {
        export_timestamp: new Date().toISOString(),
        build_id: import.meta.env.VITE_BUILD_ID || 'dev-local',
        contract_version: 'contract_ingest_v1',
        draft_id: draftId,
        correlation_id: correlationId,
        snapshot: draftSnapshot,
        validation_errors: validationErrors,
        
        // Fetch audit logs for this correlation_id
        audit_logs: await fetchAuditLogs(correlationId),
        
        // User context
        user: await base44.auth.me().catch(() => null),
        
        // Browser info
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-bundle-${correlationId || 'no-correlation'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Debug bundle exported', {
        description: 'Share this file with engineering for investigation'
      });
    } catch (error) {
      console.error('[DEBUG EXPORT] Failed:', error);
      toast.error('Export failed', { description: error.message });
    }
  };

  const fetchAuditLogs = async (corrId) => {
    if (!corrId) return [];
    
    try {
      // Try to fetch from audit_events entity
      const logs = await base44.entities.AuditEvent.filter(
        { correlation_id: corrId },
        '-server_ts_utc',
        20
      );
      return logs || [];
    } catch (error) {
      console.warn('[DEBUG EXPORT] Could not fetch audit logs:', error);
      return [];
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={exportBundle}
      disabled={!draftId && !correlationId}
    >
      <Download className="w-4 h-4" />
      Export Debug Bundle
    </Button>
  );
}