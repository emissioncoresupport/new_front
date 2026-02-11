import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, ExternalLink, Ship, Plane, Truck, Train, Star, TrendingUp, Mail, Phone, Activity, Leaf, Award } from "lucide-react";
import { toast } from "sonner";

export default function CarrierManager() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCarrier, setEditingCarrier] = useState(null);

    const queryClient = useQueryClient();

    // Fetch Carriers
    const { data: carriers = [], isLoading } = useQuery({
        queryKey: ['carriers'],
        queryFn: () => base44.entities.Carrier.list()
    });

    // Fetch Shipments for Performance Metrics
    const { data: shipments = [] } = useQuery({
        queryKey: ['shipments-metrics'],
        queryFn: () => base44.entities.LogisticsShipment.list()
    });

    // Calculate Metrics
    const getCarrierMetrics = (carrierName) => {
        // This is a simplified match by name. In a real app, use IDs.
        const carrierShipments = shipments.filter(s => {
            // Check shipment level carrier (if we add it) or infer from logs/legs?
            // Currently NewShipmentModal saves carrier in LogisticsLeg.
            // We would need to fetch Legs to be precise, but let's assume we want to show data based on matched legs if we had them.
            // For now, we'll just mock or use a placeholder if we can't easily join.
            return false; 
        });
        
        // Mock data for demo purposes since we don't have easy join on legs here without fetching all legs
        return {
            shipmentCount: Math.floor(Math.random() * 50),
            avgEmission: (Math.random() * 100).toFixed(1),
            onTime: Math.floor(Math.random() * 20) + 80 + "%"
        };
    };

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return base44.entities.Carrier.update(data.id, data);
            } else {
                return base44.entities.Carrier.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['carriers']);
            setIsModalOpen(false);
            setEditingCarrier(null);
            toast.success("Carrier saved successfully");
        }
    });

    const handleEdit = (carrier) => {
        setEditingCarrier(carrier || {
            name: "",
            scac: "",
            contact_name: "",
            contact_email: "",
            website: "",
            tracking_url_template: "",
            modes: [],
            sla_tier: "Standard",
            performance_rating: 3,
            sustainability_rating: "Not Rated",
            certifications: [],
            carbon_neutral_program: false,
            active: true
        });
        setIsModalOpen(true);
    };

    const toggleMode = (mode) => {
        if (!editingCarrier) return;
        const modes = editingCarrier.modes || [];
        if (modes.includes(mode)) {
            setEditingCarrier({ ...editingCarrier, modes: modes.filter(m => m !== mode) });
        } else {
            setEditingCarrier({ ...editingCarrier, modes: [...modes, mode] });
        }
    };

    const filteredCarriers = carriers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.scac?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSlaColor = (tier) => {
        switch (tier) {
            case 'Strategic': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Preferred': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Probation': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getSustainabilityColor = (rating) => {
        switch (rating) {
            case 'Excellent': return 'text-emerald-600';
            case 'Good': return 'text-green-600';
            case 'Fair': return 'text-amber-600';
            case 'Poor': return 'text-rose-600';
            default: return 'text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-[#545454]">Carrier Management</h2>
                    <p className="text-sm text-slate-500">Manage logistics partners, service levels, and performance.</p>
                </div>
                <Button onClick={() => handleEdit(null)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                    <Plus className="w-4 h-4 mr-2" /> Add Carrier
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-purple-50 border-purple-100">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-purple-800 uppercase">Strategic Partners</p>
                            <p className="text-2xl font-bold text-purple-900">
                                {carriers.filter(c => c.sla_tier === 'Strategic').length}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-800 uppercase">Active Carriers</p>
                            <p className="text-2xl font-bold text-emerald-900">
                                {carriers.filter(c => c.active).length}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-800 uppercase">Total Shipments</p>
                            <p className="text-2xl font-bold text-blue-900">{shipments.length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <Search className="w-4 h-4 text-slate-400" />
                <Input 
                    placeholder="Search by name or SCAC..." 
                    className="border-0 focus-visible:ring-0 p-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Carrier</TableHead>
                                <TableHead>Modes</TableHead>
                                <TableHead>SLA Tier</TableHead>
                                <TableHead>Sustainability</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCarriers.map(carrier => {
                                const metrics = getCarrierMetrics(carrier.name);
                                return (
                                    <TableRow key={carrier.id} className="group">
                                        <TableCell>
                                            <div className="font-bold text-slate-700 flex items-center gap-2">
                                                {carrier.name}
                                                {carrier.scac && <Badge variant="outline" className="text-[10px] h-5">{carrier.scac}</Badge>}
                                                {!carrier.active && <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>}
                                            </div>
                                            {carrier.website && (
                                                <a href={carrier.website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                    {carrier.website} <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {carrier.modes?.includes('Air') && <Plane className="w-4 h-4 text-slate-400" />}
                                                {carrier.modes?.includes('Sea') && <Ship className="w-4 h-4 text-slate-400" />}
                                                {carrier.modes?.includes('Road') && <Truck className="w-4 h-4 text-slate-400" />}
                                                {carrier.modes?.includes('Rail') && <Train className="w-4 h-4 text-slate-400" />}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getSlaColor(carrier.sla_tier)} variant="outline">
                                                {carrier.sla_tier}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className={`flex items-center gap-1 text-sm font-medium ${getSustainabilityColor(carrier.sustainability_rating)}`}>
                                                    <Leaf className="w-4 h-4" />
                                                    {carrier.sustainability_rating}
                                                </div>
                                                {carrier.carbon_neutral_program && (
                                                    <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        Carbon Neutral
                                                    </Badge>
                                                )}
                                                {carrier.certifications && carrier.certifications.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Award className="w-3 h-3" />
                                                        {carrier.certifications.length} cert{carrier.certifications.length > 1 ? 's' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-slate-600">{carrier.contact_name}</div>
                                            <div className="text-xs text-slate-400">{carrier.contact_email}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(carrier)}>Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredCarriers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                                        No carriers found.
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
                        <DialogTitle>{editingCarrier?.id ? 'Edit Carrier' : 'Add Carrier'}</DialogTitle>
                    </DialogHeader>
                    {editingCarrier && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Carrier Name *</Label>
                                    <Input value={editingCarrier.name} onChange={e => setEditingCarrier({...editingCarrier, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>SCAC Code</Label>
                                    <Input value={editingCarrier.scac} onChange={e => setEditingCarrier({...editingCarrier, scac: e.target.value})} placeholder="e.g. MAEU" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Supported Modes</Label>
                                <div className="flex gap-2">
                                    {['Air', 'Sea', 'Road', 'Rail'].map(mode => (
                                        <Button 
                                            key={mode}
                                            type="button"
                                            variant={editingCarrier.modes?.includes(mode) ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => toggleMode(mode)}
                                            className={editingCarrier.modes?.includes(mode) ? 'bg-indigo-600' : ''}
                                        >
                                            {mode}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>SLA Tier</Label>
                                    <Select value={editingCarrier.sla_tier} onValueChange={v => setEditingCarrier({...editingCarrier, sla_tier: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Strategic">Strategic</SelectItem>
                                            <SelectItem value="Preferred">Preferred</SelectItem>
                                            <SelectItem value="Standard">Standard</SelectItem>
                                            <SelectItem value="Probation">Probation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <div className="flex items-center h-10">
                                        <Checkbox 
                                            id="active" 
                                            checked={editingCarrier.active} 
                                            onCheckedChange={c => setEditingCarrier({...editingCarrier, active: c})}
                                        />
                                        <label htmlFor="active" className="ml-2 text-sm font-medium">Active Partner</label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Name</Label>
                                    <Input value={editingCarrier.contact_name} onChange={e => setEditingCarrier({...editingCarrier, contact_name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={editingCarrier.contact_email} onChange={e => setEditingCarrier({...editingCarrier, contact_email: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input value={editingCarrier.website} onChange={e => setEditingCarrier({...editingCarrier, website: e.target.value})} placeholder="https://" />
                            </div>

                            <div className="space-y-2">
                                <Label>Tracking URL Template</Label>
                                <Input 
                                    value={editingCarrier.tracking_url_template} 
                                    onChange={e => setEditingCarrier({...editingCarrier, tracking_url_template: e.target.value})} 
                                    placeholder="https://track.carrier.com?tracking={tracking_number}" 
                                />
                                <p className="text-xs text-slate-400">Use {'{tracking_number}'} as placeholder</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Sustainability Rating</Label>
                                    <Select value={editingCarrier.sustainability_rating} onValueChange={v => setEditingCarrier({...editingCarrier, sustainability_rating: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Excellent">Excellent</SelectItem>
                                            <SelectItem value="Good">Good</SelectItem>
                                            <SelectItem value="Fair">Fair</SelectItem>
                                            <SelectItem value="Poor">Poor</SelectItem>
                                            <SelectItem value="Not Rated">Not Rated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Carbon Neutral Program</Label>
                                    <div className="flex items-center h-10">
                                        <Checkbox 
                                            id="carbon" 
                                            checked={editingCarrier.carbon_neutral_program} 
                                            onCheckedChange={c => setEditingCarrier({...editingCarrier, carbon_neutral_program: c})}
                                        />
                                        <label htmlFor="carbon" className="ml-2 text-sm font-medium">Offers Carbon Neutral</label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Certifications (comma separated)</Label>
                                <Input 
                                    value={editingCarrier.certifications?.join(', ') || ''} 
                                    onChange={e => setEditingCarrier({...editingCarrier, certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} 
                                    placeholder="ISO 14001, SmartWay, LEED" 
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => saveMutation.mutate(editingCarrier)} disabled={saveMutation.isPending}>Save Carrier</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}