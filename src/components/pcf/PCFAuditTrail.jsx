import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, User, AlertCircle, CheckCircle2, FileText, Zap } from "lucide-react";
import { format } from "date-fns";

export default function PCFAuditTrail({ productId }) {
    const { data: logs = [] } = useQuery({
        queryKey: ['pcf-audit-logs', productId],
        queryFn: async () => {
            // In a real scenario we would filter by product_id in the query
            // Assuming list returns all for now and filtering client side if API doesn't support filter param
            const allLogs = await base44.entities.PCFAuditLog.list(); 
            return allLogs
                .filter(l => l.product_id === productId)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
    });

    const getActionIcon = (action) => {
        switch (action) {
            case 'Created': return <FileText className="w-4 h-4 text-blue-500" />;
            case 'Updated': return <History className="w-4 h-4 text-amber-500" />;
            case 'Deleted': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'Matched': return <Zap className="w-4 h-4 text-purple-500" />;
            case 'Verified': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            default: return <History className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-500" /> Audit Trail
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-4 py-2">
                        {logs.length === 0 ? (
                            <div className="text-sm text-slate-400 italic pl-4">No activity recorded yet.</div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="relative pl-6">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[29px] top-1 h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm z-10">
                                        {getActionIcon(log.action)}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-800">{log.action}</span>
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-slate-50">
                                                {log.entity_type}
                                            </Badge>
                                            <span className="text-xs text-slate-400 ml-auto">
                                                {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm') : '-'}
                                            </span>
                                        </div>
                                        
                                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                                            {log.changes ? (
                                                <div className="space-y-1">
                                                    {/* Try parsing detailed changes if JSON */}
                                                    {(() => {
                                                        try {
                                                            const changes = JSON.parse(log.changes);
                                                            return Object.entries(changes).map(([key, val]) => (
                                                                <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-xs">
                                                                    <span className="font-medium text-slate-700">{key}:</span>
                                                                    <span className="text-slate-500 truncate">{String(val)}</span>
                                                                </div>
                                                            ));
                                                        } catch {
                                                            return log.changes;
                                                        }
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="italic text-slate-400">No details provided</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-1">
                                            <Avatar className="h-5 w-5">
                                                <AvatarFallback className="text-[9px] bg-slate-200 text-slate-600">
                                                    {log.performed_by?.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-slate-400">{log.performed_by}</span>
                                        </div>
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