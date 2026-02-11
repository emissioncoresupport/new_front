import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function BOMVersionHistory({ productId }) {
    const [selectedVersion, setSelectedVersion] = useState(null);

    const { data: versions = [] } = useQuery({
        queryKey: ['product-versions', productId],
        queryFn: async () => {
            // Get all calculation events from audit log
            const logs = await base44.entities.PCFAuditLog.filter({ 
                product_id: productId,
                action: 'Updated'
            });
            
            // Group by timestamp to create version snapshots
            const versionMap = {};
            logs.forEach(log => {
                const date = new Date(log.timestamp).toISOString().split('T')[0];
                if (!versionMap[date]) {
                    versionMap[date] = {
                        date: log.timestamp,
                        changes: [],
                        performer: log.performed_by
                    };
                }
                versionMap[date].changes.push(log);
            });

            return Object.values(versionMap).sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    });

    // Get current product to compare
    const { data: currentProduct } = useQuery({
        queryKey: ['product', productId],
        queryFn: async () => {
            const list = await base44.entities.Product.list();
            return list.find(p => p.id === productId);
        }
    });

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-slate-600" />
                    Version History
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {/* Current Version */}
                        <div className="bg-[#86b027]/10 border border-[#86b027] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-[#86b027] text-white">Current Version</Badge>
                                <span className="text-xs text-slate-500">
                                    {currentProduct?.last_calculated_date 
                                        ? formatDistanceToNow(new Date(currentProduct.last_calculated_date), { addSuffix: true })
                                        : 'Not calculated yet'
                                    }
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-slate-600">Total Impact</p>
                                    <p className="font-bold text-[#86b027]">{(currentProduct?.total_co2e_kg || 0).toFixed(3)} kg CO₂e</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600">Audit Score</p>
                                    <p className="font-bold text-slate-700">{currentProduct?.audit_readiness_score || 0}%</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600">Status</p>
                                    <Badge variant="outline" className="text-xs">{currentProduct?.status || 'Draft'}</Badge>
                                </div>
                            </div>
                        </div>

                        {versions.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No version history yet</p>
                        ) : (
                            versions.map((version, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span className="text-xs font-medium text-slate-700">
                                                {new Date(version.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            {formatDistanceToNow(new Date(version.date), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mb-2">
                                        Updated by {version.performer?.split('@')[0] || 'System'}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <Badge variant="outline" className="text-[10px]">
                                            {version.changes.length} change{version.changes.length !== 1 ? 's' : ''}
                                        </Badge>
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