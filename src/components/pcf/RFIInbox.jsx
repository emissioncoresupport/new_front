import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink, MessageSquare, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { Link } from 'react-router-dom';

export default function RFIInbox() {
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewNote, setReviewNote] = useState("");

    const { data: requests = [] } = useQuery({
        queryKey: ['rfi-inbox'],
        queryFn: () => base44.entities.DataRequest.list('-updated_date')
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ status }) => {
            // Update Data Request
            await base44.entities.DataRequest.update(selectedRequest.id, {
                status: status,
                response_data: { ...selectedRequest.response_data, review_note: reviewNote, reviewed_at: new Date().toISOString() }
            });

            // If Verified, update related entity and feed Supply Lens (Supplier)
            if (status === 'Verified') {
                if (selectedRequest.related_entity_type === 'ProductComponent' && selectedRequest.related_entity_id) {
                    await base44.entities.ProductComponent.update(selectedRequest.related_entity_id, {
                        verification_status: 'Verified',
                        review_notes: `Verified via RFI ${selectedRequest.request_id}: ${reviewNote}`
                    });
                }
                
                if (selectedRequest.supplier_id) {
                    // Feed Supply Lens - Update Supplier Data Completeness or Last Due Diligence
                    await base44.entities.Supplier.update(selectedRequest.supplier_id, {
                        last_due_diligence: new Date().toISOString().split('T')[0],
                        data_completeness: 100 // Simplified: bump score
                    });
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['rfi-inbox']);
            queryClient.invalidateQueries(['product-components']); // Refresh BOM if needed
            toast.success(`Request ${variables.status}`);
            setSelectedRequest(null);
            setReviewNote("");
        }
    });

    const pendingReview = requests.filter(r => r.status === 'Submitted');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-800">Needs Review</p>
                                <h3 className="text-2xl font-bold text-blue-900">{pendingReview.length}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {/* Add more stats if needed */}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Supplier Responses</CardTitle>
                    <CardDescription>Manage incoming data and verifications from suppliers.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {requests.map(req => (
                            <div key={req.id} className="flex flex-col md:flex-row justify-between p-4 rounded-lg border border-slate-100 hover:border-slate-200 bg-white transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="bg-slate-50">{req.request_type}</Badge>
                                        <span className="text-xs text-slate-400">ID: {req.request_id}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800">{req.title}</h4>
                                    <p className="text-sm text-slate-600 line-clamp-1">{req.description}</p>
                                    {req.related_entity_id && (
                                        <div className="mt-1">
                                            <Link to={`/products?component=${req.related_entity_id}`} className="text-xs text-[#02a1e8] hover:underline flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3" />
                                                View {req.related_entity_type || 'Component'} Context
                                            </Link>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mt-1">
                                        {req.due_date && (
                                            <p className={`text-xs flex items-center gap-1 ${new Date(req.due_date) < new Date() && req.status === 'Pending' ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                <Clock className="w-3 h-3" />
                                                Due: {new Date(req.due_date).toLocaleDateString()}
                                            </p>
                                        )}
                                        {req.response_data?.submitted_at && (
                                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Responded: {new Date(req.response_data.submitted_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4 md:mt-0 pl-4 md:border-l border-slate-100">
                                    <div className="text-right">
                                        <Badge className={
                                            req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                            req.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                                            req.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-red-100 text-red-700'
                                        }>
                                            {req.status}
                                        </Badge>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                                        View Details
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {requests.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                                <p>No RFI history found.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Review Modal */}
            <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Review Supplier Response</DialogTitle>
                        <DialogDescription>{selectedRequest?.title}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        <div className="bg-slate-50 p-4 rounded-lg border text-sm space-y-2">
                            <p className="font-bold text-slate-700">Original Request:</p>
                            <p className="text-slate-600">{selectedRequest?.description}</p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <User className="w-4 h-4" /> Supplier Response
                            </h4>
                            <div className="bg-white border p-4 rounded-lg shadow-sm">
                                <p className="text-sm text-slate-700 mb-3">
                                    {selectedRequest?.response_data?.notes || "No additional notes provided."}
                                </p>
                                {selectedRequest?.evidence_files?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRequest.evidence_files.map((f, i) => (
                                            <a key={i} href={f.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md text-xs hover:bg-indigo-100 transition-colors">
                                                <FileText className="w-3 h-3" />
                                                {f.file_name}
                                                <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {(!selectedRequest?.evidence_files || selectedRequest.evidence_files.length === 0) && (
                                    <p className="text-xs text-slate-400 italic">No files attached.</p>
                                )}
                            </div>
                        </div>

                        {selectedRequest?.status === 'Submitted' && (
                            <div className="space-y-2">
                                <Label>Review Notes</Label>
                                <Textarea 
                                    placeholder="Add comments for the supplier (optional)..." 
                                    value={reviewNote}
                                    onChange={(e) => setReviewNote(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
                        {selectedRequest?.status === 'Submitted' && (
                            <>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => updateStatusMutation.mutate({ status: 'Rejected' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    <XCircle className="w-4 h-4 mr-2" /> Reject
                                </Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    onClick={() => updateStatusMutation.mutate({ status: 'Verified' })}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Verify
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}