import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, UploadCloud, CheckCircle2, Clock, AlertCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export default function PortalDataRequests({ supplier, scopes }) {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const queryClient = useQueryClient();

    const { data: requests = [] } = useQuery({
        queryKey: ['data-requests', supplier?.id],
        queryFn: async () => {
            if (!supplier?.id) return [];
            const all = await base44.entities.DataRequest.list('-created_date');
            return all.filter(r => r.supplier_id === supplier.id);
        },
        enabled: !!supplier?.id
    });

    // Calculate stats for Dashboard
    const stats = {
        pending: requests.filter(r => r.status === 'Pending').length,
        submitted: requests.filter(r => r.status === 'Submitted').length,
        verified: requests.filter(r => r.status === 'Verified').length
    };

    const submitMutation = useMutation({
        mutationFn: async () => {
            setIsSubmitting(true);
            try {
                let evidence = [];
                if (file) {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    evidence.push({ file_name: file.name, file_url });
                }

                await base44.entities.DataRequest.update(selectedRequest.id, {
                    status: 'Submitted',
                    response_data: { notes, submitted_at: new Date().toISOString() },
                    evidence_files: evidence
                });
            } finally {
                setIsSubmitting(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['data-requests']);
            setSelectedRequest(null);
            setFile(null);
            setNotes("");
            toast.success("Request response submitted successfully");
        },
        onError: () => toast.error("Submission failed")
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Dashboard Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-amber-50 border-amber-100">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-800">Pending Action</p>
                            <h3 className="text-2xl font-bold text-amber-900">{stats.pending}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Send className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-800">Submitted</p>
                            <h3 className="text-2xl font-bold text-blue-900">{stats.submitted}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-100">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-800">Verified</p>
                            <h3 className="text-2xl font-bold text-emerald-900">{stats.verified}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Requests List */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Requests</CardTitle>
                    <CardDescription>View and respond to pending information requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {requests.map(req => (
                            <div key={req.id} className="flex flex-col md:flex-row justify-between p-4 rounded-lg border border-slate-100 hover:border-slate-200 bg-white transition-all">
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-slate-50">{req.request_type}</Badge>
                                        <span className="text-sm text-slate-400">Due: {req.due_date || 'No Date'}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800">{req.title}</h4>
                                    <p className="text-sm text-slate-600">{req.description}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-4 md:mt-0">
                                    <div className="text-right">
                                        <Badge className={
                                            req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                            req.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }>
                                            {req.status}
                                        </Badge>
                                    </div>
                                    {req.status === 'Pending' && (
                                        <Button onClick={() => setSelectedRequest(req)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                            Respond
                                        </Button>
                                    )}
                                    {req.status !== 'Pending' && (
                                        <Button variant="outline" onClick={() => setSelectedRequest(req)}>View Details</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {requests.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                                <p>No active data requests found.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Response Modal */}
            <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Respond to Request</DialogTitle>
                        <CardDescription>{selectedRequest?.title}</CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 border">
                            {selectedRequest?.description}
                        </div>

                        {selectedRequest?.response_data?.review_note && (
                            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-100 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5" />
                                <div>
                                    <span className="font-bold">Buyer Feedback:</span>
                                    <p>{selectedRequest.response_data.review_note}</p>
                                </div>
                            </div>
                        )}
                        
                        {selectedRequest?.status === 'Pending' && (
                            <>
                        <div className="space-y-2">
                            <Label>Upload Document</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                                <input type="file" id="req-file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                                <label htmlFor="req-file" className="cursor-pointer flex flex-col items-center">
                                    {file ? (
                                        <div className="flex items-center gap-2 text-indigo-600">
                                            <FileText className="w-6 h-6" />
                                            <span className="font-medium">{file.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-8 h-8 text-slate-300 mb-2" />
                                            <span className="text-sm text-slate-500">Click to upload file</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea 
                                placeholder="Add any context or comments..." 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                            </>
                        )}

                        {selectedRequest?.status !== 'Pending' && selectedRequest?.response_data && (
                            <div className="space-y-2">
                                <Label>Your Response</Label>
                                <div className="p-3 border rounded-lg bg-slate-50 text-sm text-slate-600">
                                    {selectedRequest.response_data.notes || "No notes."}
                                    {selectedRequest.evidence_files?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200">
                                            <p className="text-xs font-bold mb-1">Attached Files:</p>
                                            {selectedRequest.evidence_files.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 text-indigo-600">
                                                    <FileText className="w-3 h-3" /> {f.file_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
                        {selectedRequest?.status === 'Pending' && (
                            <Button onClick={() => submitMutation.mutate()} disabled={isSubmitting || (!file && !notes)}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Response"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}