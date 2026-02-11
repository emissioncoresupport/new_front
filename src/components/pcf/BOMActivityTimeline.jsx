import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Edit2, Plus, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function BOMActivityTimeline({ productId }) {
    const { data: auditLogs = [], isLoading } = useQuery({
        queryKey: ['pcf-audit-logs', productId],
        queryFn: async () => {
            const logs = await base44.entities.PCFAuditLog.filter({ product_id: productId });
            return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
    });

    const getActionIcon = (action) => {
        switch (action) {
            case 'Created': return <Plus className="w-3 h-3 text-emerald-600" />;
            case 'Updated': return <Edit2 className="w-3 h-3 text-blue-600" />;
            case 'Deleted': return <Trash2 className="w-3 h-3 text-red-600" />;
            case 'Verified': return <CheckCircle className="w-3 h-3 text-emerald-600" />;
            default: return <Clock className="w-3 h-3 text-slate-400" />;
        }
    };

    if (isLoading) {
        return <div className="text-center py-4 text-slate-400">Loading activity...</div>;
    }

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    Activity Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {auditLogs.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No activity yet</p>
                        ) : (
                            auditLogs.map((log) => (
                                <div key={log.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
                                    <div className="p-1.5 bg-slate-50 rounded-lg h-fit">
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {log.action} component
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    by {log.performed_by?.split('@')[0] || 'Unknown'}
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                            </span>
                                        </div>
                                        {log.changes && (
                                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                                {typeof log.changes === 'string' 
                                                    ? log.changes.substring(0, 100) 
                                                    : JSON.stringify(log.changes).substring(0, 100)
                                                }...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}