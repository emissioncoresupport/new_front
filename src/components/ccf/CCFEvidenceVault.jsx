import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Filter, Download, Eye, CheckCircle2, AlertCircle, UploadCloud, History, User, MessageSquare, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import CommentsSection from "@/components/collaboration/CommentsSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function CCFEvidenceVault() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [file, setFile] = useState(null);
    const [newDoc, setNewDoc] = useState({ type: 'Invoice', tags: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [historyTab, setHistoryTab] = useState("audit");

    const queryClient = useQueryClient();

    const analyzeDocMutation = useMutation({
        mutationFn: async (doc) => {
            setIsAnalyzing(true);
            try {
                // Simulate AI Analysis or use InvokeLLM if real file content accessible (url)
                // For demo, we use InvokeLLM with a prompt about the file name/metadata
                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analyze this document filename and metadata to categorize it for Carbon Accounting. 
                    Filename: ${doc.file_name}. 
                    Current Type: ${doc.document_type}.
                    Suggest a better Document Type from [Invoice, Utility Bill, Meter Reading, Contract, Certificate, Other] 
                    and generate 3 relevant tags.
                    Return JSON: { "suggested_type": "string", "tags": "comma_separated_string", "confidence": "number" }`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            suggested_type: { type: "string" },
                            tags: { type: "string" },
                            confidence: { type: "number" }
                        }
                    }
                });

                const result = typeof response === 'string' ? JSON.parse(response) : response;
                
                await base44.entities.EvidenceDocument.update(doc.id, {
                    document_type: result.suggested_type,
                    tags: result.tags,
                    ai_analysis_result: JSON.stringify(result)
                });

                await base44.entities.EvidenceAuditLog.create({
                    evidence_id: doc.id,
                    action: "Updated",
                    performed_by: "AI Agent",
                    timestamp: new Date().toISOString(),
                    details: `AI Auto-categorized as ${result.suggested_type} (Confidence: ${result.confidence}%)`
                });

                return result;
            } finally {
                setIsAnalyzing(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['evidence-documents']);
            toast.success("AI Analysis Complete");
        }
    });

    const { data: documents = [] } = useQuery({
        queryKey: ['evidence-documents'],
        queryFn: () => base44.entities.EvidenceDocument.list('-upload_date')
    });

    const { data: auditLogs = [] } = useQuery({
        queryKey: ['evidence-audit-logs', selectedDoc?.id],
        queryFn: async () => {
            if (!selectedDoc) return [];
            const logs = await base44.entities.EvidenceAuditLog.list('-timestamp');
            return logs.filter(l => l.evidence_id === selectedDoc.id);
        },
        enabled: !!selectedDoc
    });

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              doc.tags?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || doc.document_type === filterType;
        return matchesSearch && matchesType;
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error("No file selected");
            setIsUploading(true);
            try {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                const user = await base44.auth.me().catch(() => ({ email: 'unknown' })); // Safe auth check
                
                const doc = await base44.entities.EvidenceDocument.create({
                    file_name: file.name,
                    file_url: file_url,
                    upload_date: new Date().toISOString(),
                    uploaded_by: user.email,
                    document_type: newDoc.type,
                    tags: newDoc.tags,
                    status: 'Pending Review'
                });

                // Audit Log
                await base44.entities.EvidenceAuditLog.create({
                    evidence_id: doc.id,
                    action: "Created",
                    performed_by: user.email,
                    timestamp: new Date().toISOString(),
                    details: `Uploaded ${file.name}`
                });

            } finally {
                setIsUploading(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['evidence-documents']);
            setIsUploadOpen(false);
            setFile(null);
            toast.success("Document uploaded to Vault");
        },
        onError: () => toast.error("Upload failed")
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Evidence Vault</h2>
                    <p className="text-slate-500 text-sm">Centralized repository for all GHG verification documents.</p>
                </div>
                <Button onClick={() => setIsUploadOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <UploadCloud className="w-4 h-4 mr-2" /> Upload Evidence
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search by name or tag..." 
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Invoice">Invoice</SelectItem>
                                    <SelectItem value="Utility Bill">Utility Bill</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Certificate">Certificate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead>Uploaded</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocs.map(doc => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        {doc.file_name}
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{doc.document_type}</Badge></TableCell>
                                    <TableCell className="text-xs text-slate-500">{doc.tags}</TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {new Date(doc.upload_date).toLocaleDateString()}
                                        <div className="text-[10px] opacity-70">by {doc.uploaded_by}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            doc.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                                            doc.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                        }>{doc.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedDoc(doc); setIsHistoryOpen(true); setHistoryTab("comments"); }}>
                                                <MessageSquare className="w-4 h-4 text-slate-400" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedDoc(doc); setIsHistoryOpen(true); setHistoryTab("audit"); }}>
                                                <History className="w-4 h-4 text-slate-400" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => window.open(doc.file_url, '_blank')}>
                                                <Download className="w-4 h-4 text-slate-400" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => analyzeDocMutation.mutate(doc)} disabled={isAnalyzing} title="Analyze with AI">
                                                <Sparkles className={`w-4 h-4 ${doc.ai_analysis_result ? 'text-[#86b027]' : 'text-slate-400'}`} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredDocs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                        No documents found in vault.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Evidence</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Document Type</Label>
                            <Select value={newDoc.type} onValueChange={(v) => setNewDoc({...newDoc, type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Invoice">Invoice</SelectItem>
                                    <SelectItem value="Utility Bill">Utility Bill</SelectItem>
                                    <SelectItem value="Meter Reading">Meter Reading</SelectItem>
                                    <SelectItem value="Contract">Contract</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tags (Comma separated)</Label>
                            <Input 
                                placeholder="e.g. Scope 2, HQ, Jan 2025" 
                                value={newDoc.tags}
                                onChange={(e) => setNewDoc({...newDoc, tags: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>File</Label>
                            <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                        <Button onClick={() => uploadMutation.mutate()} disabled={!file || isUploading}>
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* History & Comments Modal */}
            <Dialog open={isHistoryOpen} onOpenChange={(o) => !o && setIsHistoryOpen(false)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Document Details</DialogTitle>
                        <div className="text-sm text-slate-500">{selectedDoc?.file_name}</div>
                    </DialogHeader>
                    
                    <Tabs value={historyTab} onValueChange={setHistoryTab}>
                        <TabsList className="w-full">
                            <TabsTrigger value="audit" className="flex-1">Audit Trail</TabsTrigger>
                            <TabsTrigger value="comments" className="flex-1">Discussion</TabsTrigger>
                        </TabsList>

                        <TabsContent value="audit" className="py-4">
                            <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 max-h-[400px] overflow-y-auto">
                                {auditLogs.map((log, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[29px] top-0 w-3 h-3 rounded-full bg-slate-200 border-2 border-white ring-1 ring-slate-100"></div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{log.action}</p>
                                                <p className="text-xs text-slate-500">{log.details}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                                                <div className="text-xs font-medium text-[#86b027] flex items-center justify-end gap-1">
                                                    <User className="w-3 h-3" /> {log.performed_by}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {auditLogs.length === 0 && <p className="text-sm text-slate-400">No history recorded.</p>}
                            </div>
                        </TabsContent>

                        <TabsContent value="comments">
                            {selectedDoc && (
                                <CommentsSection 
                                    entityId={selectedDoc.id} 
                                    entityType="EvidenceDocument" 
                                    currentUserEmail="user@example.com" // Mock user
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}