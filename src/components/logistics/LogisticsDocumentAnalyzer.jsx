import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle2, AlertTriangle, ScanLine, UploadCloud } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function LogisticsDocumentAnalyzer({ onAnalysisComplete }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAnalyzing(true);
        setProgress(10);

        try {
            // 1. Upload File
            toast.info("Uploading document...");
            const uploadRes = await base44.integrations.Core.UploadFile({ file });
            setProgress(40);

            // 2. Analyze with LLM
            toast.info("Analyzing with GLEC Verification Engine...");
            const prompt = `
                Analyze this logistics document (Invoice, BOL, or AWB).
                Extract shipment details and verify GLEC compliance.
                
                Extract:
                - Shipper & Consignee
                - Date
                - Total Weight (kg)
                - Origin & Destination (IATA/UNLOCODE if possible)
                - Transport Mode (Air, Sea, Road, Rail)
                
                Verify GLEC Factors:
                - Is the vehicle/mode clearly specified? (e.g. "Heavy Truck Euro 6" vs just "Truck")
                - Are distances plausible?
                
                Return JSON:
                {
                    "doc_type": "Invoice" | "AWB" | "BOL",
                    "confidence": number (0-100),
                    "data": {
                        "shipper": string,
                        "consignee": string,
                        "date": string (ISO),
                        "weight": number,
                        "origin": string,
                        "destination": string,
                        "mode": string
                    },
                    "glec_compliance": {
                        "is_compliant": boolean,
                        "missing_factors": [string],
                        "notes": string
                    }
                }
            `;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                file_urls: [uploadRes.file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        doc_type: { type: "string" },
                        confidence: { type: "number" },
                        data: {
                            type: "object",
                            properties: {
                                shipper: { type: "string" },
                                consignee: { type: "string" },
                                date: { type: "string" },
                                weight: { type: "number" },
                                origin: { type: "string" },
                                destination: { type: "string" },
                                mode: { type: "string" }
                            }
                        },
                        glec_compliance: {
                            type: "object",
                            properties: {
                                is_compliant: { type: "boolean" },
                                missing_factors: { type: "array", items: { type: "string" } },
                                notes: { type: "string" }
                            }
                        }
                    }
                }
            });

            setProgress(100);
            onAnalysisComplete(response);
            toast.success("Document analyzed successfully");

        } catch (error) {
            console.error("Analysis failed", error);
            toast.error("Failed to analyze document");
        } finally {
            setAnalyzing(false);
            setProgress(0);
        }
    };

    if (analyzing) {
        return (
            <div className="space-y-3 p-6 border rounded-lg bg-slate-50 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">AI Analysis in Progress</p>
                    <p className="text-xs text-slate-500">Extracting data & verifying GLEC factors...</p>
                </div>
                <Progress value={progress} className="h-2 w-full max-w-xs mx-auto" />
            </div>
        );
    }

    return (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-100 transition-colors relative group">
            <input 
                type="file" 
                accept=".pdf,.jpg,.png" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileUpload}
            />
            <div className="flex flex-col items-center">
                <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <ScanLine className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Upload Invoice or BOL</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    AI will auto-populate shipment details and verify GLEC compliance factors.
                </p>
                <Badge variant="outline" className="mt-3 bg-indigo-50 text-indigo-600 border-indigo-200">
                    <SparklesIcon className="w-3 h-3 mr-1" /> AI-Powered
                </Badge>
            </div>
        </div>
    );
}

function SparklesIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M9 5h4" />
            <path d="M6 17v4" />
            <path d="M8 19h4" />
        </svg>
    )
}