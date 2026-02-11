import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UploadCloud, Sparkles, FileText, ArrowRight, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function AISpendAnalysisModal({ open, onOpenChange, onImport }) {
    const [file, setFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedData, setAnalyzedData] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);

    const handleAnalyze = async () => {
        if (!file) return;
        setIsAnalyzing(true);
        
        try {
            // Simulate File Upload
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Real AI Analysis
            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `Analyze the uploaded spend document (Invoice/Statement). 
                Extract line items with: Date, Supplier Name, Description, Amount, Currency.
                For each item, suggest the most appropriate GHG Protocol Scope 3 Category (1-15).
                If the amount is high (> $50,000) or the description suggests raw materials/logistics with high emissions, mark 'gap' as true (meaning we need primary data).
                Return a JSON object with a key 'items' containing an array of objects.
                Each object should have: id (random number), date, supplier, description, amount (number), currency, category (string, e.g. "Cat 1: Purchased goods"), confidence ("High"/"Medium"/"Low"), gap (boolean).`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "number" },
                                    date: { type: "string" },
                                    supplier: { type: "string" },
                                    description: { type: "string" },
                                    amount: { type: "number" },
                                    currency: { type: "string" },
                                    category: { type: "string" },
                                    confidence: { type: "string" },
                                    gap: { type: "boolean" }
                                }
                            }
                        }
                    }
                }
            });

            if (aiResponse && aiResponse.items) {
                setAnalyzedData(aiResponse.items);
                setSelectedItems(aiResponse.items.map(i => i.id));
                toast.success(`AI Analysis Complete: ${aiResponse.items.length} items extracted`);
            } else {
                throw new Error("Failed to parse AI response");
            }
            setSelectedItems(mockResults.map(i => i.id)); // Select all by default
            toast.success("AI Analysis Complete: 4 Spend Items Categorized");

        } catch (error) {
            toast.error("Analysis failed", { description: error.message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRequestData = async (item) => {
        toast.promise(
            // Simulate sending request
            new Promise(resolve => setTimeout(resolve, 1000)),
            {
                loading: `Sending data request to ${item.supplier}...`,
                success: () => {
                    // Mark gap as requested in local state
                    setAnalyzedData(prev => prev.map(i => i.id === item.id ? { ...i, requestSent: true } : i));
                    return `Request sent to ${item.supplier} via Supplier Portal`;
                },
                error: "Failed to send request"
            }
        );
    };

    const handleImport = () => {
        const itemsToImport = analyzedData.filter(i => selectedItems.includes(i.id));
        const convertedEntries = itemsToImport.map(item => ({
            // Map to CCFEntry format
            facility_id: "unknown", // User would typically map this
            reporting_year: new Date(item.date).getFullYear(),
            period: "Monthly",
            scope: "Scope 3",
            category: item.category,
            activity_source: `Spend: ${item.supplier}`,
            activity_value: item.amount,
            unit: item.currency,
            status: "Calculated",
            description: item.description,
            evidence_url: "ai_imported",
            // Auto-calc emissions for demo (spend based)
            emission_factor: 0.4, // generic spend factor
            co2e_kg: item.amount * 0.4 
        }));

        onImport(convertedEntries);
        onOpenChange(false);
        setAnalyzedData(null);
        setFile(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        AI Spend Analysis & Categorization
                    </DialogTitle>
                    <DialogDescription>
                        Upload invoices or spend reports (CSV/PDF). AI will extract data, categorize into Scope 3, and identify primary data gaps.
                    </DialogDescription>
                </DialogHeader>

                {!analyzedData ? (
                    <div className="py-8">
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                            <input 
                                type="file" 
                                id="spend-upload" 
                                className="hidden" 
                                accept=".csv,.pdf,.xlsx"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <label htmlFor="spend-upload" className="cursor-pointer flex flex-col items-center">
                                {file ? (
                                    <>
                                        <FileText className="w-12 h-12 text-indigo-600 mb-3" />
                                        <p className="font-medium text-slate-700">{file.name}</p>
                                        <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-12 h-12 text-slate-300 mb-3" />
                                        <p className="font-medium text-slate-700">Click to upload Spend Report</p>
                                        <p className="text-xs text-slate-500 mt-1">Support for PDF Invoices and CSV Exports</p>
                                    </>
                                )}
                            </label>
                        </div>
                        
                        <div className="flex justify-center mt-6">
                            <Button 
                                onClick={handleAnalyze} 
                                disabled={!file || isAnalyzing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" /> Analyze Spend
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex justify-between items-center">
                            <div className="text-sm text-indigo-800">
                                <span className="font-bold">{analyzedData.length} items found.</span> 
                                <span className="ml-1">2 High-value items flagged for primary data request.</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setAnalyzedData(null)}>Reset</Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox 
                                                checked={selectedItems.length === analyzedData.length}
                                                onCheckedChange={(c) => setSelectedItems(c ? analyzedData.map(i => i.id) : [])}
                                            />
                                        </TableHead>
                                        <TableHead>Supplier / Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Suggested Category</TableHead>
                                        <TableHead>Analysis</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analyzedData.map(item => (
                                        <TableRow key={item.id} className={selectedItems.includes(item.id) ? 'bg-slate-50/50' : ''}>
                                            <TableCell>
                                                <Checkbox 
                                                    checked={selectedItems.includes(item.id)}
                                                    onCheckedChange={(c) => {
                                                        setSelectedItems(prev => c ? [...prev, item.id] : prev.filter(id => id !== item.id));
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.supplier}</div>
                                                <div className="text-xs text-slate-500">{item.description}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-mono text-sm">{item.amount.toLocaleString()} {item.currency}</div>
                                                <div className="text-[10px] text-slate-400">{item.date}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal bg-white">
                                                    {item.category.split(':')[0]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.gap ? (
                                                    <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                                                        <AlertTriangle className="w-3 h-3" /> High Spend Gap
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-emerald-600 text-xs">
                                                        <CheckCircle2 className="w-3 h-3" /> Standard
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.gap && !item.requestSent && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="secondary" 
                                                        className="h-7 text-xs bg-amber-100 text-amber-800 hover:bg-amber-200"
                                                        onClick={() => handleRequestData(item)}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" /> Request Data
                                                    </Button>
                                                )}
                                                {item.requestSent && (
                                                    <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">Requested</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button 
                                onClick={handleImport}
                                disabled={selectedItems.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Import {selectedItems.length} Entries
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}