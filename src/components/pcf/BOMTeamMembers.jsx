import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Crown } from "lucide-react";

export default function BOMTeamMembers({ productId }) {
    // Get all users who contributed to this product
    const { data: contributors = [] } = useQuery({
        queryKey: ['product-contributors', productId],
        queryFn: async () => {
            const logs = await base44.entities.PCFAuditLog.filter({ product_id: productId });
            
            // Extract unique contributors
            const contributorMap = {};
            logs.forEach(log => {
                const email = log.performed_by;
                if (email && !contributorMap[email]) {
                    contributorMap[email] = {
                        email: email,
                        name: email.split('@')[0],
                        lastActivity: log.timestamp,
                        actionsCount: 0
                    };
                }
                if (email) {
                    contributorMap[email].actionsCount++;
                    if (new Date(log.timestamp) > new Date(contributorMap[email].lastActivity)) {
                        contributorMap[email].lastActivity = log.timestamp;
                    }
                }
            });

            return Object.values(contributorMap).sort((a, b) => b.actionsCount - a.actionsCount);
        }
    });

    const { data: allUsers = [] } = useQuery({
        queryKey: ['all-users'],
        queryFn: () => base44.entities.User.list()
    });

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-600" />
                    Team Members ({contributors.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                        {contributors.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No contributors yet</p>
                        ) : (
                            contributors.map((contributor) => {
                                const userDetails = allUsers.find(u => u.email === contributor.email);
                                return (
                                    <div key={contributor.email} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-full">
                                                <User className="w-4 h-4 text-slate-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {userDetails?.full_name || contributor.name}
                                                    </p>
                                                    {userDetails?.role === 'admin' && (
                                                        <Crown className="w-3 h-3 text-amber-500" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{contributor.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-xs mb-1">
                                                {contributor.actionsCount} action{contributor.actionsCount !== 1 ? 's' : ''}
                                            </Badge>
                                            <p className="text-[10px] text-slate-400">
                                                Last: {new Date(contributor.lastActivity).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}