import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Database, Download, Upload, RefreshCw, CheckCircle2, 
  AlertCircle, Loader2, ArrowRight, Package, Users, Activity 
} from "lucide-react";

export default function ERPIntegrationPanel({ company }) {
  const [syncResults, setSyncResults] = useState(null);
  const queryClient = useQueryClient();

  const isConfigured = company?.erp_api_endpoint && company?.erp_api_key;

  const syncMutation = useMutation({
    mutationFn: async (dataType) => {
      const response = await fetch('/api/functions/syncFromERP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          dataType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sync failed');
      }

      return await response.json();
    },
    onSuccess: (data, dataType) => {
      setSyncResults(data);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['emission-factors'] });
      
      toast.success(`${dataType} sync completed`, {
        description: `${data.imported} imported, ${data.updated} updated`
      });
    },
    onError: (error) => {
      toast.error('Sync failed', {
        description: error.message
      });
    }
  });

  const exportMutation = useMutation({
    mutationFn: async (dataType) => {
      const response = await fetch('/api/functions/exportToERP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          dataType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      return await response.json();
    },
    onSuccess: (data, dataType) => {
      toast.success(`${dataType} exported to ERP`, {
        description: `${data.exported} records exported successfully`
      });
    },
    onError: (error) => {
      toast.error('Export failed', {
        description: error.message
      });
    }
  });

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-bold text-slate-900 mb-2">ERP Integration Not Configured</h3>
            <p className="text-sm text-slate-600 mb-4">
              Configure your ERP API credentials in Company Settings to enable data synchronization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#86b027]" />
              ERP Integration
            </CardTitle>
            <Badge variant="outline">{company.erp_system || 'Generic'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-sm text-blue-800">
              Connected to: <strong>{company.erp_api_endpoint}</strong>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            {/* Import Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-[#86b027]" />
                Import from ERP
              </h4>
              
              <Button
                onClick={() => syncMutation.mutate('suppliers')}
                disabled={syncMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                {syncMutation.isPending && syncMutation.variables === 'suppliers' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Sync Suppliers
              </Button>

              <Button
                onClick={() => syncMutation.mutate('products')}
                disabled={syncMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                {syncMutation.isPending && syncMutation.variables === 'products' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Package className="w-4 h-4 mr-2" />
                )}
                Sync Products/SKUs
              </Button>

              <Button
                onClick={() => syncMutation.mutate('emissions')}
                disabled={syncMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                {syncMutation.isPending && syncMutation.variables === 'emissions' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4 mr-2" />
                )}
                Sync Emission Factors
              </Button>
            </div>

            {/* Export Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#02a1e8]" />
                Export to ERP
              </h4>
              
              <Button
                onClick={() => exportMutation.mutate('cbam_entries')}
                disabled={exportMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                {exportMutation.isPending && exportMutation.variables === 'cbam_entries' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Export CBAM Entries
              </Button>

              <Button
                onClick={() => exportMutation.mutate('cbam_reports')}
                disabled={exportMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                {exportMutation.isPending && exportMutation.variables === 'cbam_reports' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Export CBAM Reports
              </Button>

              <Button
                onClick={() => exportMutation.mutate('supplier_data')}
                disabled={exportMutation.isPending}
                variant="outline"
                className="w-full justify-start"
              >
                {exportMutation.isPending && exportMutation.variables === 'supplier_data' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Export Supplier Data
              </Button>
            </div>
          </div>

          {syncResults && (
            <Alert className={syncResults.errors.length > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}>
              {syncResults.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className="text-sm">
                <div className="font-semibold mb-1">Sync Results:</div>
                <div className="space-y-1">
                  <div>✓ {syncResults.imported} new records imported</div>
                  <div>✓ {syncResults.updated} records updated</div>
                  {syncResults.errors.length > 0 && (
                    <div className="text-amber-700 mt-2">
                      <div className="font-semibold">Errors ({syncResults.errors.length}):</div>
                      <ul className="list-disc ml-4 text-xs">
                        {syncResults.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {syncResults.errors.length > 5 && (
                          <li>... and {syncResults.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-slate-200 bg-slate-50">
            <AlertDescription className="text-xs text-slate-600">
              <strong>Note:</strong> ERP sync matches records by external_id or unique codes. 
              Existing records are updated, new records are created. Always test with a small dataset first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}