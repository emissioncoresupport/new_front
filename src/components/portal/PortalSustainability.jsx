import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Leaf, Zap, FileText, Plus, UploadCloud, CheckCircle2, AlertTriangle, Download, Sparkles, ShieldCheck, Database, Lock } from "lucide-react";
import { toast } from "sonner";
import CCFEvidenceVault from "../ccf/CCFEvidenceVault";

export default function PortalSustainability({ supplier, scopes }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("pcf");
    const [isPcfOpen, setIsPcfOpen] = useState(false);
    const [isEnergyOpen, setIsEnergyOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);

    // Fetch PCF Data
    const { data: pcfList = [] } = useQuery({
        queryKey: ['supplier-pcf', supplier?.id],
        queryFn: async () => {
            if (!supplier?.id) return [];
            const all = await base44.entities.SupplierPCF.list();
            return all.filter(p => p.supplier_id === supplier.id);
        },
        enabled: !!supplier?.id
    });

    // Fetch Energy Data
    const { data: energyList = [] } = useQuery({
        queryKey: ['supplier-energy', supplier?.id],
        queryFn: async () => {
            if (!supplier?.id) return [];
            const all = await base44.entities.SupplierFacilityData.list();
            return all.filter(p => p.supplier_id === supplier.id);
        },
        enabled: !!supplier?.id
    });

    // New PCF Form State
    const [newPcf, setNewPcf] = useState({
        product_name: "",
        sku: "",
        pcf_value_kgco2e: "",
        unit: "kg",
        standard: "GHG Protocol Product Standard",
        boundary: "Cradle-to-Gate",
        assurance_level: "Self-declared"
    });

    const createPcfMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                // Update
                const { id, ...updates } = data;
                await base44.entities.SupplierPCF.update(id, {
                    ...updates,
                    pcf_value_kgco2e: Number(updates.pcf_value_kgco2e),
                    status: "Submitted" // Re-submit on edit
                });
            } else {
                // Create
                await base44.entities.SupplierPCF.create({
                    ...data,
                    supplier_id: supplier.id,
                    pcf_value_kgco2e: Number(data.pcf_value_kgco2e),
                    status: "Submitted"
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['supplier-pcf']);
            setIsPcfOpen(false);
            setNewPcf({ // Reset form
                product_name: "",
                sku: "",
                pcf_value_kgco2e: "",
                unit: "kg",
                standard: "GHG Protocol Product Standard",
                boundary: "Cradle-to-Gate",
                assurance_level: "Self-declared"
            });
            toast.success("PCF Data Saved");
            
            // Trigger AI Agent Audit (Simulated)
            setTimeout(() => {
                toast.info("AI Auditor: Reviewing emission factors...", { duration: 3000 });
            }, 1000);
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Sustainability Data Exchange</h2>
                    <p className="text-slate-500">Share primary carbon footprint data to improve Scope 3 accuracy.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white" onClick={() => toast.success("Report generated (PACT Standard)")}>
                        <Download className="w-4 h-4 mr-2" /> Export PACT Report
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white p-1 rounded-lg border border-slate-200">
                    <TabsTrigger value="pcf" className="gap-2"><Leaf className="w-4 h-4" /> Product Carbon Footprint (PCF)</TabsTrigger>
                    <TabsTrigger value="components" className="gap-2"><Database className="w-4 h-4" /> Component Data</TabsTrigger>
                    <TabsTrigger value="energy" className="gap-2"><Zap className="w-4 h-4" /> Facility Energy</TabsTrigger>
                    <TabsTrigger value="evidence" className="gap-2"><Lock className="w-4 h-4" /> Evidence Vault</TabsTrigger>
                </TabsList>

                <TabsContent value="evidence" className="space-y-4">
                    <CCFEvidenceVault />
                </TabsContent>

                <TabsContent value="components" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Component Data Management</CardTitle>
                            <CardDescription>Manage detailed emission factors and lifecycle stages for components you supply.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-slate-400">
                                <Database className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                                <p>Component data editing is available via the Data Requests tab or specific RFI tasks.</p>
                                <Button variant="outline" className="mt-4" onClick={() => toast.info("Feature coming soon")}>Upload Component List</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pcf" className="space-y-4">
                    {/* PCF Dashboard */}
                    <div className="grid grid-cols-3 gap-4 mb-2">
                        <Card className="bg-slate-50 border-slate-200">
                             <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Products</p>
                                    <p className="text-2xl font-bold text-slate-800">{pcfList.length}</p>
                                </div>
                                <FileText className="w-8 h-8 text-slate-300" />
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-emerald-100">
                             <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-emerald-600 uppercase font-bold">Verified</p>
                                    <p className="text-2xl font-bold text-emerald-700">{pcfList.filter(p => p.assurance_level === 'Third-party Verified').length}</p>
                                </div>
                                <ShieldCheck className="w-8 h-8 text-emerald-300" />
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50 border-blue-100">
                             <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-600 uppercase font-bold">Avg. Intensity</p>
                                    <p className="text-2xl font-bold text-blue-700">
                                        {(pcfList.reduce((sum, p) => sum + (p.pcf_value_kgco2e || 0), 0) / (pcfList.length || 1)).toFixed(2)}
                                    </p>
                                </div>
                                <Leaf className="w-8 h-8 text-blue-300" />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Submitted Products</CardTitle>
                                <CardDescription>Category 1 (Purchased Goods) & Category 11 (Use of Sold Products) Data</CardDescription>
                            </div>
                            <Button onClick={() => {
                                setNewPcf({
                                    product_name: "",
                                    sku: "",
                                    pcf_value_kgco2e: "",
                                    unit: "kg",
                                    standard: "GHG Protocol Product Standard",
                                    boundary: "Cradle-to-Gate",
                                    assurance_level: "Self-declared"
                                });
                                setIsPcfOpen(true);
                            }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="w-4 h-4 mr-2" /> Add PCF
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product / SKU</TableHead>
                                        <TableHead>Intensity</TableHead>
                                        <TableHead>Standard</TableHead>
                                        <TableHead>Assurance</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Verification</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pcfList.map(pcf => (
                                        <TableRow key={pcf.id}>
                                            <TableCell>
                                                <div className="font-medium">{pcf.product_name}</div>
                                                <div className="text-xs text-slate-500">{pcf.sku}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold text-slate-800">{pcf.pcf_value_kgco2e} kgCO₂e</div>
                                                <div className="text-xs text-slate-500">per {pcf.unit}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal text-xs">{pcf.standard}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    {pcf.assurance_level === 'Third-party Verified' ? 
                                                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> : 
                                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                    }
                                                    {pcf.assurance_level}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    pcf.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                    pcf.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }>{pcf.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-700">
                                                        <Sparkles className="w-3 h-3 mr-1" /> AI Check
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                                        setNewPcf({
                                                            id: pcf.id,
                                                            product_name: pcf.product_name,
                                                            sku: pcf.sku,
                                                            pcf_value_kgco2e: pcf.pcf_value_kgco2e,
                                                            unit: pcf.unit,
                                                            standard: pcf.standard,
                                                            boundary: pcf.boundary,
                                                            assurance_level: pcf.assurance_level
                                                        });
                                                        setIsPcfOpen(true);
                                                    }}>
                                                        Edit
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {pcfList.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">No PCF data submitted.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="energy" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Facility Energy Data</CardTitle>
                                <CardDescription>Upload site-level energy consumption (Electricity, Gas) for allocation.</CardDescription>
                            </div>
                            <Button onClick={() => setIsEnergyOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <UploadCloud className="w-4 h-4 mr-2" /> Upload Energy Data
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Site Name</TableHead>
                                        <TableHead>Year</TableHead>
                                        <TableHead>Electricity (kWh)</TableHead>
                                        <TableHead>Gas (m³)</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Evidence</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {energyList.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="font-medium">{e.site_name}</TableCell>
                                            <TableCell>{e.year}</TableCell>
                                            <TableCell>{e.electricity_consumption_kwh?.toLocaleString()}</TableCell>
                                            <TableCell>{e.natural_gas_consumption_m3?.toLocaleString()}</TableCell>
                                            <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {e.evidence_url && <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><FileText className="w-4 h-4" /></Button>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {energyList.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                                No energy data uploaded yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

            <Dialog open={isEnergyOpen} onOpenChange={setIsEnergyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Energy Data</DialogTitle>
                        <DialogDescription>Input annual consumption for a specific production site.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Site Name</Label>
                            <Input placeholder="e.g. Shanghai Factory 1" id="site_name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Reporting Year</Label>
                                <Input type="number" defaultValue={new Date().getFullYear()} id="year" />
                            </div>
                            <div className="space-y-2">
                                <Label>Renewable %</Label>
                                <Input type="number" placeholder="0" id="renewable" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Electricity (kWh)</Label>
                                <Input type="number" placeholder="0" id="elec" />
                            </div>
                            <div className="space-y-2">
                                <Label>Natural Gas (m³)</Label>
                                <Input type="number" placeholder="0" id="gas" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Evidence (Utility Bill)</Label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center">
                                <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                <p className="text-xs text-slate-500">Upload PDF/JPG</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEnergyOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                            // Mock submission
                            toast.success("Energy data uploaded successfully");
                            setIsEnergyOpen(false);
                        }} className="bg-indigo-600 text-white">Submit Data</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </Tabs>

            {/* New PCF Modal */}
            <Dialog open={isPcfOpen} onOpenChange={setIsPcfOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Submit Product Carbon Footprint</DialogTitle>
                        <CardDescription>Provide primary data for a specific product/SKU.</CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Product Name</Label>
                                <Input 
                                    value={newPcf.product_name} 
                                    onChange={(e) => setNewPcf({...newPcf, product_name: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SKU / Identifier</Label>
                                <Input 
                                    value={newPcf.sku} 
                                    onChange={(e) => setNewPcf({...newPcf, sku: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>PCF Value (kgCO₂e)</Label>
                                <Input 
                                    type="number"
                                    value={newPcf.pcf_value_kgco2e} 
                                    onChange={(e) => setNewPcf({...newPcf, pcf_value_kgco2e: e.target.value})} 
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={newPcf.unit} onValueChange={(v) => setNewPcf({...newPcf, unit: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="unit">unit</SelectItem>
                                        <SelectItem value="m2">m²</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Standard</Label>
                                <Select value={newPcf.standard} onValueChange={(v) => setNewPcf({...newPcf, standard: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GHG Protocol Product Standard">GHG Protocol</SelectItem>
                                        <SelectItem value="ISO 14067">ISO 14067</SelectItem>
                                        <SelectItem value="PACT">PACT (WBCSD)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Boundary</Label>
                                <Select value={newPcf.boundary} onValueChange={(v) => setNewPcf({...newPcf, boundary: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cradle-to-Gate">Cradle-to-Gate</SelectItem>
                                        <SelectItem value="Cradle-to-Grave">Cradle-to-Grave</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPcfOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={() => createPcfMutation.mutate(newPcf)}
                            disabled={createPcfMutation.isPending || !newPcf.product_name || !newPcf.pcf_value_kgco2e}
                            className="bg-[#86b027] hover:bg-[#769c22] text-white"
                        >
                            {createPcfMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Data"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}