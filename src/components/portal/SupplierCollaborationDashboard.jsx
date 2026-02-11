import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, UploadCloud, CheckCircle2, AlertCircle, Leaf, ShieldCheck, Clock, ArrowRight } from "lucide-react";

export default function SupplierCollaborationDashboard({ supplier }) {
    
    // Fetch Data Requests (RFIs)
    const { data: requests = [] } = useQuery({
        queryKey: ['portal-requests-dashboard', supplier?.id],
        queryFn: async () => {
            if (!supplier?.id) return [];
            const all = await base44.entities.DataRequest.list('-created_date');
            return all.filter(r => r.supplier_id === supplier.id);
        },
        enabled: !!supplier?.id
    });

    // Fetch PCF Data
    const { data: pcfList = [] } = useQuery({
        queryKey: ['portal-pcf-dashboard', supplier?.id],
        queryFn: async () => {
            if (!supplier?.id) return [];
            const all = await base44.entities.SupplierPCF.list();
            return all.filter(p => p.supplier_id === supplier.id);
        },
        enabled: !!supplier?.id
    });

    // Stats Calculation
    const pendingRFIs = requests.filter(r => r.status === 'Pending').length;
    const verifiedRFIs = requests.filter(r => r.status === 'Verified').length;
    const dueSoonRFIs = requests.filter(r => r.status === 'Pending' && r.due_date && new Date(r.due_date) < new Date(Date.now() + 7 * 86400000)).length;
    
    const totalImpact = pcfList.reduce((sum, p) => sum + (p.pcf_value_kgco2e || 0), 0);
    const verifiedProducts = pcfList.filter(p => p.assurance_level === 'Third-party Verified').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Supplier Collaboration Hub</h2>
                    <p className="text-sm text-slate-500">Manage data requests, track sustainability impact, and ensure compliance.</p>
                </div>
                <div className="flex gap-2">
                     <Button className="bg-[#02a1e8] text-white">
                        <UploadCloud className="w-4 h-4 mr-2" /> Upload Evidence
                     </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Pending Requests</p>
                                <h3 className="text-2xl font-bold text-slate-800 mt-1">{pendingRFIs}</h3>
                                {dueSoonRFIs > 0 && <p className="text-xs text-amber-600 font-medium mt-1">{dueSoonRFIs} due this week</p>}
                            </div>
                            <div className="p-2 bg-amber-50 rounded text-amber-500">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Verified Data</p>
                                <h3 className="text-2xl font-bold text-slate-800 mt-1">{verifiedRFIs}</h3>
                                <p className="text-xs text-emerald-600 font-medium mt-1">RFIs Approved</p>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded text-emerald-500">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Carbon Impact</p>
                                <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalImpact.toFixed(1)}</h3>
                                <p className="text-xs text-blue-600 font-medium mt-1">kg CO₂e Reported</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded text-blue-500">
                                <Leaf className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Assurance</p>
                                <h3 className="text-2xl font-bold text-slate-800 mt-1">{verifiedProducts}</h3>
                                <p className="text-xs text-purple-600 font-medium mt-1">Products Verified</p>
                            </div>
                            <div className="p-2 bg-purple-50 rounded text-purple-500">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent RFIs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Data Requests</CardTitle>
                    <CardDescription>Consolidated view of your pending and recent information requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Request Title</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Feedback</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.slice(0, 5).map(req => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {req.request_type === 'PCF Data' ? <Leaf className="w-3 h-3 text-green-500" /> : <FileText className="w-3 h-3 text-blue-500" />}
                                            {req.title}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={req.due_date && new Date(req.due_date) < new Date() ? "text-red-500 font-bold" : ""}>
                                            {req.due_date || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'Pending' ? 'outline' : req.status === 'Verified' ? 'default' : 'secondary'}
                                            className={req.status === 'Verified' ? 'bg-emerald-100 text-emerald-800 border-transparent' : req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}>
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {req.response_data?.review_note ? (
                                            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded max-w-[200px] truncate" title={req.response_data.review_note}>
                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                {req.response_data.review_note}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                            <ArrowRight className="w-4 h-4 text-slate-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {requests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-400">No requests found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Sustainability Breakdown (Simple) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Product Carbon Footprint Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pcfList.slice(0, 3).map(pcf => (
                                <div key={pcf.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-700">{pcf.product_name}</p>
                                        <p className="text-xs text-slate-500">{pcf.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800">{pcf.pcf_value_kgco2e} kgCO₂e</p>
                                        <Badge variant="outline" className="text-[10px] h-5">{pcf.assurance_level}</Badge>
                                    </div>
                                </div>
                            ))}
                            {pcfList.length === 0 && <p className="text-slate-500 text-center">No PCF data submitted.</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-[#02a1e8] hover:text-[#02a1e8]">
                            <UploadCloud className="w-6 h-6" />
                            <span>Submit PCF Data</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-[#02a1e8] hover:text-[#02a1e8]">
                            <FileText className="w-6 h-6" />
                            <span>Respond to RFI</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-[#02a1e8] hover:text-[#02a1e8]">
                            <Leaf className="w-6 h-6" />
                            <span>Update Energy</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 hover:border-[#02a1e8] hover:text-[#02a1e8]">
                            <AlertCircle className="w-6 h-6" />
                            <span>Report Issue</span>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}