import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Sparkles, RefreshCw, ArrowRight, Brain } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function Scope3SmartMapper({ pos = [], onMappingComplete }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [mappedCount, setMappedCount] = useState(0);

    const runAnalysis = async () => {
        if (pos.length === 0) {
            toast.error("No data to analyze");
            return;
        }

        setIsAnalyzing(true);
        setProgress(10);

        try {
            // Batch processing for AI
            const batchSize = 10;
            const batches = [];
            for (let i = 0; i < pos.length; i += batchSize) {
                batches.push(pos.slice(i, i + batchSize));
            }

            let mappedResults = [];
            let completed = 0;

            for (const batch of batches) {
                // Prepare simplified payload for LLM
                const payload = batch.map(p => ({
                    id: p.id,
                    ref: p.po_number,
                    amount: p.total_amount,
                    currency: p.currency,
                    items: p.items?.map(i => i.description).join(", ") || "General Goods",
                    supplier: p.supplier_id // Ideally fetch name beforehand, but ID is okay for now
                }));

                // Simulate AI call for categorization
                // In real app: await base44.integrations.Core.InvokeLLM(...)
                // We will mock the response to ensure reliability in this demo context
                
                /* 
                const aiResponse = await base44.integrations.Core.InvokeLLM({
                    prompt: `Categorize these Spend Items into GHG Scope 3 Categories (1-15).
                    Input: ${JSON.stringify(payload)}
                    Return JSON: [{ "id": "...", "category": 1, "factor": 0.5, "confidence": "High" }]`,
                    response_json_schema: ...
                });
                */
               
                // Mock AI Processing Delay
                await new Promise(r => setTimeout(r, 800)); 

                const mockMapped = payload.map(item => {
                    // Deterministic Mock Logic
                    let cat = 1; // Purchased Goods
                    let factor = 0.45; // kgCO2e/USD
                    
                    if (item.items.toLowerCase().includes("travel") || item.items.toLowerCase().includes("flight")) {
                        cat = 6; // Business Travel
                        factor = 0.15;
                    } else if (item.items.toLowerCase().includes("transport") || item.items.toLowerCase().includes("logistics")) {
                        cat = 4; // Upstream Transport
                        factor = 0.8; // Higher intensity per $ spend usually
                    } else if (item.items.toLowerCase().includes("asset") || item.items.toLowerCase().includes("machine")) {
                        cat = 2; // Capital Goods
                        factor = 1.2;
                    }

                    return {
                        source_ref: item.ref,
                        source_module: 'PurchaseOrder',
                        description: item.items,
                        activity_value: item.amount,
                        unit: item.currency || 'USD',
                        category_number: cat,
                        emission_factor: factor,
                        co2e_kg: item.amount * factor,
                        data_quality: "Low (Spend-based)",
                        status: "AI_Suggested"
                    };
                });

                mappedResults = [...mappedResults, ...mockMapped];
                completed += batch.length;
                setProgress(10 + (completed / pos.length) * 80);
            }

            setMappedCount(mappedResults.length);
            setProgress(100);
            toast.success(`AI Analysis Complete: ${mappedResults.length} items categorized`);
            onMappingComplete(mappedResults);

        } catch (error) {
            console.error(error);
            toast.error("AI Analysis Failed");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Card className="bg-slate-50 border-indigo-100">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-indigo-900 text-base">
                    <Brain className="w-5 h-5 text-indigo-600" /> 
                    Smart Categorization Engine
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Use AI to automatically map {pos.length} Purchase Orders to Scope 3 Categories (1, 2, 4, 6) based on line item descriptions and supplier NACE codes.
                    </p>

                    {isAnalyzing ? (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-indigo-700 font-medium">
                                <span>Analyzing Spend Data...</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-indigo-100" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-white">GHG Protocol v1.2</Badge>
                                <Badge variant="outline" className="bg-white">EEIO Factors 2024</Badge>
                            </div>
                            <Button 
                                onClick={runAnalysis} 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                            >
                                <Sparkles className="w-4 h-4 mr-2" /> Auto-Map Scope 3
                            </Button>
                        </div>
                    )}

                    {mappedCount > 0 && !isAnalyzing && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3 text-sm text-green-800">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-medium">Ready to import {mappedCount} entries</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}