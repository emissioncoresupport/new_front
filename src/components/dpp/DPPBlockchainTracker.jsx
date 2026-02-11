import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle2, Clock, AlertCircle, Link2 } from "lucide-react";

export default function DPPBlockchainTracker({ dppId }) {
    const { data: auditLogs = [] } = useQuery({
        queryKey: ['dpp-audit', dppId],
        queryFn: async () => {
            const all = await base44.entities.DPPAuditLog.list();
            return all.filter(log => log.dpp_id === dppId).sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
        },
        enabled: !!dppId
    });

    const getActionIcon = (action) => {
        switch(action) {
            case 'created': return '🆕';
            case 'published': return '🌍';
            case 'material_added': return '🧪';
            case 'sustainability_calculated': return '🌱';
            case 'compliance_verified': return '✅';
            case 'evidence_uploaded': return '📄';
            default: return '📝';
        }
    };

    const getActionColor = (action) => {
        switch(action) {
            case 'created': return 'bg-blue-100 text-blue-700';
            case 'published': return 'bg-emerald-100 text-emerald-700';
            case 'material_added': return 'bg-purple-100 text-purple-700';
            case 'sustainability_calculated': return 'bg-green-100 text-green-700';
            case 'compliance_verified': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Blockchain Audit Trail
                    <Badge variant="outline" className="ml-auto">
                        {auditLogs.length} Blocks
                    </Badge>
                </CardTitle>
                <p className="text-sm text-slate-500">Immutable record of all DPP modifications</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {auditLogs.map((log, idx) => (
                        <div key={log.id} className="relative">
                            {idx < auditLogs.length - 1 && (
                                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-200 -z-10" />
                            )}
                            <div className="flex gap-4 p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                    log.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-600' :
                                    log.verification_status === 'tampered' ? 'bg-rose-100 text-rose-600' :
                                    'bg-amber-100 text-amber-600'
                                }`}>
                                    {log.verification_status === 'verified' ? <CheckCircle2 className="w-6 h-6" /> :
                                     log.verification_status === 'tampered' ? <AlertCircle className="w-6 h-6" /> :
                                     <Clock className="w-6 h-6" />}
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={getActionColor(log.action_type)}>
                                                    {getActionIcon(log.action_type)} {log.action_type.replace('_', ' ')}
                                                </Badge>
                                                {log.verification_status === 'verified' && (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        Verified
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1">
                                                by <strong>{log.actor_name || log.actor_email}</strong>
                                            </p>
                                        </div>
                                        <div className="text-right text-xs text-slate-400">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </div>

                                    {log.blockchain_hash && (
                                        <div className="bg-slate-50 p-2 rounded border text-xs font-mono flex items-center gap-2">
                                            <Link2 className="w-3 h-3 text-slate-400" />
                                            <span className="text-slate-600">Hash: {log.blockchain_hash.substring(0, 16)}...{log.blockchain_hash.substring(log.blockchain_hash.length - 8)}</span>
                                        </div>
                                    )}

                                    {log.changes && (
                                        <details className="mt-2">
                                            <summary className="text-xs text-indigo-600 cursor-pointer hover:underline">
                                                View changes
                                            </summary>
                                            <pre className="text-xs bg-slate-50 p-2 rounded mt-2 overflow-x-auto">
                                                {JSON.stringify(log.changes, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {auditLogs.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Shield className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                            <p>No audit trail yet</p>
                            <p className="text-xs">Actions will be recorded on blockchain</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}