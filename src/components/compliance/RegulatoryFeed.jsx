import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ExternalLink, Shield } from "lucide-react";
import RegulatoryMonitor from './RegulatoryMonitor';

export default function RegulatoryFeed() {
    const { data: updates = [], isLoading } = useQuery({
        queryKey: ['regulatory-updates'],
        queryFn: () => base44.entities.RegulatoryUpdate.list('-publication_date', 10)
    });

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Regulatory Feed
                        </CardTitle>
                        <CardDescription>Real-time updates from ECHA & EPA</CardDescription>
                    </div>
                    <RegulatoryMonitor />
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                        {updates.map((update) => (
                            <div key={update.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 relative group hover:bg-slate-100 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={update.impact_level === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                                        {update.impact_level} Impact
                                    </Badge>
                                    <span className="text-xs text-slate-400">{update.publication_date}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">{update.title}</h4>
                                <p className="text-xs text-slate-600 mb-2 line-clamp-3">{update.summary}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500">{update.source}</span>
                                    {update.url && (
                                        <a 
                                            href={update.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Read More <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!isLoading && updates.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No recent updates found.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}