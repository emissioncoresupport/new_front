import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Clock, User, FileCheck, Hash } from "lucide-react";

export default function PFASBlockchainAuditTrail({ assessmentId }) {
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['blockchain-audit', assessmentId],
    queryFn: async () => {
      const logs = await base44.entities.BlockchainAuditLog.filter({
        entity_id: assessmentId,
        entity_type: 'PFASAssessment'
      });
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    enabled: !!assessmentId
  });

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Shield className="w-5 h-5" />
          Blockchain Audit Trail
        </CardTitle>
        <p className="text-sm text-slate-500">
          Immutable compliance history - tamper-proof timestamps
        </p>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audit records yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-slate-900">{log.action}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {log.blockchain_network}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-3 h-3" />
                    {log.actor || 'System'}
                  </div>
                </div>

                {log.transaction_hash && (
                  <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Hash className="w-3 h-3 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-700">Transaction Hash</span>
                    </div>
                    <code className="text-xs text-slate-500 font-mono break-all">
                      {log.transaction_hash}
                    </code>
                  </div>
                )}

                {log.metadata_json && (
                  <div className="mt-2 text-xs text-slate-600">
                    Risk Score: <strong>{log.metadata_json.risk_score || 'N/A'}</strong>
                    {log.metadata_json.status && ` • Status: ${log.metadata_json.status}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}