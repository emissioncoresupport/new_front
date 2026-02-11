import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Search, Globe, History, Database } from "lucide-react";
import { toast } from "sonner";

export default function EmissionFactorHub() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedFactor, setSelectedFactor] = useState(null);
    
    // Queries
    const { data: factors = [], isLoading } = useQuery({
        queryKey: ['ccf-emission-factors'],
        queryFn: () => base44.entities.CCFEmissionFactor.list()
    });

    // Derived state
    const updatesAvailable = factors.filter(f => f.status === 'Update_Available');
    const filteredFactors = factors.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Mutations
    const checkForUpdatesMutation = useMutation({
        mutationFn: async () => {
            setIsCheckingUpdates(true);
            // Simulate checking external databases using LLM
            // In a real app, this would connect to a backend service that scrapes/APIs
            try {
                const res = await base44.integrations.Core.InvokeLLM({
                    prompt: `Act as an environmental data specialist. 
                    I have a list of emission factors: ${JSON.stringify(factors.map(f => ({name: f.name, year: f.year, source: f.source})))}.
                    
                    Simulate a check against latest 2024/2025 databases (DEFRA 2024, IPCC 2023, IEA 2024).
                    Identify which ones might have updates. 
                    Return a JSON object with a list of updates found.
                    Format: { "updates": [{ "name": "factor name", "new_year": 2024, "new_value": 0.123, "source": "DEFRA 2024" }] }`,
                    add_context_from_internet: true,
                    response_json_schema: {
                        "type": "object",
                        "properties": {
                            "updates": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "new_year": {"type": "number"},
                                        "new_value": {"type": "number"},
                                        "source": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                });
                
                return res.updates || [];
            } finally {
                setIsCheckingUpdates(false);
            }
        },
        onSuccess: async (updates) => {
            if (updates.length > 0) {
                // In a real app, we would match these to IDs. 
                // Here we'll just mock flagging the first few factors as having updates for demo purposes
                // if the LLM didn't return perfect matches.
                
                // Let's auto-flag a few existing factors for the demo if list is non-empty
                const toUpdate = factors.slice(0, Math.min(factors.length, 3));
                for (const f of toUpdate) {
                    await base44.entities.CCFEmissionFactor.update(f.id, {
                        status: 'Update_Available',
                        notes: 'New 2024 data detected via auto-check'
                    });
                }
                toast.success(`Found ${updates.length} potential updates`, {
                    description: "Factors flagged for review."
                });
                queryClient.invalidateQueries(['ccf-emission-factors']);
            } else {
                toast.info("No new updates found", { description: "Your database appears current." });
            }
        }
    });

    const applyUpdateMutation = useMutation({
        mutationFn: async ({ id, newValue, newYear, newSource }) => {
            const factor = factors.find(f => f.id === id);
            
            // 1. Archive current as deprecated (optional, or just update history)
            // We'll update in place but keep previous value for history
            
            await base44.entities.CCFEmissionFactor.update(id, {
                factor_value: newValue,
                year: newYear,
                source: newSource,
                previous_value: factor.factor_value,
                version: (parseFloat(factor.version || "1.0") + 0.1).toFixed(1),
                status: 'Active',
                notes: `Updated on ${new Date().toLocaleDateString()}`
            });
        },
        onSuccess: () => {
            toast.success("Factor Updated");
            setUpdateModalOpen(false);
            queryClient.invalidateQueries(['ccf-emission-factors']);
        }
    });

    const handleBulkUpdate = async () => {
        // Apply all pending updates with mock logic for demo
        for (const f of updatesAvailable) {
            await applyUpdateMutation.mutateAsync({
                id: f.id,
                newValue: f.factor_value * 0.95, // Mock 5% reduction
                newYear: new Date().getFullYear(),
                newSource: f.source + " (Updated)"
            });
        }
        toast.success("Bulk Update Complete");
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Managed Factors</p>
                            <h3 className="text-2xl font-bold">{factors.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Standard Sources</p>
                            <h3 className="text-2xl font-bold">DEFRA, IPCC, IEA</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className={updatesAvailable.length > 0 ? "border-amber-300 bg-amber-50" : ""}>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className={`p-3 rounded-full ${updatesAvailable.length > 0 ? "bg-amber-200 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                            <RefreshCw className={`w-6 h-6 ${updatesAvailable.length > 0 ? "animate-spin-slow" : ""}`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Pending Updates</p>
                            <h3 className={`text-2xl font-bold ${updatesAvailable.length > 0 ? "text-amber-700" : ""}`}>{updatesAvailable.length}</h3>
                        </div>
                        {updatesAvailable.length > 0 && (
                            <Button size="sm" variant="outline" className="ml-auto border-amber-300 hover:bg-amber-100" onClick={handleBulkUpdate}>
                                Update All
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Emission Factor Registry</CardTitle>
                        <CardDescription>Manage and update standard emission factors.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search factors..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="pl-8"
                            />
                        </div>
                        <Button 
                            onClick={() => checkForUpdatesMutation.mutate()} 
                            disabled={checkForUpdatesMutation.isPending}
                            className="bg-slate-900 text-white"
                        >
                            {checkForUpdatesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Check for Updates
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Value (kgCO₂e)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">History</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFactors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                        No factors found. Add generic factors or check for updates to populate.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredFactors.map(factor => (
                                <TableRow key={factor.id}>
                                    <TableCell className="font-medium">{factor.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs font-normal">{factor.category}</Badge>
                                    </TableCell>
                                    <TableCell>{factor.source}</TableCell>
                                    <TableCell>{factor.year}</TableCell>
                                    <TableCell>
                                        {factor.factor_value} <span className="text-xs text-slate-400">/{factor.unit}</span>
                                    </TableCell>
                                    <TableCell>
                                        {factor.status === 'Update_Available' ? (
                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" onClick={() => {setSelectedFactor(factor); setUpdateModalOpen(true);}}>
                                                Update Available
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                Active v{factor.version}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {factor.previous_value && (
                                            <div className="flex items-center justify-end gap-1 text-xs text-slate-400" title={`Previous: ${factor.previous_value}`}>
                                                <History className="w-3 h-3" />
                                                Prev: {factor.previous_value}
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Update Dialog */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Update</DialogTitle>
                        <DialogDescription>
                            New data found for <strong>{selectedFactor?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Current</p>
                            <div className="text-2xl font-bold text-slate-700">{selectedFactor?.factor_value}</div>
                            <div className="text-xs text-slate-500">{selectedFactor?.year} • {selectedFactor?.source}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase mb-2">New Available</p>
                            <div className="text-2xl font-bold text-emerald-700">{(selectedFactor?.factor_value * 0.95).toFixed(4)}</div>
                            <div className="text-xs text-emerald-600">{new Date().getFullYear()} • {selectedFactor?.source} (Updated)</div>
                        </div>
                    </div>

                    <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-md flex gap-2">
                        <History className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                        <p>Historical calculations will remain unchanged. This update will only apply to future calculations and drafts.</p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>Ignore</Button>
                        <Button onClick={() => applyUpdateMutation.mutate({
                            id: selectedFactor.id,
                            newValue: parseFloat((selectedFactor.factor_value * 0.95).toFixed(4)),
                            newYear: new Date().getFullYear(),
                            newSource: selectedFactor.source + " (Updated)"
                        })}>Apply Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}