import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Link as LinkIcon, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function TMSIntegrationStatus() {
  const { data: tmsSources = [] } = useQuery({
    queryKey: ['integration-sources-tms'],
    queryFn: async () => {
      const sources = await base44.entities.IntegrationSource.list();
      return sources.filter(s => s.source_type === 'TMS_API');
    }
  });

  const activeSource = tmsSources.find(s => s.status === 'active');

  return (
    <Card className="glassmorphic-panel border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-[#86b027]" />
          TMS Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSource ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{activeSource.source_name}</p>
                <p className="text-xs text-slate-600">Configured via SupplyLens Integrations</p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>

            {activeSource.last_sync_date && (
              <div className="text-xs text-slate-600">
                Last sync: {new Date(activeSource.last_sync_date).toLocaleString()}
              </div>
            )}

            {activeSource.api_endpoint && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 font-mono">
                {activeSource.api_endpoint}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">No TMS Integration Configured</p>
                <p className="text-xs text-amber-700 mt-1">
                  Configure a TMS integration source in SupplyLens to enable automated shipment data ingestion
                </p>
              </div>
            </div>
          </div>
        )}

        <Link to={createPageUrl('SupplyLens') + '?tab=integrations'}>
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="w-3 h-3 mr-2" />
            Manage in SupplyLens Integrations
          </Button>
        </Link>

        <div className="border-t border-slate-200 pt-4 mt-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Note:</strong> Logistics Emissions module consumes shipment evidence streams sealed in SupplyLens. 
            All integration configuration is centralized under SupplyLens → Integrations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}