import React, { useState } from 'react';
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PFASBatchScanner from './PFASBatchScanner';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Loader2, CheckCircle, AlertTriangle, ShieldAlert, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PFASScanner({ initialType, initialId }) {
    const [activeMode, setActiveMode] = useState("interactive");
    const [scanType, setScanType] = useState(initialType || "Product");
    const [selectedId, setSelectedId] = useState(initialId || "");
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);

    // Fetch SupplyLens Data
    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: () => base44.entities.Product.list(),
        enabled: scanType === 'Product'
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list(),
        enabled: scanType === 'Supplier'
    });

    const scanMutation = useMutation({
        mutationFn: async () => {
            setIsScanning(true);
            setScanResult(null);
            try {
                // Fetch entity details
                let entityName = "";
                let contextData = "";

                if (scanType === 'Product') {
                    const prod = products.find(p => p.id === selectedId);
                    entityName = prod?.name;
                    // Fetch components for context
                    const components = await base44.entities.ProductComponent.list();
                    const relevant = components.filter(c => c.product_id === selectedId);
                    contextData = JSON.stringify({
                        product: prod,
                        components: relevant.map(c => ({ name: c.name, material: c.material_type }))
                    });
                } else if (scanType === 'Supplier') {
                    const supp = suppliers.find(s => s.id === selectedId);
                    entityName = supp?.legal_name;
                    contextData = JSON.stringify(supp);
                } else {
                    // Manual
                    entityName = selectedId; // stored in state
                    contextData = document.getElementById('manual-context')?.value || "No data provided";
                }

                // AI Analysis
                const prompt = `Analyze the following ${scanType} for PFAS compliance risks based on REACH and ECHA regulations.
                Context: ${contextData}
                
                CRITICAL: You must explicitly check against:
                1. REACH Annex XVII (Restriction List)
                2. ECHA Candidate List (SVHC)
                
                Return a JSON object with:
                - status: "Compliant" | "Non-Compliant" | "Suspected"
                - risk_score: number (0-100)
                - ai_analysis_notes: string (explanation)
                - regulatory_references: array of string (e.g. "REACH Annex XVII Entry 68")
                - detected_substances: array of { 
                    name, 
                    cas_number, 
                    regulation (e.g. "REACH Annex XVII"), 
                    list_status (e.g. "Restricted", "Candidate List"),
                    is_restricted (boolean) 
                  }
                
                If insufficient data, make a best guess based on industry/materials (e.g. textiles/electronics have higher risk).`;

                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: prompt,
                    add_context_from_internet: true, // Check real-time regulations
                    response_json_schema: {
                        type: "object",
                        properties: {
                            status: { type: "string", enum: ["Compliant", "Non-Compliant", "Suspected"] },
                            risk_score: { type: "number" },
                            ai_analysis_notes: { type: "string" },
                            detected_substances: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        cas_number: { type: "string" },
                                        regulation: { type: "string" },
                                        is_restricted: { type: "boolean" }
                                    }
                                }
                            }
                        }
                    }
                });

                const result = typeof response === 'string' ? JSON.parse(response) : response;

                // Save Assessment
                await base44.entities.PFASAssessment.create({
                    entity_id: selectedId,
                    entity_type: scanType,
                    name: entityName,
                    status: result.status,
                    risk_score: result.risk_score,
                    detected_substances: result.detected_substances,
                    ai_analysis_notes: result.ai_analysis_notes,
                    last_checked: new Date().toISOString()
                });

                return { ...result, entityName };
            } finally {
                setIsScanning(false);
            }
        },
        onSuccess: (data) => {
            setScanResult(data);
            toast.success("Scan completed successfully");
        },
        onError: () => toast.error("Scan failed")
    });

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
            <Tabs value={activeMode} onValueChange={setActiveMode} className="w-full">
                <div className="flex justify-center mb-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="interactive">Interactive Scan</TabsTrigger>
                        <TabsTrigger value="batch">Batch Upload</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="batch">
                    <PFASBatchScanner />
                </TabsContent>

                <TabsContent value="interactive">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configure Scan</CardTitle>
                        <CardDescription>Select an entity from SupplyLens to analyze.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Entity Type</Label>
                            <Select value={scanType} onValueChange={setScanType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Product">Product (BOM)</SelectItem>
                                    <SelectItem value="Supplier">Supplier Profile</SelectItem>
                                    <SelectItem value="Manual">Manual Text / BOM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {scanType === 'Manual' ? (
                            <>
                                <div className="space-y-2">
                                    <Label>Reference Name</Label>
                                    <Input 
                                        placeholder="e.g. New Material Batch X" 
                                        value={selectedId}
                                        onChange={(e) => setSelectedId(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Upload Document (Optional)</Label>
                                    <input 
                                        type="file"
                                        accept=".pdf,.csv,.xlsx,.txt,.doc,.docx"
                                        className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm file:border-0 file:bg-[#86b027]/10 file:text-[#86b027] file:text-sm file:font-medium"
                                        id="manual-file-upload"
                                    />
                                    <p className="text-xs text-slate-500">Supported: PDF, CSV, Excel, TXT, Word</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Data / Composition</Label>
                                    <textarea 
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Paste BOM, chemical list, or description here..."
                                        id="manual-context"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <Label>Select Target</Label>
                                <Select value={selectedId} onValueChange={setSelectedId}>
                                    <SelectTrigger><SelectValue placeholder={`Select ${scanType}...`} /></SelectTrigger>
                                    <SelectContent>
                                        {scanType === 'Product' ? 
                                            products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>) :
                                            suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <Button 
                            className="w-full bg-[#86b027] hover:bg-[#769c22] text-white shadow-md shadow-[#86b027]/20"
                            disabled={!selectedId || isScanning}
                            onClick={() => scanMutation.mutate()}
                        >
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanLine className="w-4 h-4 mr-2" />}
                            {isScanning ? "Analyzing..." : "Run Compliance Scan"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2">
                {scanResult ? (
                    <Card className="border-slate-200 shadow-lg shadow-slate-100">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        {scanResult.entityName}
                                        <Badge className={`
                                            ${scanResult.status === 'Compliant' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                              scanResult.status === 'Non-Compliant' ? 'bg-rose-500 hover:bg-rose-600' :
                                              'bg-amber-500 hover:bg-amber-600'} text-white border-0 shadow-sm
                                        `}>
                                            {scanResult.status}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>Analyzed against REACH Annex XVII and ECHA Candidate List</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-slate-500">Risk Score</p>
                                    <p className={`text-2xl font-bold ${
                                        scanResult.risk_score > 70 ? 'text-rose-600' :
                                        scanResult.risk_score > 30 ? 'text-amber-600' : 'text-emerald-600'
                                    }`}>{scanResult.risk_score}/100</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 border border-slate-100">
                                <p className="font-bold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> AI Analysis</p>
                                {scanResult.ai_analysis_notes}
                                
                                {scanResult.regulatory_references && scanResult.regulatory_references.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Regulatory Sources</p>
                                        <div className="flex flex-wrap gap-2">
                                            {scanResult.regulatory_references.map((ref, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-100">
                                                    {ref}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-3">Detected Substances</h4>
                                {scanResult.detected_substances?.length > 0 ? (
                                    <div className="space-y-2">
                                        {scanResult.detected_substances.map((sub, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div>
                                                    <p className="font-bold text-slate-800">{sub.name}</p>
                                                    <p className="text-xs text-slate-500">CAS: {sub.cas_number || 'N/A'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="outline">{sub.regulation}</Badge>
                                                    {sub.is_restricted && (
                                                        <span className="ml-2 text-xs font-bold text-rose-600">RESTRICTED</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-700">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-medium">No high-risk substances detected.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-slate-400">
                        <ScanLine className="w-12 h-12 mb-4 opacity-50" />
                        <p className="font-medium">Ready to scan</p>
                        <p className="text-sm">Select a product or supplier to begin AI analysis.</p>
                    </div>
                )}
            </div>
        </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}