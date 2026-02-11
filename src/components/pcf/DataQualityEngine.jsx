import React, { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, AlertTriangle, CheckCircle, Database } from "lucide-react";
import { toast } from "sonner";

import { X } from "lucide-react";

export default function DataQualityEngine({ components, productId, onUpdateComponent, onClose }) {
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeMutation = useMutation({
        mutationFn: async () => {
            setIsAnalyzing(true);
            try {
                // Prepare BOM Summary for LLM
                const bomSummary = components.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.node_type,
                    material: c.material_type,
                    stage: c.lifecycle_stage,
                    emission_factor: c.emission_factor,
                    unit: c.unit
                }));

                const prompt = `Analyze this Bill of Materials for data quality issues and emission factor anomalies.
                
                BOM Data: ${JSON.stringify(bomSummary)}
                
                Tasks:
                1. Flag emission factors that seem significantly high or low for the material type (Anomalies).
                2. Identify missing critical data points (e.g. missing material type, zero emission factor).
                3. Suggest alternative datasets or generic factors if data is missing or anomalous.
                
                Return JSON format:
                {
                    "anomalies": [
                        { "component_id": "id", "issue": "High Factor", "description": "Factor 15.0 is high for Steel", "severity": "High", "suggestion": "Check if unit is correct" }
                    ],
                    "missing_data": [
                        { "component_id": "id", "field": "material_type", "suggestion": "Likely Plastic based on name" }
                    ],
                    "suggestions": [
                        { "component_id": "id", "type": "Dataset", "recommendation": "Use 'Steel, rolled' from Ecoinvent" }
                    ]
                }`;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            anomalies: { 
                                type: "array", 
                                items: { 
                                    type: "object", 
                                    properties: { 
                                        component_id: { type: "string" }, 
                                        issue: { type: "string" }, 
                                        description: { type: "string" },
                                        severity: { type: "string" },
                                        suggestion: { type: "string" }
                                    } 
                                } 
                            },
                            missing_data: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        component_id: { type: "string" },
                                        field: { type: "string" },
                                        suggestion: { type: "string" }
                                    }
                                }
                            },
                            suggestions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        component_id: { type: "string" },
                                        type: { type: "string" },
                                        recommendation: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                const result = typeof response === 'string' ? JSON.parse(response) : response;
                setAnalysisResult(result);
                return result;
            } finally {
                setIsAnalyzing(false);
            }
        },
        onSuccess: () => {
            toast.success("AI Analysis Complete");
        }
    });

    const applySuggestion = (componentId, updates) => {
        // Find component
        const comp = components.find(c => c.id === componentId);
        if (!comp) return;

        // Propagate update up
        onUpdateComponent(comp.id, updates);
        
        // Remove from list locally for better UX
        if (analysisResult) {
            setAnalysisResult(prev => ({
                ...prev,
                missing_data: prev.missing_data.filter(i => i.component_id !== componentId)
            }));
        }
        toast.success("Applied suggestion");
    };

    return (
        <Card className="bg-slate-50 border-indigo-100">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base text-slate-800">AI Data Validator</CardTitle>
                            <CardDescription>Detect anomalies and enrich missing data</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => analyzeMutation.mutate()} 
                            disabled={isAnalyzing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            size="sm"
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Run Analysis"}
                        </Button>
                        {onClose && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={onClose}>
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!analysisResult && !isAnalyzing && (
                    <div className="text-center py-6 text-slate-400 text-sm">
                        Click "Run Analysis" to scan the BOM for issues.
                    </div>
                )}

                {isAnalyzing && (
                    <div className="text-center py-6 text-slate-500 text-sm flex flex-col items-center">
                        <Loader2 className="w-8 h-8 mb-2 animate-spin text-indigo-400" />
                        Analyzing emission factors against global baselines...
                    </div>
                )}

                {analysisResult && (
                    <div className="space-y-4">
                        {/* Anomalies */}
                        {analysisResult.anomalies?.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Detected Anomalies
                                </h4>
                                {analysisResult.anomalies.map((issue, i) => {
                                    const comp = components.find(c => c.id === issue.component_id);
                                    return (
                                        <div key={i} className="bg-white p-3 rounded border border-amber-100 shadow-sm text-sm">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-slate-700">{comp?.name || 'Unknown Component'}</span>
                                                <Badge variant="outline" className="text-amber-600 border-amber-200">{issue.severity}</Badge>
                                            </div>
                                            <p className="text-slate-600 mb-2">{issue.description}</p>
                                            <div className="bg-amber-50 p-2 rounded text-xs text-amber-800">
                                                Tip: {issue.suggestion}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Missing Data */}
                        {analysisResult.missing_data?.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                    <Database className="w-4 h-4" /> Missing Data Suggestions
                                </h4>
                                {analysisResult.missing_data.map((item, i) => {
                                    const comp = components.find(c => c.id === item.component_id);
                                    return (
                                        <div key={i} className="bg-white p-3 rounded border border-blue-100 shadow-sm text-sm flex justify-between items-center">
                                            <div>
                                                <span className="font-bold text-slate-700 block">{comp?.name}</span>
                                                <span className="text-slate-500">Missing {item.field}: </span>
                                                <span className="text-blue-600 font-medium">{item.suggestion}</span>
                                            </div>
                                            {item.field === 'material_type' && (
                                                <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 h-7"
                                                    onClick={() => applySuggestion(item.component_id, { material_type: item.suggestion })}
                                                >
                                                    Apply
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* General Suggestions */}
                        {analysisResult.suggestions?.length > 0 && (
                             <div className="space-y-2">
                                <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Optimization Tips
                                </h4>
                                {analysisResult.suggestions.map((sugg, i) => {
                                    const comp = components.find(c => c.id === sugg.component_id);
                                    return (
                                        <div key={i} className="bg-white p-3 rounded border border-emerald-100 shadow-sm text-sm">
                                            <span className="font-bold text-slate-700">{comp?.name}: </span>
                                            <span className="text-slate-600">{sugg.recommendation}</span>
                                        </div>
                                    );
                                })}
                             </div>
                        )}
                        
                        {analysisResult.anomalies?.length === 0 && analysisResult.missing_data?.length === 0 && (
                            <div className="bg-emerald-50 p-4 rounded text-center text-emerald-700 text-sm">
                                <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                No major data quality issues found!
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}