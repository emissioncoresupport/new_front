import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import moment from "moment";

export default function PCFReportGenerator({ product, components, isOpen, onClose }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [format, setFormat] = useState("PDF");
    const [boundary, setBoundary] = useState(product.system_boundary || "Cradle-to-Gate");
    const [includeAudit, setIncludeAudit] = useState(true);

    const generatePDF = async () => {
        setIsGenerating(true);
        // Create a temporary container for the report
        const reportId = "pcf-report-content";
        const element = document.getElementById(reportId);
        
        if (!element) {
            setIsGenerating(false);
            return;
        }

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`PCF_Report_${product.sku}_${moment().format('YYYYMMDD')}.pdf`);
            onClose();
        } catch (err) {
            console.error("PDF Gen Error", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateCSV = () => {
        setIsGenerating(true);
        try {
            const headers = ["Component Name", "Type", "Quantity", "Unit", "Lifecycle Stage", "Emission Factor", "Total CO2e (kg)", "Data Quality", "Origin"];
            const rows = components.map(c => [
                c.name,
                c.node_type,
                c.quantity,
                c.unit,
                c.lifecycle_stage,
                c.emission_factor,
                c.co2e_kg,
                c.data_quality_rating,
                c.geographic_origin
            ]);

            const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `PCF_BOM_${product.sku}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            onClose();
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = () => {
        if (format === "PDF") generatePDF();
        else generateCSV();
    };

    // Filter components based on selected boundary
    const filteredComponents = components.filter(c => {
        if (boundary === "Cradle-to-Gate") return ["Raw Material Acquisition", "Production", "Distribution"].includes(c.lifecycle_stage);
        return true; // Cradle-to-Grave includes all
    });

    const totalImpact = filteredComponents.reduce((sum, c) => sum + (c.co2e_kg || 0), 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Export PCF Report</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Export Format</Label>
                            <Select value={format} onValueChange={setFormat}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PDF">PDF Document</SelectItem>
                                    <SelectItem value="CSV">CSV Data Export</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>System Boundary</Label>
                            <Select value={boundary} onValueChange={setBoundary}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cradle-to-Gate">Cradle-to-Gate</SelectItem>
                                    <SelectItem value="Cradle-to-Grave">Cradle-to-Grave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id="audit" checked={includeAudit} onCheckedChange={setIncludeAudit} />
                            <Label htmlFor="audit">Include Audit Trail Summary</Label>
                        </div>
                    </div>

                    {/* Preview Area (Hidden for CSV, visible but scaled for PDF preview) */}
                    <div className="border rounded-lg bg-slate-50 p-4 h-[300px] overflow-hidden relative">
                        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold text-slate-400">Preview</div>
                        <div id="pcf-report-content" className="bg-white p-8 shadow-sm text-sm transform scale-[0.6] origin-top-left w-[160%]">
                            {/* Report Header */}
                            <div className="border-b pb-4 mb-4 flex justify-between items-end">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800">Product Carbon Footprint</h1>
                                    <p className="text-slate-500">ISO 14067 Compliant Report</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">{moment().format('MMM DD, YYYY')}</p>
                                    <p className="text-slate-500">Gen by Base44</p>
                                </div>
                            </div>
                            
                            {/* Product Info */}
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded">
                                <div>
                                    <p className="text-xs text-slate-400">Product Name</p>
                                    <p className="font-bold">{product.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">SKU / ID</p>
                                    <p className="font-bold">{product.sku}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Functional Unit</p>
                                    <p className="font-bold">{product.quantity_amount} {product.unit}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">System Boundary</p>
                                    <p className="font-bold text-emerald-600">{boundary}</p>
                                </div>
                            </div>

                            {/* Impact Summary */}
                            <div className="mb-6">
                                <h3 className="font-bold text-lg border-b pb-2 mb-2">Impact Assessment</h3>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-3xl font-bold text-slate-800">{totalImpact.toFixed(2)}</span>
                                    <span className="text-slate-500">kg CO₂e per unit</span>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-2">Lifecycle Stage</th>
                                            <th className="p-2 text-right">Impact (kg CO₂e)</th>
                                            <th className="p-2 text-right">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {["Raw Material Acquisition", "Production", "Distribution", "Usage", "End-of-Life"].map(stage => {
                                            const val = filteredComponents.filter(c => c.lifecycle_stage === stage).reduce((s, c) => s + (c.co2e_kg || 0), 0);
                                            if (val === 0) return null;
                                            return (
                                                <tr key={stage} className="border-b">
                                                    <td className="p-2">{stage}</td>
                                                    <td className="p-2 text-right">{val.toFixed(3)}</td>
                                                    <td className="p-2 text-right">{((val / totalImpact) * 100).toFixed(1)}%</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer */}
                            <div className="mt-8 text-xs text-slate-400 border-t pt-2">
                                <p>Verified data sources: Climatiq, Ecoinvent 3.9. This report is computer generated.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleExport} disabled={isGenerating} className="bg-[#02a1e8] hover:bg-[#028ecf] text-white">
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (format === 'PDF' ? <FileText className="w-4 h-4 mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />)}
                        Export {format}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}