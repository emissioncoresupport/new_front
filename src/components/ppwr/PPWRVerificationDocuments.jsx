import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileCheck, ExternalLink, Upload, Shield, AlertCircle, Clock } from "lucide-react";

export default function PPWRVerificationDocuments({ packagingId }) {
  const { data: packaging } = useQuery({
    queryKey: ['ppwr-packaging', packagingId],
    queryFn: async () => {
      const items = await base44.entities.PPWRPackaging.filter({ id: packagingId });
      return items[0];
    },
    enabled: !!packagingId
  });

  const { data: blockchainLogs = [] } = useQuery({
    queryKey: ['blockchain-logs', packagingId],
    queryFn: async () => {
      const logs = await base44.entities.BlockchainAuditLog.filter({
        entity_id: packagingId,
        entity_type: 'PPWRPackaging'
      });
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    enabled: !!packagingId
  });

  if (!packaging) return null;

  const hasRecycledContent = (packaging.recycled_content_percentage || 0) > 0;
  const isVerified = packaging.recycled_content_verified;

  return (
    <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#86b027]">
          <FileCheck className="w-5 h-5" />
          Verification Documents & Audit Trail
        </CardTitle>
        <p className="text-sm text-slate-500">
          Regulatory-grade evidence for {packaging.packaging_name}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recycled Content Verification Status */}
        {hasRecycledContent && (
          <div className={`p-4 rounded-lg border-2 ${
            isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <Shield className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
                <h4 className="font-semibold">Recycled Content Claim</h4>
              </div>
              <Badge className={isVerified ? 'bg-emerald-500' : 'bg-amber-500'}>
                {isVerified ? 'Verified' : 'Pending Verification'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-xs text-slate-500">Claimed PCR</p>
                <p className="font-bold text-slate-900">{packaging.recycled_content_percentage}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Method</p>
                <p className="font-bold text-slate-900">{packaging.recycled_content_verification_method || 'Not Set'}</p>
              </div>
            </div>

            {/* Supplier Declaration */}
            {packaging.supplier_declaration_url ? (
              <a 
                href={packaging.supplier_declaration_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:bg-slate-50 transition-colors"
              >
                <FileCheck className="w-4 h-4 text-[#86b027]" />
                <span className="flex-1 text-sm font-medium text-slate-900">Supplier PCR Declaration</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-dashed">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="flex-1 text-sm text-slate-600">No supplier declaration uploaded</span>
                <Button size="sm" variant="outline">
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </Button>
              </div>
            )}

            {/* Third-Party Verification */}
            {packaging.verification_certificate_url ? (
              <a 
                href={packaging.verification_certificate_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-white rounded-lg border hover:bg-slate-50 transition-colors"
              >
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="flex-1 text-sm font-medium text-slate-900">Third-Party Verification Report</span>
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-dashed">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="flex-1 text-sm text-slate-600">No third-party verification</span>
                <Button size="sm" variant="outline">
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Blockchain Audit Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">Blockchain Audit Trail</h4>
            <Badge className="bg-purple-600 text-white">
              {blockchainLogs.length} records
            </Badge>
          </div>

          {blockchainLogs.length > 0 ? (
            <div className="space-y-2">
              {blockchainLogs.slice(0, 5).map(log => (
                <div key={log.id} className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900 text-sm">{log.action}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {log.transaction_hash && (
                    <div className="text-xs font-mono text-slate-400 bg-slate-50 p-2 rounded">
                      {log.transaction_hash.substring(0, 40)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed">
              <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No blockchain records yet</p>
            </div>
          )}
        </div>

        {/* LCA/PCF Link */}
        {packaging.sku_id && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900 text-sm mb-1">Linked to Product LCA/PCF</h4>
                <p className="text-xs text-blue-700">
                  Full lifecycle carbon footprint available in PCF module
                </p>
              </div>
              <a href={`/PCF?product=${packaging.sku_id}`} target="_blank">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  View PCF
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}