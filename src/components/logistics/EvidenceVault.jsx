import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Filter, Lock, Download, Eye, Shield, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function EvidenceVault() {
    const [searchTerm, setSearchTerm] = useState("");
    
    // Fetch real evidence documents from suppliers
    const { data: evidenceDocs = [] } = useQuery({
        queryKey: ['evidence-documents'],
        queryFn: () => base44.entities.EvidenceDocument.list('-created_date')
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list()
    });

    // Filter documents
    const filteredDocs = evidenceDocs.filter(doc => 
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSupplierName = (supplierId) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        return supplier?.legal_name || 'Unknown';
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'verified': return 'bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30';
            case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const stats = {
        total: evidenceDocs.length,
        verified: evidenceDocs.filter(d => d.verification_status === 'verified').length,
        pending: evidenceDocs.filter(d => d.verification_status === 'pending').length,
        highConfidential: evidenceDocs.filter(d => d.confidentiality_level === 'confidential' || d.confidentiality_level === 'highly_confidential').length
    };

    return (
        <div className="space-y-6">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white shadow-sm border border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Total Files</p>
                            <h3 className="text-2xl font-bold text-[#545454]">{stats.total}</h3>
                        </div>
                        <FileText className="w-8 h-8 text-slate-200" />
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm border border-[#86b027]/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Verified</p>
                            <h3 className="text-2xl font-bold text-[#86b027]">{stats.verified}</h3>
                        </div>
                        <Shield className="w-8 h-8 text-[#86b027]/20" />
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Pending Review</p>
                            <h3 className="text-2xl font-bold text-amber-500">{stats.pending}</h3>
                        </div>
                        <Lock className="w-8 h-8 text-amber-100" />
                    </CardContent>
                </Card>
                <Card className="bg-white shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-500 uppercase">High Confidentiality</p>
                            <h3 className="text-2xl font-bold text-rose-500">{stats.highConfidential}</h3>
                        </div>
                        <Lock className="w-8 h-8 text-rose-100" />
                    </CardContent>
                </Card>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-slate-200">
                <div className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search files, types, suppliers..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {filteredDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredDocs.map(doc => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 bg-slate-50 rounded border border-slate-100 group-hover:border-[#86b027]/30 group-hover:bg-[#86b027]/10 transition-colors">
                                        <FileText className="w-6 h-6 text-slate-400 group-hover:text-[#86b027] transition-colors" />
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] ${getStatusColor(doc.verification_status)}`}>
                                        {doc.verification_status || 'pending'}
                                    </Badge>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm truncate mb-1">{doc.file_name || 'Untitled Document'}</h4>
                                <div className="flex justify-between items-center text-xs text-slate-500 mb-4">
                                    <Badge variant="outline" className="text-[10px]">{doc.document_type || 'Other'}</Badge>
                                    <span>{doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="text-xs text-slate-600 truncate flex-1">{getSupplierName(doc.supplier_id)}</span>
                                    {doc.confidentiality_level && (
                                        <Badge variant="secondary" className="text-[10px] ml-2">
                                            {doc.confidentiality_level === 'highly_confidential' ? 'High' : 
                                             doc.confidentiality_level === 'confidential' ? 'Medium' : 'Low'}
                                        </Badge>
                                    )}
                                </div>
                                {doc.file_url && (
                                    <div className="mt-3">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="w-full border-[#86b027]/30 text-[#86b027] hover:bg-[#86b027]/10 hover:border-[#86b027]"
                                            onClick={() => window.open(doc.file_url, '_blank')}
                                        >
                                            <Download className="w-3 h-3 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="p-12 text-center">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Evidence Documents Yet</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Documents uploaded by suppliers will appear here
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}