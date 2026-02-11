import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, Ruler, Plus, Pencil, Trash2, Factory, Warehouse, Building } from "lucide-react";
import { toast } from "sonner";

export default function FacilityManager() {
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [currentFacility, setCurrentFacility] = useState(null);
    
    const defaultFacility = {
        name: "",
        type: "Office",
        country: "",
        address: "",
        floor_area_sqm: "",
        headcount: "",
        grid_region: "",
        status: "Active"
    };

    const [formData, setFormData] = useState(defaultFacility);

    const { data: facilities = [], isLoading } = useQuery({
        queryKey: ['facilities'],
        queryFn: () => base44.entities.Facility.list()
    });

    const saveMutation = useMutation({
        mutationFn: (data) => {
            if (currentFacility) {
                return base44.entities.Facility.update(currentFacility.id, data);
            }
            return base44.entities.Facility.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['facilities']);
            setIsEditOpen(false);
            setCurrentFacility(null);
            setFormData(defaultFacility);
            toast.success(currentFacility ? "Facility updated" : "Facility created successfully");
        },
        onError: (err) => toast.error("Failed to save facility")
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Facility.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['facilities']);
            toast.success("Facility removed");
        }
    });

    const handleEdit = (facility) => {
        setCurrentFacility(facility);
        setFormData({
            name: facility.name,
            type: facility.type,
            country: facility.country,
            address: facility.address || "",
            floor_area_sqm: facility.floor_area_sqm,
            headcount: facility.headcount,
            grid_region: facility.grid_region || "",
            status: facility.status
        });
        setIsEditOpen(true);
    };

    const handleCreate = () => {
        setCurrentFacility(null);
        setFormData(defaultFacility);
        setIsEditOpen(true);
    };

    const getIcon = (type) => {
        switch(type) {
            case 'Manufacturing': return <Factory className="w-4 h-4 text-amber-600" />;
            case 'Warehouse': return <Warehouse className="w-4 h-4 text-blue-600" />;
            default: return <Building className="w-4 h-4 text-slate-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Facility Management</h3>
                    <p className="text-sm text-slate-500">Define organizational boundaries for ISO 14064 reporting.</p>
                </div>
                <Button onClick={handleCreate} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Facility
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm">
                            <Building2 className="w-6 h-6 text-[#86b027]" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Facilities</p>
                            <h4 className="text-2xl font-bold text-slate-800">{facilities.length}</h4>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm">
                            <Ruler className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Floor Area</p>
                            <h4 className="text-2xl font-bold text-slate-800">
                                {facilities.reduce((acc, f) => acc + (Number(f.floor_area_sqm) || 0), 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">m²</span>
                            </h4>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-full border border-slate-200 shadow-sm">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Headcount</p>
                            <h4 className="text-2xl font-bold text-slate-800">
                                {facilities.reduce((acc, f) => acc + (Number(f.headcount) || 0), 0).toLocaleString()}
                            </h4>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Sites</CardTitle>
                    <CardDescription>All facilities within the operational control boundary.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Facility Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {facilities.map(facility => (
                                <TableRow key={facility.id}>
                                    <TableCell className="font-medium flex items-center gap-3">
                                        {getIcon(facility.type)}
                                        {facility.name}
                                    </TableCell>
                                    <TableCell>{facility.type}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <MapPin className="w-3 h-3" />
                                            {facility.country}
                                        </div>
                                        <div className="text-xs text-slate-400 pl-4">{facility.address}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs space-y-1">
                                            <div className="flex items-center gap-1">
                                                <Ruler className="w-3 h-3 text-slate-400" /> 
                                                {Number(facility.floor_area_sqm).toLocaleString()} m²
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3 text-slate-400" /> 
                                                {Number(facility.headcount).toLocaleString()} FTEs
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={facility.status === 'Active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500'}>
                                            {facility.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(facility)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => deleteMutation.mutate(facility.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {facilities.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                        No facilities added. Add a facility to start tracking emissions.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{currentFacility ? 'Edit Facility' : 'Add New Facility'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Facility Name</Label>
                                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. HQ Berlin" />
                            </div>
                            <div className="space-y-2">
                                <Label>Facility Type</Label>
                                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Office">Office</SelectItem>
                                        <SelectItem value="Manufacturing">Manufacturing Plant</SelectItem>
                                        <SelectItem value="Warehouse">Warehouse / Logistics</SelectItem>
                                        <SelectItem value="Retail">Retail Store</SelectItem>
                                        <SelectItem value="Data Center">Data Center</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Country</Label>
                            <Select value={formData.country} onValueChange={(v) => setFormData({...formData, country: v})}>
                                <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Germany">Germany</SelectItem>
                                    <SelectItem value="USA">USA</SelectItem>
                                    <SelectItem value="China">China</SelectItem>
                                    <SelectItem value="France">France</SelectItem>
                                    <SelectItem value="UK">UK</SelectItem>
                                    <SelectItem value="Netherlands">Netherlands</SelectItem>
                                    <SelectItem value="India">India</SelectItem>
                                    <SelectItem value="Vietnam">Vietnam</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Address / Site Code</Label>
                            <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full address or internal site code" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Floor Area (m²)</Label>
                                <Input type="number" value={formData.floor_area_sqm} onChange={(e) => setFormData({...formData, floor_area_sqm: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Headcount (FTE)</Label>
                                <Input type="number" value={formData.headcount} onChange={(e) => setFormData({...formData, headcount: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label>Grid Region (Scope 2)</Label>
                                <Input value={formData.grid_region} onChange={(e) => setFormData({...formData, grid_region: e.target.value})} placeholder="e.g. EU-Mix, US-East" />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Closed">Closed / Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name || !formData.country} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                            {saveMutation.isPending ? "Saving..." : "Save Facility"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}