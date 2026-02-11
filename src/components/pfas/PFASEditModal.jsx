import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Edit2, UploadCloud, FileText, Trash2, History, CheckCircle, AlertTriangle, ShieldAlert, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PFASEditModal({ assessment, open, onOpenChange }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("details");
    const [formData, setFormData] = useState({
        status: assessment?.status || 'Pending Analysis',
        risk_score: assessment?.risk_score || 0,
        ai_analysis_notes: assessment?.ai_analysis_notes || '',
    });
    const [file, setFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Reset form when assessment changes
    React.useEffect(() => {
        if (assessment) {
            setFormData({
                status: assessment.status,
                risk_score: assessment.risk_score,
                ai_analysis_notes: assessment.ai_analysis_notes,
            });
        }
    }, [assessment]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            setIsSaving(true);
            try {
                // Upload file if present
                let newEvidence = assessment.evidence_files || [];
                if (file) {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    newEvidence.push({ file_name: file.name, file_url });
                }

                // Add Audit Log
                const newLog = {
                    action: "Updated Assessment",
                    timestamp: new Date().toISOString(),
                    user: "Current User", // In real app use base44.auth.user.email
                    details: `Status changed to ${formData.status}, Risk Score: ${formData.risk_score}`
                };
                const updatedLogs = [...(assessment.audit_log || []), newLog];

                await base44.entities.PFASAssessment.update(assessment.id, {
                    ...formData,
                    evidence_files: newEvidence,
                    audit_log: updatedLogs
                });
            } finally {
                setIsSaving(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pfas-assessments']);
            toast.success("Assessment updated successfully");
            setFile(null);
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to update assessment")
    });

    if (!assessment) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-indigo-600" />
                        <DialogTitle>Edit Assessment: {assessment.name}</DialogTitle>
                    </div>
                    <DialogDescription>
                        Manage compliance status, upload evidence, and view audit trail.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="details">Details & Status</TabsTrigger>
                        <TabsTrigger value="evidence">Evidence Vault</TabsTrigger>
                        <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Compliance Status</Label>
                                <Select 
                                    value={formData.status} 
                                    onValueChange={(val) => setFormData({...formData, status: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Compliant">Compliant</SelectItem>
                                        <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
                                        <SelectItem value="Suspected">Suspected</SelectItem>
                                        <SelectItem value="Pending Analysis">Pending Analysis</SelectItem>
                                        <SelectItem value="Not Relevant">Not Relevant</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Risk Score (0-100)</Label>
                                <Input 
                                    type="number" 
                                    min="0" 
                                    max="100"
                                    value={formData.risk_score}
                                    onChange={(e) => setFormData({...formData, risk_score: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Analysis Notes</Label>
                            <Textarea 
                                className="min-h-[150px]"
                                value={formData.ai_analysis_notes}
                                onChange={(e) => setFormData({...formData, ai_analysis_notes: e.target.value})}
                            />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                             <h4 className="font-bold text-sm text-slate-700 mb-2">Detected Substances (Read Only)</h4>
                             {assessment.detected_substances?.length > 0 ? (
                                <div className="space-y-2">
                                    {assessment.detected_substances.map((sub, idx) => (
                                        <div key={idx} className="flex justify-between text-xs p-2 bg-white border rounded">
                                            <span>{sub.name} ({sub.cas_number})</span>
                                            {sub.is_restricted && <Badge variant="destructive" className="h-5">Restricted</Badge>}
                                        </div>
                                    ))}
                                </div>
                             ) : (
                                <p className="text-xs text-slate-500">No substances detected or manual entry.</p>
                             )}
                        </div>
                    </TabsContent>

                    <TabsContent value="evidence" className="space-y-4 py-4">
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
                            <input 
                                type="file" 
                                id="evidence-upload" 
                                className="hidden" 
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <label htmlFor="evidence-upload" className="cursor-pointer flex flex-col items-center">
                                <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                                <span className="text-sm font-medium text-slate-700">
                                    {file ? file.name : "Click to upload Supplier Declaration / Lab Report"}
                                </span>
                                <span className="text-xs text-slate-400 mt-1">PDF, PNG, JPG supported</span>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-sm text-slate-700">Uploaded Evidence</h4>
                            {assessment.evidence_files?.length > 0 || file ? (
                                <div className="space-y-2">
                                    {assessment.evidence_files?.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                <a href={f.file_url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                                                    {f.file_name}
                                                </a>
                                            </div>
                                            <Badge variant="outline">Stored</Badge>
                                        </div>
                                    ))}
                                    {file && (
                                        <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-indigo-400" />
                                                <span className="text-sm text-indigo-700">{file.name} (Pending Save)</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No evidence documents uploaded yet.</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4 py-4">
                        <div className="space-y-4">
                            {assessment.audit_log?.length > 0 ? (
                                assessment.audit_log.slice().reverse().map((log, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2" />
                                            {i !== assessment.audit_log.length - 1 && <div className="w-px h-full bg-slate-200 my-1" />}
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-sm font-bold text-slate-800">{log.action}</p>
                                            <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()} • {log.user}</p>
                                            {log.details && <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded">{log.details}</p>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No audit history recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={() => updateMutation.mutate()} 
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}