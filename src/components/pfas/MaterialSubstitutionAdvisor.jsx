import React, { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ArrowRight, Leaf, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MaterialSubstitutionAdvisor() {
    const [material, setMaterial] = useState("");
    const [context, setContext] = useState("");
    const [analysis, setAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeMutation = useMutation({
        mutationFn: async () => {
            setIsAnalyzing(true);
            try {
                const prompt = `Act as an expert chemical engineer and regulatory compliance specialist. 
                The user wants to replace a material/chemical: "${material}".
                Context/Application: "${context}".

                Suggest 3 specific compliant, sustainable alternatives.
                For each alternative, assess:
                1. Regulatory Status (REACH, ECHA, PFAS restrictions).
                2. Environmental Impact (Sustainability score).
                3. Cost-Effectiveness estimate.
                4. Performance trade-offs for the application.
                5. Compliance Impact on the final product.

                Return JSON format:
                {
                    "alternatives": [
                        {
                            "name": "string",
                            "compliance_status": "Compliant" | "Restricted" | "Caution",
                            "sustainability_score": number (1-10),
                            "cost_impact": "Lower" | "Similar" | "Higher",
                            "details": "string",
                            "trade_offs": "string"
                        }
                    ],
                    "overall_recommendation": "string"
                }`;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: true,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            alternatives: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        compliance_status: { type: "string" },
                                        sustainability_score: { type: "number" },
                                        cost_impact: { type: "string" },
                                        details: { type: "string" },
                                        trade_offs: { type: "string" }
                                    }
                                }
                            },
                            overall_recommendation: { type: "string" }
                        }
                    }
                });

                return typeof response === 'string' ? JSON.parse(response) : response;
            } finally {
                setIsAnalyzing(false);
            }
        },
        onSuccess: (data) => setAnalysis(data)
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Input Section */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="border-indigo-100 shadow-sm">
                    <CardHeader className="bg-indigo-50/50 border-b border-indigo-50 pb-4">
                        <CardTitle className="flex items-center gap-2 text-indigo-900">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            AI Advisor
                        </CardTitle>
                        <CardDescription>
                            Find safer, sustainable alternatives for hazardous materials.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Material / Chemical to Replace</label>
                            <Input 
                                placeholder="e.g. PTFE, BPA, Chrome VI" 
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Application Context</label>
                            <Input 
                                placeholder="e.g. Waterproof coating for outdoor jackets" 
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                            />
                        </div>
                        <Button 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => analyzeMutation.mutate()}
                            disabled={!material || isAnalyzing}
                        >
                            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Generate Recommendations
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2">
                {analysis ? (
                    <div className="space-y-6">
                        <Card className="border-emerald-100 bg-emerald-50/30">
                            <CardContent className="pt-6">
                                <h3 className="text-lg font-bold text-emerald-900 mb-2">AI Recommendation</h3>
                                <p className="text-slate-700 leading-relaxed">{analysis.overall_recommendation}</p>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            {analysis.alternatives.map((alt, idx) => (
                                <Card key={idx} className="hover:shadow-md transition-all">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg font-bold text-slate-800">{alt.name}</CardTitle>
                                                <div className="flex gap-2 mt-2">
                                                    <Badge variant="outline" className={
                                                        alt.compliance_status === 'Compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }>
                                                        {alt.compliance_status === 'Compliant' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                                                        {alt.compliance_status}
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        <Leaf className="w-3 h-3 mr-1" /> Score: {alt.sustainability_score}/10
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                                                        <DollarSign className="w-3 h-3 mr-1" /> Cost: {alt.cost_impact}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon">
                                                <ArrowRight className="w-5 h-5 text-slate-400" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <span className="font-semibold text-slate-700">Analysis: </span>
                                                <span className="text-slate-600">{alt.details}</span>
                                            </div>
                                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs">
                                                <span className="font-bold">Trade-offs: </span>
                                                {alt.trade_offs}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-slate-400">
                        <Sparkles className="w-12 h-12 mb-4 opacity-30" />
                        <p className="font-medium">Ready to Innovate?</p>
                        <p className="text-sm max-w-xs text-center mt-2">Enter a material to discover REACH-compliant, sustainable alternatives.</p>
                    </div>
                )}
            </div>
        </div>
    );
}