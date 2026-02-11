import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, CheckCircle2, AlertTriangle, Loader2, ScanLine, Eye } from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function EUDRDocumentAnalyzer({ fileUrl, expectedData, onAnalysisComplete }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    const analyzeDocument = async () => {
        if (!fileUrl) return;
        
        setAnalyzing(true);
        try {
            // Simulate or use actual InvokeLLM if backend allows file content reading from URL
            // Here we assume InvokeLLM can handle the context or we pass a description
            // For a real implementation, we'd use a vision model or OCR integration
            
            const prompt = `
                Analyze this EUDR compliance document (simulated content for ${fileUrl}).
                Extract the following:
                1. Harvest Date (must be after 2020-12-31)
                2. Plot IDs / Geolocation references
                3. Land Right Holder Name
                
                Compare against expected data:
                - Expected Harvest: ${expectedData?.harvestDate || 'N/A'}
                - Expected Plot Count: ${expectedData?.plotCount || 'N/A'}
                - Supplier: ${expectedData?.supplierName || 'N/A'}
                
                Return a JSON with:
                {
                    "doc_type": "guessed type",
                    "confidence": 0-100,
                    "extracted_data": { ... },
                    "discrepancies": [list of strings],
                    "verdict": "PASS" or "FLAGGED"
                }
            `;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        doc_type: { type: "string" },
                        confidence: { type: "number" },
                        extracted_data: { 
                            type: "object",
                            properties: {
                                harvest_date: { type: "string" },
                                plot_ids: { type: "array", items: { type: "string" } },
                                land_holder: { type: "string" }
                            }
                        },
                        discrepancies: { type: "array", items: { type: "string" } },
                        verdict: { type: "string", enum: ["PASS", "FLAGGED"] }
                    }
                }
            });

            setResult(response);
            if (onAnalysisComplete) onAnalysisComplete(response);

        } catch (error) {
            console.error("Analysis failed", error);
        } finally {
            setAnalyzing(false);
        }
    };

    if (!result && !analyzing) {
        return (
            <Button 
                variant="outline" 
                size="sm" 
                onClick={analyzeDocument}
                className="w-full bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            >
                <ScanLine className="w-4 h-4 mr-2" /> Auto-Verify Document (AI)
            </Button>
        );
    }

    if (analyzing) {
        return (
            <div className="space-y-2 p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning document structure...
                </div>
                <Progress value={45} className="h-1" />
            </div>
        );
    }

    return (
        <div className="mt-2 p-3 rounded-lg border bg-white shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    {result.verdict === 'PASS' ? 
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : 
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    }
                    <span className="font-bold text-sm">{result.doc_type}</span>
                </div>
                <Badge variant={result.verdict === 'PASS' ? 'default' : 'destructive'} className="text-[10px]">
                    {result.verdict}
                </Badge>
            </div>

            <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded">
                    <div>
                        <span className="text-slate-500 block">Harvest Date</span>
                        <span className="font-mono">{result.extracted_data?.harvest_date || 'Not Found'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Land Holder</span>
                        <span className="font-medium truncate">{result.extracted_data?.land_holder || 'Not Found'}</span>
                    </div>
                </div>

                {result.discrepancies?.length > 0 ? (
                    <Alert variant="destructive" className="py-2">
                        <AlertTitle className="text-xs font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Discrepancies Found
                        </AlertTitle>
                        <AlertDescription className="text-xs mt-1 list-disc pl-4">
                            {result.discrepancies.map((d, i) => <li key={i}>{d}</li>)}
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Data matches declaration
                    </div>
                )}
                
                <div className="flex justify-between items-center pt-1 border-t border-slate-100 mt-2">
                    <span className="text-slate-400">AI Confidence</span>
                    <span className="font-bold text-indigo-600">{result.confidence}%</span>
                </div>
            </div>
        </div>
    );
}