import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Users, MapPin, Download, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";

export default function EUDRBulkImportTool({ open, onOpenChange }) {
    const [activeTab, setActiveTab] = useState("dds");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const queryClient = useQueryClient();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            // Mock preview parsing
            // In production, use PapaParse or similar
            setPreview([
                { col1: "Data 1", col2: "Data 2", status: "Valid" },
                { col1: "Data 3", col2: "Data 4", status: "Valid" },
                { col1: "Data 5", col2: "Data 6", status: "Valid" },
            ]);
        }
    };

    const importMutation = useMutation({
        mutationFn: async ({ type, file }) => {
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (type === 'dds') {
                // Mock bulk creation of DDS Drafts
                const mockData = Array(5).fill(null).map((_, i) => ({
                    dds_reference: `DDS-BULK-${Date.now()}-${i}`,
                    transaction_type: 'Import',
                    status: 'Draft',
                    risk_level: 'Standard',
                    risk_decision: 'Non-negligible',
                    submission_date: new Date().toISOString()
                }));
                await base44.entities.EUDRDDS.create(mockData[0]); // Create one real for demo
            } else if (type === 'suppliers') {
                // Mock bulk suppliers
                const mockData = {
                    legal_name: `Bulk Supplier ${Date.now()}`,
                    country: "Brazil",
                    risk_level: "low"
                };
                await base44.entities.Supplier.create(mockData);
            } else if (type === 'plots') {
                // Handle GeoJSON
                // In real app, we'd parse GeoJSON and save to DB or pass to map component
            }
            
            return { success: true, count: 5 };
        },
        onSuccess: (data) => {
            toast.success(`Successfully imported ${data.count} records.`);
            queryClient.invalidateQueries();
            onOpenChange(false);
            setFile(null);
            setPreview([]);
        },
        onError: () => {
            toast.error("Import failed. Please check your file format.");
        }
    });

    const handleImport = () => {
        if (!file) return;
        importMutation.mutate({ type: activeTab, file });
    };

    const templates = {
        dds: { name: "DDS_Import_Template.csv", cols: ["PO Number", "Supplier ID", "Commodity", "HS Code", "Quantity", "Country"] },
        suppliers: { name: "Supplier_Onboarding.csv", cols: ["Legal Name", "Country", "Email", "VAT", "Address"] },
        plots: { name: "Plots_Structure.json", cols: ["GeoJSON FeatureCollection required"] }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white/80 backdrop-blur-xl border-2 border-slate-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900 font-light">
                        <Upload className="w-5 h-5 text-black" />
                        Bulk Data Import
                    </DialogTitle>
                    <DialogDescription className="text-slate-600 font-light">
                        Upload data files to automate entry across modules.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 bg-white/80 backdrop-blur-sm border border-slate-200">
                        <TabsTrigger value="dds" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            <FileText className="w-4 h-4 mr-2" /> Purchase Orders
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            <Users className="w-4 h-4 mr-2" /> Suppliers
                        </TabsTrigger>
                        <TabsTrigger value="plots" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                            <MapPin className="w-4 h-4 mr-2" /> Geolocation
                        </TabsTrigger>
                    </TabsList>

                    <div className="space-y-4">
                        <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-white/60 backdrop-blur-sm text-center hover:border-slate-400 hover:bg-white/80 transition-all">
                            <Input 
                                type="file" 
                                className="hidden" 
                                id="file-upload"
                                onChange={handleFileChange}
                                accept={activeTab === 'plots' ? '.json,.geojson,.kml' : '.csv,.xlsx'}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full min-h-[100px]">
                                {file ? (
                                    <>
                                        <FileText className="w-8 h-8 text-black mb-2" />
                                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                                        <p className="text-xs text-slate-600 font-light">{(file.size / 1024).toFixed(2)} KB</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-600 mb-2" />
                                        <p className="text-sm font-medium text-slate-900">Click to upload {activeTab === 'plots' ? 'GeoJSON' : 'CSV'}</p>
                                        <p className="text-xs text-slate-600 font-light">or drag and drop</p>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Template Info */}
                        <div className="flex items-center justify-between text-xs text-slate-600 bg-white/60 backdrop-blur-sm border border-slate-200 p-3 rounded">
                            <div className="flex gap-2">
                                <AlertTriangle className="w-4 h-4 text-black" />
                                <span className="font-light">Required Columns: {templates[activeTab].cols.join(", ")}</span>
                            </div>
                            <Button variant="link" size="sm" className="h-auto p-0 text-slate-900">
                                <Download className="w-3 h-3 mr-1" /> Template
                            </Button>
                        </div>

                        {/* Preview (Mock) */}
                        {file && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-900">Preview ({preview.length} records)</p>
                                <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
                                    <div className="bg-white/80 backdrop-blur-sm p-2 flex justify-between font-medium text-slate-900">
                                        <span>Row 1</span>
                                        <Badge variant="outline" className="bg-white text-slate-900 border-slate-300">Valid Format</Badge>
                                    </div>
                                    <div className="bg-white/60 backdrop-blur-sm p-2 flex justify-between border-t border-slate-200 text-slate-900">
                                        <span>Row 2</span>
                                        <Badge variant="outline" className="bg-white text-slate-900 border-slate-300">Valid Format</Badge>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="mr-2 border-2 border-slate-200 hover:border-slate-400 text-slate-900">Cancel</Button>
                            <Button 
                                onClick={handleImport} 
                                disabled={!file || importMutation.isPending}
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                {importMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Import & Automate</>
                                )}
                            </Button>
                        </div>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}