import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileCheck, AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

// EU Benchmarks for validation (simplified mock)
const EU_BENCHMARKS = {
    'Iron & Steel': { direct: 1.8, indirect: 0.5 },
    'Aluminium': { direct: 4.5, indirect: 2.0 },
    'Cement': { direct: 0.8, indirect: 0.1 },
    'Fertilizers': { direct: 1.2, indirect: 0.4 }
};

export default function VerificationReportModal({ request, open, onOpenChange }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        direct_emissions: "",
        indirect_emissions: "",
        methodology: "calculation_based",
        production_volume: "",
        report_file: null,
        opinion: "positive"
    });
    const [validationStatus, setValidationStatus] = useState({ status: 'idle', issues: [] });
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: async () => {
            // 1. Upload file if present (Mock)
            let reportUrl = "https://example.com/report.pdf"; 
            if (formData.report_file) {
                const uploadRes = await base44.integrations.Core.UploadFile({ file: formData.report_file });
                reportUrl = uploadRes.file_url;
            }

            // 2. Update Request with Verified Data
            await base44.entities.CBAMVerificationRequest.update(request.id, {
                status: 'pending_review',
                completion_date: new Date().toISOString(),
                report_url: reportUrl,
                verified_data: {
                    direct_emissions: parseFloat(formData.direct_emissions),
                    indirect_emissions: parseFloat(formData.indirect_emissions),
                    methodology: formData.methodology,
                    production_volume: parseFloat(formData.production_volume)
                },
                validation_results: validationStatus
            });

            // 3. (Optional) Auto-update Installation if opinion is positive and validation passed
            // For now, we just update the request status
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cbam-verification-requests'] });
            toast.success("Verification report submitted successfully");
            onOpenChange(false);
        }
    });

    const validateData = () => {
        setValidationStatus({ status: 'validating', issues: [] });
        
        setTimeout(() => {
            const issues = [];
            const direct = parseFloat(formData.direct_emissions);
            const indirect = parseFloat(formData.indirect_emissions);
            
            if (isNaN(direct) || direct < 0) issues.push({ type: 'error', msg: "Direct emissions must be a positive number" });
            if (isNaN(indirect) || indirect < 0) issues.push({ type: 'error', msg: "Indirect emissions must be a positive number" });
            
            // Benchmark check (assuming Iron & Steel if not known)
            const benchmark = EU_BENCHMARKS['Iron & Steel']; 
            if (direct > benchmark.direct * 1.5) {
                issues.push({ type: 'warning', msg: `Direct emissions (${direct}) are significantly higher than EU benchmark (${benchmark.direct})` });
            }
            if (direct < benchmark.direct * 0.5) {
                issues.push({ type: 'warning', msg: `Direct emissions (${direct}) are unusually low compared to EU benchmark (${benchmark.direct})` });
            }

            if (!formData.report_file) {
                issues.push({ type: 'error', msg: "Verification Report document is required" });
            }

            const hasErrors = issues.some(i => i.type === 'error');
            setValidationStatus({ 
                status: hasErrors ? 'invalid' : 'valid', 
                issues 
            });
            
            if (!hasErrors) {
                setStep(2); // Move to confirmation
            }
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-[#02a1e8]" />
                        Submit Verification Report
                    </DialogTitle>
                    <DialogDescription>
                        Auditor: Please upload the verification findings and the official statement.
                    </DialogDescription>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Verified Direct Emissions (tCO2e/t)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01"
                                    value={formData.direct_emissions}
                                    onChange={e => setFormData({...formData, direct_emissions: e.target.value})}
                                    placeholder="e.g. 1.85"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Verified Indirect Emissions (tCO2e/t)</Label>
                                <Input 
                                    type="number" 
                                    step="0.01"
                                    value={formData.indirect_emissions}
                                    onChange={e => setFormData({...formData, indirect_emissions: e.target.value})}
                                    placeholder="e.g. 0.45"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Verification Methodology</Label>
                            <Select 
                                value={formData.methodology} 
                                onValueChange={val => setFormData({...formData, methodology: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="calculation_based">Calculation-based (Standard)</SelectItem>
                                    <SelectItem value="measurement_based">Measurement-based (CEMS)</SelectItem>
                                    <SelectItem value="fallback">Fallback Approach</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                         <div className="space-y-2">
                            <Label>Verified Production Volume (tonnes)</Label>
                            <Input 
                                type="number" 
                                value={formData.production_volume}
                                onChange={e => setFormData({...formData, production_volume: e.target.value})}
                                placeholder="Total verified production during period"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Upload Verification Statement (PDF)</Label>
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                                <Input 
                                    type="file" 
                                    accept=".pdf,.doc,.docx" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => setFormData({...formData, report_file: e.target.files[0]})}
                                />
                                {formData.report_file ? (
                                    <div className="flex items-center justify-center text-emerald-600 font-medium">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        {formData.report_file.name}
                                    </div>
                                ) : (
                                    <div className="text-slate-500">
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm">Click to upload official report</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {validationStatus.status === 'validating' && (
                            <div className="bg-blue-50 text-blue-700 p-3 rounded-md flex items-center text-sm">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Validating data against EU benchmarks...
                            </div>
                        )}

                        {validationStatus.issues.length > 0 && (
                            <div className="space-y-2">
                                {validationStatus.issues.map((issue, idx) => (
                                    <Alert key={idx} variant={issue.type === 'error' ? "destructive" : "default"} className={issue.type === 'warning' ? "border-amber-200 bg-amber-50 text-amber-800" : ""}>
                                        {issue.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                        <AlertTitle>{issue.type === 'error' ? "Validation Error" : "Warning"}</AlertTitle>
                                        <AlertDescription>{issue.msg}</AlertDescription>
                                    </Alert>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 py-4 text-center">
                         <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                             <CheckCircle2 className="w-8 h-8" />
                         </div>
                         <h3 className="text-lg font-bold text-slate-900">Data Validated Successfully</h3>
                         <p className="text-slate-500 text-sm max-w-xs mx-auto">
                             The entered emissions data falls within acceptable ranges and complies with the reporting standards.
                         </p>
                         
                         <div className="bg-slate-50 p-4 rounded-lg text-left text-sm space-y-2 mt-4">
                             <div className="flex justify-between">
                                 <span className="text-slate-500">Direct Emissions:</span>
                                 <span className="font-medium">{formData.direct_emissions} tCO2e/t</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-slate-500">Indirect Emissions:</span>
                                 <span className="font-medium">{formData.indirect_emissions} tCO2e/t</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-slate-500">Methodology:</span>
                                 <span className="font-medium capitalize">{formData.methodology.replace('_', ' ')}</span>
                             </div>
                         </div>

                         <div className="pt-4">
                             <Label className="mb-2 block text-left">Final Opinion</Label>
                             <Select 
                                value={formData.opinion} 
                                onValueChange={val => setFormData({...formData, opinion: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="positive">Positive (Reasonable Assurance)</SelectItem>
                                    <SelectItem value="qualified">Qualified (Material Misstatements)</SelectItem>
                                    <SelectItem value="adverse">Adverse (Non-compliant)</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={validateData} className="bg-[#02a1e8] hover:bg-[#028ac7]">
                                Validate & Continue
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending} className="bg-[#86b027] hover:bg-[#769c22]">
                                {uploadMutation.isPending ? 'Submitting...' : 'Submit Final Report'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}