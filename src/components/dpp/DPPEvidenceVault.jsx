import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Download, Eye, CheckCircle2, AlertTriangle, Clock, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";

export default function DPPEvidenceVault({ dppId, productId }) {
    const [uploading, setUploading] = useState(false);
    const [evidenceType, setEvidenceType] = useState('material_composition');
    const [linkedField, setLinkedField] = useState('');
    const queryClient = useQueryClient();

    const { data: evidence = [] } = useQuery({
        queryKey: ['dpp-evidence', dppId],
        queryFn: async () => {
            const all = await base44.entities.DPPEvidence.list();
            return dppId ? all.filter(e => e.dpp_id === dppId) : all.filter(e => e.product_id === productId);
        }
    });

    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me()
    });

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            return base44.entities.DPPEvidence.create({
                dpp_id: dppId,
                product_id: productId,
                evidence_type: evidenceType,
                file_url,
                file_name: file.name,
                file_size_kb: Math.round(file.size / 1024),
                uploaded_by: user?.email,
                upload_date: new Date().toISOString(),
                linked_to_field: linkedField,
                verification_status: 'pending'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['dpp-evidence']);
            toast.success('Evidence document uploaded');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.DPPEvidence.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['dpp-evidence']);
            toast.success('Evidence deleted');
        }
    });

    const verifyMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.DPPEvidence.update(id, {
            verification_status: status,
            verified_by: user?.email,
            verification_date: new Date().toISOString()
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['dpp-evidence']);
            toast.success('Verification status updated');
        }
    });

    const handleUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        await uploadMutation.mutateAsync(file);
        setUploading(false);
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'verified': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
            case 'rejected': return <AlertTriangle className="w-4 h-4 text-rose-600" />;
            default: return <Clock className="w-4 h-4 text-amber-600" />;
        }
    };

    const getTypeColor = (type) => {
        switch(type) {
            case 'material_composition': return 'bg-blue-100 text-blue-700';
            case 'sustainability_report': return 'bg-emerald-100 text-emerald-700';
            case 'compliance_certificate': return 'bg-purple-100 text-purple-700';
            case 'test_report': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Upload Evidence Document
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Evidence Type</label>
                            <Select value={evidenceType} onValueChange={setEvidenceType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="material_composition">Material Composition</SelectItem>
                                    <SelectItem value="sustainability_report">Sustainability Report</SelectItem>
                                    <SelectItem value="compliance_certificate">Compliance Certificate</SelectItem>
                                    <SelectItem value="supplier_declaration">Supplier Declaration</SelectItem>
                                    <SelectItem value="test_report">Test Report</SelectItem>
                                    <SelectItem value="epd">EPD (Environmental Product Declaration)</SelectItem>
                                    <SelectItem value="lca_report">LCA Report</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Linked Field (Optional)</label>
                            <Input 
                                value={linkedField}
                                onChange={(e) => setLinkedField(e.target.value)}
                                placeholder="e.g., carbon_footprint, material_1"
                            />
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
                         onClick={() => document.getElementById('evidence-upload-input').click()}>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-medium">Click to upload or drag & drop</p>
                        <p className="text-xs text-slate-400">PDF, Excel, CSV, Images (Max 10MB)</p>
                    </div>
                    <input 
                        id="evidence-upload-input"
                        type="file"
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files[0])}
                        accept=".pdf,.xlsx,.csv,.jpg,.png"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Evidence Documents ({evidence.length})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {evidence.map(ev => (
                            <div key={ev.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                                <div className="flex items-start gap-3 flex-1">
                                    <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-slate-900">{ev.file_name}</h4>
                                            <Badge variant="outline" className={`text-xs ${getTypeColor(ev.evidence_type)}`}>
                                                {ev.evidence_type}
                                            </Badge>
                                            {getStatusIcon(ev.verification_status)}
                                        </div>
                                        <div className="text-xs text-slate-500 space-x-3">
                                            <span>{ev.file_size_kb} KB</span>
                                            <span>•</span>
                                            <span>Uploaded by {ev.uploaded_by}</span>
                                            <span>•</span>
                                            <span>{new Date(ev.upload_date).toLocaleString()}</span>
                                            {ev.linked_to_field && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-indigo-600">Linked: {ev.linked_to_field}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {ev.verification_status === 'pending' && (
                                        <>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                                                onClick={() => verifyMutation.mutate({ id: ev.id, status: 'verified' })}
                                            >
                                                Verify
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="text-rose-600 border-rose-600 hover:bg-rose-50"
                                                onClick={() => verifyMutation.mutate({ id: ev.id, status: 'rejected' })}
                                            >
                                                Reject
                                            </Button>
                                        </>
                                    )}
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        asChild
                                    >
                                        <a href={ev.file_url} target="_blank" rel="noreferrer">
                                            <Eye className="w-4 h-4" />
                                        </a>
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => deleteMutation.mutate(ev.id)}
                                        className="text-rose-500 hover:text-rose-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {evidence.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                                <p>No evidence documents uploaded yet</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}