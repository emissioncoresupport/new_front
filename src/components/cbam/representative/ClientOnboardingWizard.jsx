import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Upload, FileText, Building, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

const STEPS = [
    { id: 'basic_info', title: 'Company Details', icon: Building },
    { id: 'documentation', title: 'Power of Attorney', icon: FileText },
    { id: 'assessment', title: 'Readiness Check', icon: ShieldCheck },
];

export default function ClientOnboardingWizard({ open, onOpenChange, onComplete }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        eori_number: '',
        declarant_id: '',
        country: '',
        contact_person: '',
        contact_email: '',
        sector: 'Iron & Steel',
        poa_file: null,
        poa_status: 'missing',
        readiness_answers: {
            has_access_to_installations: false,
            knows_emission_factors: false,
            has_prior_reports: false
        }
    });
    const [isUploading, setIsUploading] = useState(false);
    const queryClient = useQueryClient();

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const res = await base44.integrations.Core.UploadFile({ file });
            setFormData(prev => ({
                ...prev,
                poa_file: res.file_url,
                poa_status: 'pending_review'
            }));
            toast.success("Power of Attorney uploaded");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const createClientMutation = useMutation({
        mutationFn: async () => {
            // Calculate initial readiness score based on answers
            let score = 20; // Base score
            if (formData.poa_file) score += 30;
            if (formData.readiness_answers.has_access_to_installations) score += 20;
            if (formData.readiness_answers.knows_emission_factors) score += 20;
            if (formData.readiness_answers.has_prior_reports) score += 10;

            return base44.entities.CBAMClient.create({
                name: formData.name,
                eori_number: formData.eori_number,
                declarant_id: formData.declarant_id || `CBAM-${formData.eori_number.substring(0,8)}`,
                country: formData.country,
                contact_person: formData.contact_person,
                contact_email: formData.contact_email,
                sector: formData.sector,
                power_of_attorney_url: formData.poa_file,
                poa_status: formData.poa_file ? 'pending_review' : 'missing',
                poa_uploaded_at: formData.poa_file ? new Date().toISOString() : null,
                status: 'active',
                onboarding_step: 'complete',
                readiness_score: score
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cbam-clients'] });
            toast.success("Client onboarded successfully");
            onOpenChange(false);
            if (onComplete) onComplete();
            // Reset form
            setCurrentStep(0);
            setFormData({
                name: '',
                eori_number: '',
                declarant_id: '',
                country: '',
                contact_person: '',
                contact_email: '',
                sector: 'Iron & Steel',
                poa_file: null,
                poa_status: 'missing',
                readiness_answers: {
                    has_access_to_installations: false,
                    knows_emission_factors: false,
                    has_prior_reports: false
                }
            });
        }
    });

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            createClientMutation.mutate();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>New Client Onboarding</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {/* Progress Indicator */}
                    <div className="mb-8">
                        <div className="flex justify-between mb-2">
                            {STEPS.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <div key={step.id} className={`flex flex-col items-center ${index <= currentStep ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 border-2 ${index <= currentStep ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-medium">{step.title}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <Progress value={((currentStep + 1) / STEPS.length) * 100} className="h-2" />
                    </div>

                    {/* Step Content */}
                    <div className="min-h-[300px]">
                        {currentStep === 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Company Name</Label>
                                        <Input value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g. Acme Steel Ltd." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Country</Label>
                                        <Select value={formData.country} onValueChange={(v) => handleInputChange('country', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Germany">Germany</SelectItem>
                                                <SelectItem value="France">France</SelectItem>
                                                <SelectItem value="Italy">Italy</SelectItem>
                                                <SelectItem value="Spain">Spain</SelectItem>
                                                <SelectItem value="Netherlands">Netherlands</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>EORI Number</Label>
                                        <Input value={formData.eori_number} onChange={(e) => handleInputChange('eori_number', e.target.value)} placeholder="EU..." />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Primary Sector</Label>
                                        <Select value={formData.sector} onValueChange={(v) => handleInputChange('sector', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Iron & Steel">Iron & Steel</SelectItem>
                                                <SelectItem value="Aluminium">Aluminium</SelectItem>
                                                <SelectItem value="Cement">Cement</SelectItem>
                                                <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                                                <SelectItem value="Electricity">Electricity</SelectItem>
                                                <SelectItem value="Mixed">Mixed / Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Contact Person</Label>
                                        <Input value={formData.contact_person} onChange={(e) => handleInputChange('contact_person', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input type="email" value={formData.contact_email} onChange={(e) => handleInputChange('contact_email', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5" />
                                        Representation Mandate
                                    </h4>
                                    <p className="text-sm text-blue-700">
                                        To act as an Indirect Customs Representative for CBAM purposes, a valid Power of Attorney (PoA) is required.
                                    </p>
                                </div>

                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                                    {formData.poa_file ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                                <CheckCircle2 className="w-8 h-8" />
                                            </div>
                                            <p className="font-medium text-slate-900">Document Uploaded</p>
                                            <p className="text-sm text-slate-500 mb-4">Ready for verification</p>
                                            <Button variant="outline" onClick={() => setFormData(prev => ({ ...prev, poa_file: null, poa_status: 'missing' }))}>
                                                Replace Document
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                                {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                            </div>
                                            <h4 className="font-medium text-slate-900">Upload Signed PoA</h4>
                                            <p className="text-sm text-slate-500 mt-1">PDF or JPG, max 10MB</p>
                                            <Button variant="secondary" className="mt-4" disabled={isUploading}>
                                                {isUploading ? 'Uploading...' : 'Select File'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-center">
                                    <Button variant="link" className="text-slate-500 text-xs" onClick={nextStep}>
                                        Skip for now (Status will be 'Pending')
                                    </Button>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div>
                                    <h3 className="font-bold text-lg mb-2">Initial Readiness Assessment</h3>
                                    <p className="text-slate-500 text-sm">Help us estimate the client's starting point.</p>
                                </div>

                                <div className="space-y-4">
                                    <Card className={`cursor-pointer transition-all border-2 ${formData.readiness_answers.has_access_to_installations ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, readiness_answers: { ...prev.readiness_answers, has_access_to_installations: !prev.readiness_answers.has_access_to_installations } }))}
                                    >
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${formData.readiness_answers.has_access_to_installations ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                {formData.readiness_answers.has_access_to_installations && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">Direct Access to Installations</p>
                                                <p className="text-sm text-slate-500">Client has direct contact with production sites outside EU.</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className={`cursor-pointer transition-all border-2 ${formData.readiness_answers.knows_emission_factors ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                        onClick={() => setFormData(prev => ({ ...prev, readiness_answers: { ...prev.readiness_answers, knows_emission_factors: !prev.readiness_answers.knows_emission_factors } }))}
                                    >
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${formData.readiness_answers.knows_emission_factors ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                {formData.readiness_answers.knows_emission_factors && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">Emission Factors Available</p>
                                                <p className="text-sm text-slate-500">Installations have already calculated specific embedded emissions.</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0}>
                        Back
                    </Button>
                    <Button 
                        onClick={nextStep} 
                        className="bg-[#86b027] hover:bg-[#769c22] text-white"
                        disabled={createClientMutation.isPending}
                    >
                        {createClientMutation.isPending ? 'Processing...' : currentStep === STEPS.length - 1 ? 'Complete Onboarding' : 'Next Step'}
                        {!createClientMutation.isPending && currentStep < STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}