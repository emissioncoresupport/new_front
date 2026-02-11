import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Mail, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EUDRBulkOnboardingModal({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const processFile = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
        // 1. Upload File
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        setIsUploading(false);
        setIsProcessing(true);

        // 2. Extract Data
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: file_url,
            json_schema: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        legal_name: { type: "string" },
                        trade_name: { type: "string" },
                        email: { type: "string" },
                        country: { type: "string" },
                        vat_number: { type: "string" },
                        site_name: { type: "string" },
                        site_address: { type: "string" },
                        site_city: { type: "string" }
                    },
                    required: ["legal_name", "email"]
                }
            }
        });

        if (extractResult.status !== 'success' || !extractResult.output) {
            throw new Error(extractResult.details || "Failed to parse CSV data");
        }

        const records = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
        let successCount = 0;
        let inviteCount = 0;

        // 3. Process Records
        for (const record of records) {
            if (!record.legal_name || !record.email) continue;

            // Create Supplier
            const supplier = await base44.entities.Supplier.create({
                legal_name: record.legal_name,
                trade_name: record.trade_name || record.legal_name,
                country: record.country || "Unknown",
                vat_number: record.vat_number,
                status: 'active',
                source: 'file_upload',
                risk_score: 50 // Default starting score
            });
            successCount++;

            // Create Site if provided
            if (record.site_name) {
                await base44.entities.SupplierSite.create({
                    supplier_id: supplier.id,
                    site_name: record.site_name,
                    address: record.site_address,
                    city: record.site_city,
                    country: record.country || "Unknown",
                    status: 'active'
                });
            }

            // Generate Token & Invite
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

            await base44.entities.SupplierInviteToken.create({
                token: token,
                supplier_id: supplier.id,
                email: record.email,
                expires_at: expiresAt,
                status: 'active',
                access_scope: ['portal_access']
            });

            // Send Email
            const portalLink = `${window.location.origin}/SupplierPortal?token=${token}`;
            await base44.integrations.Core.SendEmail({
                to: record.email,
                subject: `EUDR Compliance Portal Invitation - ${record.legal_name}`,
                body: `
Dear Partner,

You are invited to join our EUDR Compliance Portal.
Please complete your due diligence information and upload required geolocation data.

Access your secure portal here:
${portalLink}

Best regards,
Compliance Team
                `
            });
            inviteCount++;
        }

        setResult({ success: true, count: successCount, invites: inviteCount });
        toast.success(`Processed ${successCount} suppliers and sent ${inviteCount} invites`);

    } catch (error) {
        console.error(error);
        setResult({ success: false, error: error.message });
        toast.error("Bulk onboarding failed");
    } finally {
        setIsUploading(false);
        setIsProcessing(false);
    }
  };

  const reset = () => {
      setFile(null);
      setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Supplier Onboarding</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create supplier accounts and automatically send email invitations with portal access links.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
            {!result ? (
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative">
                        <input 
                            type="file" 
                            accept=".csv,.xlsx"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                            disabled={isUploading || isProcessing}
                        />
                        {file ? (
                            <div className="flex flex-col items-center gap-2">
                                <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                                <p className="font-medium text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-10 h-10 text-slate-400" />
                                <p className="font-medium text-slate-700">Click to upload CSV</p>
                                <p className="text-xs text-slate-500">Required columns: legal_name, email, country</p>
                            </div>
                        )}
                    </div>

                    {file && (
                        <Button 
                            className="w-full bg-[#86b027] hover:bg-[#769c22] text-white"
                            onClick={processFile}
                            disabled={isUploading || isProcessing}
                        >
                            {isUploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
                            ) : isProcessing ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing & Inviting...</>
                            ) : (
                                <><Mail className="w-4 h-4 mr-2" /> Start Onboarding</>
                            )}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="text-center py-4 space-y-4">
                    {result.success ? (
                        <>
                            <div className="w-16 h-16 bg-[#86b027]/10 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-[#86b027]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Onboarding Complete</h3>
                                <p className="text-slate-600 mt-1">
                                    Successfully created <strong>{result.count}</strong> suppliers and sent <strong>{result.invites}</strong> email invitations.
                                </p>
                            </div>
                            <Button onClick={() => onOpenChange(false)} className="mt-2">Close</Button>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="w-8 h-8 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Import Failed</h3>
                                <p className="text-rose-600 mt-1 text-sm">{result.error}</p>
                            </div>
                            <Button variant="outline" onClick={reset} className="mt-2">Try Again</Button>
                        </>
                    )}
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}