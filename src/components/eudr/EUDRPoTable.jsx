import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Lock, FileText, ArrowRight } from "lucide-react";

export default function EUDRPoTable({ ddsList, suppliers, onNavigate }) {
    
    const getSupplierName = (id) => {
        const supplier = suppliers.find(s => s.id === id);
        return supplier ? supplier.legal_name : 'Unknown Supplier';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-[#545454]">Purchase Orders & Compliance Overview</h3>
                    <p className="text-sm text-slate-500 mt-1">Track status, risk, and DDS submission for all orders.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate('importer')}>
                    View All
                </Button>
            </div>
            
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow>
                        <TableHead className="font-semibold text-slate-600">PO Number</TableHead>
                        <TableHead className="font-semibold text-slate-600">Supplier</TableHead>
                        <TableHead className="font-semibold text-slate-600">Commodity</TableHead>
                        <TableHead className="font-semibold text-slate-600">Amount</TableHead>
                        <TableHead className="font-semibold text-slate-600">DDS Status</TableHead>
                        <TableHead className="font-semibold text-slate-600">Risk Level</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ddsList.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                                <div className="flex flex-col items-center gap-3">
                                    <FileText className="w-10 h-10 opacity-20" />
                                    <p>No Purchase Orders yet – click 'New DDS Declaration' to start your first DDS.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        ddsList.map((dds) => (
                            <TableRow key={dds.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-medium text-[#545454]">
                                    {dds.po_number || 'N/A'}
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{dds.dds_reference}</div>
                                </TableCell>
                                <TableCell>
                                    {getSupplierName(dds.supplier_submission_id)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm">{dds.commodity_description || 'Unknown'}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{dds.hs_code}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {dds.quantity ? `${dds.quantity} ${dds.unit}` : '-'}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {dds.status === 'Locked' || dds.status === 'Submitted' ? (
                                            <Badge className="bg-[#86b027]/10 text-[#86b027] border-[#86b027]/20 hover:bg-[#86b027]/20">
                                                <Lock className="w-3 h-3 mr-1" /> {dds.status}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-slate-500">
                                                {dds.status}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {dds.risk_level === 'High' ? (
                                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> High
                                            </Badge>
                                        ) : dds.risk_level === 'Low' ? (
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Low
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                Standard
                                            </Badge>
                                        )}
                                        {dds.risk_score > 0 && (
                                            <span className="text-xs font-mono text-slate-400">({dds.risk_score}%)</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => onNavigate('audit')}
                                        className="text-[#02a1e8] hover:text-[#02a1e8] hover:bg-[#02a1e8]/10"
                                    >
                                        Details <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}