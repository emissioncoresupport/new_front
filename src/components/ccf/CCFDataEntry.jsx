import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FileSpreadsheet, Trash2, Edit2, Search, AlertCircle, CheckCircle2, Building2, UploadCloud, Sparkles, Link as LinkIcon, FileText, BrainCircuit } from "lucide-react";
import { toast } from "sonner";
import AISpendAnalysisModal from './AISpendAnalysisModal';
import CCFBulkImport from './CCFBulkImport';

export default function CCFDataEntry() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    
    const queryClient = useQueryClient();

    const { data: facilities = [] } = useQuery({
        queryKey: ['facilities'],
        queryFn: () => base44.entities.Facility.list()
    });

    const { data: entries = [] } = useQuery({
        queryKey: ['ccf-entries'],
        queryFn: () => base44.entities.CCFEntry.list()
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            // Simple auto-calculation logic
            // In production, fetch factor from DB
            let factor = data.emission_factor || 0;
            if (!factor) {
                // Mock factors
                if (data.activity_source?.includes("Electricity")) factor = 0.4; // kg/kWh
                if (data.activity_source?.includes("Gas")) factor = 2.0; // kg/m3
                if (data.activity_source?.includes("Diesel")) factor = 2.68; // kg/liter
            }

            const payload = {
                ...data,
                emission_factor: factor,
                co2e_kg: data.activity_value * factor,
                status: 'Calculated'
            };

            if (data.id) return base44.entities.CCFEntry.update(data.id, payload);
            return base44.entities.CCFEntry.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['ccf-entries']);
            setIsModalOpen(false);
            toast.success("Entry saved");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.CCFEntry.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['ccf-entries']);
            toast.success("Entry deleted");
        }
    });

    const handleEdit = (entry) => {
        setEditingEntry(entry || {
            facility_id: facilities[0]?.id,
            reporting_year: new Date().getFullYear(),
            period: "Monthly",
            scope: "Scope 1",
            category: "Stationary Combustion",
            activity_source: "Natural Gas",
            activity_value: 0,
            unit: "m3",
            status: "Draft"
        });
        setIsModalOpen(true);
    };

    const handleAIImport = async (importedEntries) => {
        // Bulk create logic
        let successCount = 0;
        for (const entry of importedEntries) {
            try {
                await base44.entities.CCFEntry.create(entry);
                successCount++;
            } catch (e) {
                console.error(e);
            }
        }
        queryClient.invalidateQueries(['ccf-entries']);
        toast.success(`Successfully imported ${successCount} entries via AI Analysis`);
    };

    const filteredEntries = entries.filter(e => 
        e.activity_source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search activity data..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                        onClick={() => setIsAIModalOpen(true)}
                    >
                        <BrainCircuit className="w-4 h-4 mr-2" /> AI Spend Analysis
                    </Button>
                    <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Bulk Import
                    </Button>
                    <Button onClick={() => handleEdit(null)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Activity Data
                    </Button>
                </div>
            </div>

            <AISpendAnalysisModal 
                open={isAIModalOpen} 
                onOpenChange={setIsAIModalOpen}
                onImport={handleAIImport}
            />

            <CCFBulkImport 
                open={isBulkOpen}
                onOpenChange={setIsBulkOpen}
                onImportComplete={() => queryClient.invalidateQueries(['ccf-entries'])}
            />

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Facility</TableHead>
                                <TableHead>Scope / Category</TableHead>
                                <TableHead>Activity Data</TableHead>
                                <TableHead>Emission Factor</TableHead>
                                <TableHead>Emissions (tCO₂e)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map(entry => {
                                const facility = facilities.find(f => f.id === entry.facility_id);
                                return (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                {facility?.name || "Unknown"}
                                            </div>
                                            <span className="text-[10px] text-slate-400">{entry.period} {entry.reporting_year}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                entry.scope === 'Scope 1' ? 'bg-red-50 text-red-700 border-red-200' :
                                                entry.scope === 'Scope 2' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                            }>
                                                {entry.scope}
                                            </Badge>
                                            <div className="text-xs text-slate-500 mt-1">{entry.category}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono">{entry.activity_value} {entry.unit}</div>
                                            <div className="text-xs text-slate-400">{entry.activity_source}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-slate-500">{entry.emission_factor?.toFixed(4)} kg/unit</div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold">{(entry.co2e_kg / 1000).toFixed(3)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-xs">
                                                {entry.status === 'Verified' ? 
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : 
                                                    <AlertCircle className="w-3 h-3 text-slate-400" />
                                                }
                                                {entry.status}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                                                    <Edit2 className="w-3 h-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => deleteMutation.mutate(entry.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                                        No data entries found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingEntry?.id ? 'Edit Activity Data' : 'New Activity Data'}</DialogTitle>
                    </DialogHeader>
                    {editingEntry && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Facility</Label>
                                    <Select value={editingEntry.facility_id} onValueChange={v => setEditingEntry({...editingEntry, facility_id: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {facilities.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Input type="number" value={editingEntry.reporting_year} onChange={e => setEditingEntry({...editingEntry, reporting_year: parseInt(e.target.value)})} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Scope</Label>
                                <Tabs value={editingEntry.scope} onValueChange={v => setEditingEntry({...editingEntry, scope: v})}>
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="Scope 1">Scope 1 (Direct)</TabsTrigger>
                                        <TabsTrigger value="Scope 2">Scope 2 (Energy)</TabsTrigger>
                                        <TabsTrigger value="Scope 3">Scope 3 (Value Chain)</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={editingEntry.category} onValueChange={v => setEditingEntry({...editingEntry, category: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {editingEntry.scope === 'Scope 1' && (
                                                <>
                                                    <SelectItem value="Stationary Combustion">Stationary Combustion</SelectItem>
                                                    <SelectItem value="Mobile Combustion">Mobile Combustion</SelectItem>
                                                    <SelectItem value="Fugitive Emissions">Fugitive Emissions</SelectItem>
                                                </>
                                            )}
                                            {editingEntry.scope === 'Scope 2' && (
                                                <>
                                                    <SelectItem value="Purchased Electricity">Purchased Electricity</SelectItem>
                                                    <SelectItem value="Purchased Heat/Steam">Purchased Heat/Steam</SelectItem>
                                                </>
                                            )}
                                            {editingEntry.scope === 'Scope 3' && (
                                                <>
                                                    <SelectItem value="Cat 1: Purchased goods and services">Cat 1: Purchased goods and services</SelectItem>
                                                    <SelectItem value="Cat 2: Capital goods">Cat 2: Capital goods</SelectItem>
                                                    <SelectItem value="Cat 3: Fuel- and energy-related activities">Cat 3: Fuel- and energy-related activities</SelectItem>
                                                    <SelectItem value="Cat 4: Upstream transportation and distribution">Cat 4: Upstream transportation and distribution</SelectItem>
                                                    <SelectItem value="Cat 5: Waste generated in operations">Cat 5: Waste generated in operations</SelectItem>
                                                    <SelectItem value="Cat 6: Business travel">Cat 6: Business travel</SelectItem>
                                                    <SelectItem value="Cat 7: Employee commuting">Cat 7: Employee commuting</SelectItem>
                                                    <SelectItem value="Cat 8: Upstream leased assets">Cat 8: Upstream leased assets</SelectItem>
                                                    <SelectItem value="Cat 9: Downstream transportation and distribution">Cat 9: Downstream transportation and distribution</SelectItem>
                                                    <SelectItem value="Cat 10: Processing of sold products">Cat 10: Processing of sold products</SelectItem>
                                                    <SelectItem value="Cat 11: Use of sold products">Cat 11: Use of sold products</SelectItem>
                                                    <SelectItem value="Cat 12: End-of-life treatment of sold products">Cat 12: End-of-life treatment of sold products</SelectItem>
                                                    <SelectItem value="Cat 13: Downstream leased assets">Cat 13: Downstream leased assets</SelectItem>
                                                    <SelectItem value="Cat 14: Franchises">Cat 14: Franchises</SelectItem>
                                                    <SelectItem value="Cat 15: Investments">Cat 15: Investments</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Source Detail</Label>
                                    <Input 
                                        placeholder="e.g. Natural Gas, Diesel Fleet" 
                                        value={editingEntry.activity_source} 
                                        onChange={e => setEditingEntry({...editingEntry, activity_source: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Activity Value</Label>
                                    <Input type="number" value={editingEntry.activity_value} onChange={e => setEditingEntry({...editingEntry, activity_value: parseFloat(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Select value={editingEntry.unit} onValueChange={v => setEditingEntry({...editingEntry, unit: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kWh">kWh</SelectItem>
                                            <SelectItem value="MWh">MWh</SelectItem>
                                            <SelectItem value="liters">Liters</SelectItem>
                                            <SelectItem value="gallons">Gallons</SelectItem>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="m3">m³</SelectItem>
                                            <SelectItem value="km">km</SelectItem>
                                            <SelectItem value="USD">Spend (USD)</SelectItem>
                                            <SelectItem value="EUR">Spend (EUR)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Evidence & Documentation Section */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-900 font-medium">Evidence & Documentation</Label>
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                        <Sparkles className="w-3 h-3 mr-1" /> AI Ready
                                    </Badge>
                                </div>
                                
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-2 bg-white rounded border border-slate-200">
                                            <FileText className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-slate-700">Required: {
                                                editingEntry.scope === 'Scope 1' ? 'Fuel Receipts / Meter Readings' :
                                                editingEntry.scope === 'Scope 2' ? 'Electricity / Heat Utility Bills' :
                                                editingEntry.category?.includes('Purchased goods') ? 'Invoices / BOMs' :
                                                'Activity Data Support'
                                            }</h4>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Upload PDF, PNG, or Excel files. AI will attempt to extract consumption data.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1 bg-white border-dashed border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-600" onClick={() => toast.info("File uploader would open here")}>
                                            <UploadCloud className="w-4 h-4 mr-2" /> Upload Document
                                        </Button>
                                        <Button variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200" onClick={() => {
                                            toast.promise(
                                                new Promise(r => setTimeout(r, 2000)),
                                                {
                                                    loading: 'AI extracting data from document...',
                                                    success: (data) => {
                                                        // Mock AI extraction
                                                        setEditingEntry({...editingEntry, activity_value: 1250.5, unit: 'kWh'});
                                                        return 'Extracted: 1,250.5 kWh';
                                                    },
                                                    error: 'Extraction failed'
                                                }
                                            )
                                        }}>
                                            <Sparkles className="w-4 h-4 mr-2" /> Auto-Extract
                                        </Button>
                                    </div>
                                </div>

                                {/* Link to SupplyLens / Invite for Scope 3 */}
                                {editingEntry.scope === 'Scope 3' && editingEntry.category?.includes('Cat 1') && (
                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center justify-between">
                                        <div className="text-xs text-amber-800">
                                            <span className="font-bold">Supply Chain Data:</span> Manage supplier primary data in SupplyLens.
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="h-7 text-xs bg-white text-amber-700 border-amber-200 hover:bg-amber-100" onClick={() => toast.success("Redirecting to SupplyLens...")}>
                                                <LinkIcon className="w-3 h-3 mr-1" /> Open SupplyLens
                                            </Button>
                                            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => toast.success("Invite sent to supplier")}>
                                                Invite Supplier
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => saveMutation.mutate(editingEntry)} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? "Calculating..." : "Save Entry"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}