import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CCFBulkImport({ open, onOpenChange, onImportComplete }) {
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState(null);
    const [scope, setScope] = useState("Scope 1");

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            setUploadedUrl(file_url);
            toast.success("File uploaded, ready to process");
        } catch (error) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleProcess = async () => {
        setIsUploading(true);
        try {
            // Use ExtractData integration for CSV/Excel
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url: uploadedUrl,
                json_schema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            reporting_year: { type: "number" },
                            category: { type: "string" },
                            activity_source: { type: "string" },
                            activity_value: { type: "number" },
                            unit: { type: "string" }
                        }
                    }
                }
            });

            if (result.status === 'success' && Array.isArray(result.output)) {
                let count = 0;
                for (const row of result.output) {
                    if (row.activity_value) {
                        await base44.entities.CCFEntry.create({
                            facility_id: "unknown", // Default or map later
                            reporting_year: row.reporting_year || new Date().getFullYear(),
                            scope: scope,
                            category: row.category || "Uncategorized",
                            activity_source: row.activity_source || "Bulk Import",
                            activity_value: row.activity_value,
                            unit: row.unit || "units",
                            status: "Draft",
                            co2e_kg: 0 // Needs calc
                        });
                        count++;
                    }
                }
                toast.success(`Successfully imported ${count} entries`);
                onImportComplete();
                onOpenChange(false);
            } else {
                toast.error("Extraction failed or empty");
            }
        } catch (error) {
            toast.error("Processing failed", { description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Import Activity Data</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Target Scope</Label>
                        <Select value={scope} onValueChange={setScope}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Scope 1">Scope 1</SelectItem>
                                <SelectItem value="Scope 2">Scope 2</SelectItem>
                                <SelectItem value="Scope 3">Scope 3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-2">
                        <Label>File (CSV/Excel)</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <input 
                                type="file" 
                                id="bulk-ccf" 
                                className="hidden" 
                                accept=".csv,.xlsx"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <label htmlFor="bulk-ccf" className="cursor-pointer block">
                                {file ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
                                        <span className="text-sm font-medium">{file.name}</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <UploadCloud className="w-8 h-8 text-slate-300 mb-2" />
                                        <span className="text-sm text-slate-500">Click to upload</span>
                                    </div>
                                )}
                            </label>
                        </div>
                    </div>

                    {file && !uploadedUrl && (
                        <Button onClick={handleUpload} disabled={isUploading}>
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload File"}
                        </Button>
                    )}

                    {uploadedUrl && (
                        <Button onClick={handleProcess} disabled={isUploading} className="bg-indigo-600 text-white">
                             {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Process & Import"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}