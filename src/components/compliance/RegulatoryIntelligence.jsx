import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
    Radio, Globe, AlertTriangle, CheckCircle2, ArrowRight, 
    RefreshCw, Loader2, ExternalLink, Search, Filter, BookOpen 
} from "lucide-react";
import { toast } from "sonner";

export default function RegulatoryIntelligence() {
    const queryClient = useQueryClient();
    const [isScanning, setIsScanning] = useState(false);
    const [filterType, setFilterType] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch existing updates
    const { data: updates = [], isLoading } = useQuery({
        queryKey: ['regulatory-updates'],
        queryFn: () => base44.entities.RegulatoryUpdate.list('-publication_date')
    });

    // AI Scan Mutation
    const scanMutation = useMutation({
        mutationFn: async () => {
            setIsScanning(true);
            try {
                const prompt = `
                Scan the internet for the latest regulatory updates (last 30 days) from major bodies like ECHA, EPA, EU Commission regarding:
                - PFAS Restrictions
                - CBAM (Carbon Border Adjustment Mechanism)
                - EUDR (Deforestation Regulation)
                - CSRD / CSDDD
                
                Identify 3-5 significant updates.
                For each, provide:
                1. Title & concise summary.
                2. Regulation Type (PFAS, CBAM, EUDR, CSRD, CSDDD, or General).
                3. Source & Date.
                4. Impact Level (High/Medium/Low) for a typical manufacturing/supply chain company.
                5. Impact Analysis (1-2 sentences).
                6. Recommended Actions (2-3 bullet points).
                7. Source URL.

                Return a JSON object with a key "updates" containing an array of these objects.
                `;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            updates: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        summary: { type: "string" },
                                        regulation_type: { type: "string" },
                                        source: { type: "string" },
                                        publication_date: { type: "string" },
                                        impact_level: { type: "string", enum: ["High", "Medium", "Low"] },
                                        impact_analysis: { type: "string" },
                                        recommended_actions: { type: "array", items: { type: "string" } },
                                        url: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                const result = typeof response === 'string' ? JSON.parse(response) : response;

                // Save to DB (avoid duplicates based on title simply for this demo)
                for (const update of result.updates) {
                    const exists = updates.some(u => u.title === update.title);
                    if (!exists) {
                        await base44.entities.RegulatoryUpdate.create(update);
                    }
                }
                
                return result.updates.length;
            } finally {
                setIsScanning(false);
            }
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries(['regulatory-updates']);
            toast.success(`Scan complete. Found ${count} updates.`);
        },
        onError: () => toast.error("Failed to scan for updates.")
    });

    const filteredUpdates = updates.filter(u => {
        const matchesType = filterType === "All" || u.regulation_type === filterType;
        const matchesSearch = u.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              u.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Radio className="w-5 h-5 text-indigo-200 animate-pulse" />
                            <span className="text-indigo-100 font-medium">Monitoring Status</span>
                        </div>
                        <h3 className="text-2xl font-bold">Active</h3>
                        <p className="text-sm text-indigo-200 mt-1">Scanning ECHA, EPA, EU sources daily</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                            <span className="text-slate-500 font-medium">High Impact Alerts</span>
                        </div>
                        <h3 className="text-2xl font-bold text-rose-600">
                            {updates.filter(u => u.impact_level === 'High').length}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Updates requiring immediate attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col justify-center items-center text-center">
                        <Button 
                            onClick={() => scanMutation.mutate()} 
                            disabled={isScanning}
                            className="w-full h-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                        >
                            {isScanning ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Scanning Regulatory Bodies...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-6 h-6" />
                                    <span>Run AI Scan Now</span>
                                </div>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {["All", "PFAS", "CBAM", "EUDR", "CSRD"].map(type => (
                        <Button 
                            key={type}
                            variant={filterType === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterType(type)}
                            className={filterType === type ? "bg-indigo-600" : ""}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search updates..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Updates Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredUpdates.map(update => (
                    <Card key={update.id} className="group hover:shadow-md transition-all border-slate-200">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                            {update.regulation_type}
                                        </Badge>
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Globe className="w-3 h-3" /> {update.source} • {update.publication_date}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg text-slate-800 group-hover:text-indigo-700 transition-colors">
                                        {update.title}
                                    </CardTitle>
                                </div>
                                <Badge className={
                                    update.impact_level === 'High' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' :
                                    update.impact_level === 'Medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                    'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }>
                                    {update.impact_level} Impact
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {update.summary}
                            </p>
                            
                            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-50">
                                <h4 className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Impact Analysis
                                </h4>
                                <p className="text-xs text-indigo-800">
                                    {update.impact_analysis}
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Recommended Actions</h4>
                                <ul className="space-y-1">
                                    {update.recommended_actions?.map((action, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            {action}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-2 flex justify-end">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    onClick={() => window.open(update.url, '_blank')}
                                >
                                    Read Full Source <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredUpdates.length === 0 && !isLoading && (
                    <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-700">No updates found</h3>
                        <p className="text-slate-500">Try adjusting your filters or run a new scan.</p>
                    </div>
                )}
                
                {isLoading && (
                   <div className="col-span-full py-12 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                   </div>
                )}
            </div>
        </div>
    );
}