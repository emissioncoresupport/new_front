import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

export default function PFASBatchScanner() {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resultSummary, setResultSummary] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResultSummary(null);
            setProgress(0);
        }
    };

    const uploadAndScanMutation = useMutation({
        mutationFn: async (fileToUpload) => {
            setIsProcessing(true);
            setProgress(10);

            // 1. Upload File
            const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
            setProgress(40);

            // 2. Extract Data (Simulating backend extraction process)
            // We use the ExtractData integration to parse the CSV/Excel
            const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    id: { type: "string" },
                                    type: { type: "string" },
                                    description: { type: "string" },
                                    cas_numbers: { type: "string" }
                                },
                                required: ["name"]
                            }
                        }
                    }
                }
            });

            setProgress(70);

            if (extraction.status === 'error' || !extraction.output?.items) {
                throw new Error("Failed to parse file");
            }

            const items = extraction.output.items;
            const results = {
                total: items.length,
                processed: 0,
                flagged: 0
            };

            // 3. Process items (Bulk create assessments)
            const assessments = items.map(item => ({
                entity_id: item.id || `BATCH-${Math.random().toString(36).substr(2, 9)}`,
                entity_type: item.type || 'Component',
                name: item.name,
                status: 'Pending Analysis',
                last_checked: new Date().toISOString(),
                risk_score: 0,
                ai_analysis_notes: "Imported via Batch Scanner. Queued for deep analysis."
            }));

            // Bulk create (assuming API supports it, otherwise iterate)
            await Promise.all(assessments.map(a => base44.entities.PFASAssessment.create(a)));

            setProgress(100);
            return { total: items.length, success: true };
        },
        onSuccess: (data) => {
            toast.success(`Successfully queued ${data.total} items for analysis`);
            setResultSummary(data);
            queryClient.invalidateQueries(['pfas-assessments']);
            setIsProcessing(false);
        },
        onError: (error) => {
            toast.error("Batch processing failed: " + error.message);
            setIsProcessing(false);
        }
    });

    const handleProcess = () => {
        if (file) {
            uploadAndScanMutation.mutate(file);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <Card className="border-dashed border-2 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">Upload Data File</CardTitle>
                        <CardDescription>Support for CSV or Excel (.xlsx)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className={`
                                flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed transition-colors cursor-pointer
                                border-slate-200 hover:bg-slate-50
                            `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                                accept=".csv, .xlsx"
                            />
                            {file ? (
                                <div className="text-center p-4">
                                    <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                                    <p className="font-medium text-slate-900 mb-1">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="mt-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center p-4">
                                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-slate-700">Click to browse</p>
                                    <p className="text-xs text-slate-400 mt-1">Select a CSV or Excel file</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <Button 
                                className="w-full bg-indigo-600 hover:bg-indigo-700" 
                                disabled={!file || isProcessing}
                                onClick={handleProcess}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Start Batch Analysis
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions & Status */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Batch Instructions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-slate-600">
                            <p>Upload a file containing your bill of materials or supplier list. The system will automatically ingest and queue them for PFAS risk scanning.</p>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="font-medium mb-2 text-xs uppercase text-slate-500">Required Columns</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Name (Product/Material Name)</li>
                                    <li>ID (SKU or Reference)</li>
                                    <li>Type (Component, Supplier, etc.)</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {(isProcessing || resultSummary) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Process Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isProcessing ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Progress</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                        <p className="text-xs text-slate-400 text-center pt-2">Analyzing document structure and importing records...</p>
                                    </div>
                                ) : resultSummary ? (
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Import Complete</h4>
                                        <p className="text-slate-600 text-sm mt-1">
                                            Successfully imported {resultSummary.total} items.
                                        </p>
                                        <Button variant="link" className="mt-2 text-indigo-600" onClick={() => setFile(null)}>
                                            Process another file
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}