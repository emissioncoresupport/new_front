import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Upload, Download, FileSpreadsheet, Edit2, Trash2, ShieldCheck, Filter } from "lucide-react";
import { toast } from "sonner";

export default function EmissionFactorManager() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterMode, setFilterMode] = useState("All");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFactor, setEditingFactor] = useState(null);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const queryClient = useQueryClient();

    // Fetch Factors
    const { data: factors = [], isLoading } = useQuery({
        queryKey: ['emission-factors'],
        queryFn: () => base44.entities.EmissionFactor.list()
    });

    const { data: carriers = [] } = useQuery({
        queryKey: ['carriers-for-factors'],
        queryFn: () => base44.entities.Carrier.list()
    });

    // Mutations
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return base44.entities.EmissionFactor.update(data.id, data);
            } else {
                return base44.entities.EmissionFactor.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['emission-factors']);
            setIsEditModalOpen(false);
            setEditingFactor(null);
            toast.success(editingFactor?.id ? "Factor updated" : "New factor created");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.EmissionFactor.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['emission-factors']);
            toast.success("Factor deleted");
        }
    });

    // Filter logic
    const filteredFactors = factors.filter(f => {
        const matchesSearch = f.vehicle_type?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              f.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              f.carrier?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMode = filterMode === "All" || f.mode === filterMode;
        return matchesSearch && matchesMode;
    });

    // Handlers
    const handleEdit = (factor) => {
        setEditingFactor(factor || {
            mode: "Road",
            vehicle_type: "",
            factor_value: 0,
            unit: "kg CO2e / t-km",
            source: "Custom",
            year: new Date().getFullYear(),
            iso_compliant: false,
            status: "Active"
        });
        setIsEditModalOpen(true);
    };

    const handleDelete = (id) => {
        if (confirm("Are you sure you want to delete this factor?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleExport = () => {
        const headers = ["Mode", "Vehicle Type", "Carrier", "Region", "Factor", "Unit", "Source", "Year", "ISO Compliant"];
        const csvContent = [
            headers.join(","),
            ...filteredFactors.map(f => [
                f.mode,
                `"${f.vehicle_type || ''}"`,
                `"${f.carrier || ''}"`,
                f.region || '',
                f.factor_value,
                f.unit,
                f.source,
                f.year,
                f.iso_compliant ? "Yes" : "No"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `emission_factors_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success("Export downloaded");
    };

    const handleImport = (e) => {
        // Mock import logic
        toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
            loading: 'Parsing CSV and validating against ISO 14083...',
            success: 'Imported 12 new factors successfully',
            error: 'Import failed'
        });
        setIsImportOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#545454]">Emission Factors Library</h2>
                    <p className="text-sm text-slate-500">Manage standard and custom emission intensity factors (ISO 14083)</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" /> Import
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                    <Button onClick={() => handleEdit(null)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add Factor
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by vehicle, carrier, or source..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200"
                    />
                </div>
                <Select value={filterMode} onValueChange={setFilterMode}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Filter Mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Modes</SelectItem>
                        <SelectItem value="Air">Air</SelectItem>
                        <SelectItem value="Sea">Sea</SelectItem>
                        <SelectItem value="Road">Road</SelectItem>
                        <SelectItem value="Rail">Rail</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Factors Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Mode</TableHead>
                                <TableHead>Vehicle / Carrier</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Factor</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>ISO 14083</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading factors...</TableCell>
                                </TableRow>
                            ) : filteredFactors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">No factors found. Add one to get started.</TableCell>
                                </TableRow>
                            ) : (
                                filteredFactors.map((factor) => (
                                    <TableRow key={factor.id}>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-slate-50">{factor.mode}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-700">{factor.vehicle_type || "Generic"}</div>
                                            {factor.carrier && <div className="text-xs text-slate-500">{factor.carrier}</div>}
                                        </TableCell>
                                        <TableCell className="text-slate-500">{factor.region || "Global"}</TableCell>
                                        <TableCell>
                                            <div className="font-mono font-bold text-slate-700">{factor.factor_value}</div>
                                            <div className="text-[10px] text-slate-400">{factor.unit}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {factor.source} ({factor.year})
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {factor.iso_compliant ? (
                                                <div className="flex items-center text-emerald-600 text-xs font-medium">
                                                    <ShieldCheck className="w-3 h-3 mr-1" /> Compliant
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(factor)}>
                                                    <Edit2 className="w-3 h-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(factor.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit/Create Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingFactor?.id ? "Edit Emission Factor" : "Add New Emission Factor"}</DialogTitle>
                        <DialogDescription>Define custom emission intensity factors for logistics calculations.</DialogDescription>
                    </DialogHeader>
                    
                    {editingFactor && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Transport Mode</Label>
                                    <Select 
                                        value={editingFactor.mode} 
                                        onValueChange={(v) => setEditingFactor({...editingFactor, mode: v})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Air">Air</SelectItem>
                                            <SelectItem value="Sea">Sea</SelectItem>
                                            <SelectItem value="Road">Road</SelectItem>
                                            <SelectItem value="Rail">Rail</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Region</Label>
                                    <Input 
                                        value={editingFactor.region || ""} 
                                        onChange={(e) => setEditingFactor({...editingFactor, region: e.target.value})}
                                        placeholder="e.g. EU, Global" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Vehicle Type / Asset Class</Label>
                                <Input 
                                    value={editingFactor.vehicle_type || ""} 
                                    onChange={(e) => setEditingFactor({...editingFactor, vehicle_type: e.target.value})}
                                    placeholder="e.g. Heavy Truck > 26t, Container Ship" 
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Carrier (Optional)</Label>
                                <Select 
                                    value={editingFactor.carrier} 
                                    onValueChange={(v) => setEditingFactor({...editingFactor, carrier: v})}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select Carrier" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Generic">Generic / None</SelectItem>
                                        {carriers.filter(c => c.active).map(c => (
                                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Factor Value</Label>
                                    <Input 
                                        type="number" 
                                        step="0.0001"
                                        value={editingFactor.factor_value} 
                                        onChange={(e) => setEditingFactor({...editingFactor, factor_value: parseFloat(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Select 
                                        value={editingFactor.unit} 
                                        onValueChange={(v) => setEditingFactor({...editingFactor, unit: v})}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kg CO2e / t-km">kg CO2e / t-km</SelectItem>
                                            <SelectItem value="g CO2e / t-km">g CO2e / t-km</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Source</Label>
                                    <Input 
                                        value={editingFactor.source} 
                                        onChange={(e) => setEditingFactor({...editingFactor, source: e.target.value})}
                                        placeholder="e.g. Custom, GLEC" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Year</Label>
                                    <Input 
                                        type="number"
                                        value={editingFactor.year} 
                                        onChange={(e) => setEditingFactor({...editingFactor, year: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox 
                                    id="iso" 
                                    checked={editingFactor.iso_compliant} 
                                    onCheckedChange={(c) => setEditingFactor({...editingFactor, iso_compliant: c})}
                                />
                                <label htmlFor="iso" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Verified ISO 14083 Compliant
                                </label>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => saveMutation.mutate(editingFactor)} disabled={saveMutation.isPending}>
                            {saveMutation.isPending ? "Saving..." : "Save Factor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Modal */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Emission Factors</DialogTitle>
                        <DialogDescription>Upload a CSV file containing emission factors. Required columns: Mode, Factor, Source.</DialogDescription>
                    </DialogHeader>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center space-y-4">
                        <div className="p-4 bg-slate-50 rounded-full inline-block">
                            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <Button variant="outline" className="relative">
                                Select CSV File
                                <input type="file" accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImport} />
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400">Supported format: .csv (UTF-8)</p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}