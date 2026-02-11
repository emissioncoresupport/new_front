import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Plus, Eye, Archive, FileCheck, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';

export default function GHGReports() {
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [viewReport, setViewReport] = useState(null);
    const queryClient = useQueryClient();

    const { data: reports = [] } = useQuery({
        queryKey: ['ghg-reports'],
        queryFn: () => base44.entities.GHGReport.list()
    });

    const { data: ccfEntries = [] } = useQuery({
        queryKey: ['all-ccf-entries'],
        queryFn: () => base44.entities.CCFEntry.list()
    });

    const { data: scope3Entries = [] } = useQuery({
        queryKey: ['all-scope3-entries'],
        queryFn: () => base44.entities.Scope3Entry.list()
    });

    const [newReport, setNewReport] = useState({
        title: "",
        report_type: "GHG_Protocol_Standard",
        reporting_year: new Date().getFullYear(),
        include_scope1: true,
        include_scope2: true,
        include_scope3: true,
        detail_level: "Detailed"
    });

    const generateReportMutation = useMutation({
        mutationFn: async (config) => {
            // 1. Aggregate Data for Snapshot
            const year = config.reporting_year;
            
            // Filter Data
            const scope1 = ccfEntries.filter(e => e.reporting_year === year && e.scope === 'Scope 1').reduce((a, b) => a + (b.co2e_kg || 0), 0);
            const scope2 = ccfEntries.filter(e => e.reporting_year === year && e.scope === 'Scope 2').reduce((a, b) => a + (b.co2e_kg || 0), 0);
            
            // For Scope 3, we assume 'date' field exists and parse year, or fallback
            const scope3 = scope3Entries.filter(e => {
                const d = new Date(e.date || `${year}-01-01`);
                return d.getFullYear() === year;
            }).reduce((a, b) => a + (b.co2e_kg || 0), 0);

            const snapshot = {
                generated_at: new Date().toISOString(),
                totals: {
                    scope1: config.include_scope1 ? scope1 : 0,
                    scope2: config.include_scope2 ? scope2 : 0,
                    scope3: config.include_scope3 ? scope3 : 0,
                    total: (config.include_scope1 ? scope1 : 0) + (config.include_scope2 ? scope2 : 0) + (config.include_scope3 ? scope3 : 0)
                },
                breakdown: {
                    scope1_entries: config.detail_level === 'Detailed' ? ccfEntries.filter(e => e.scope === 'Scope 1' && e.reporting_year === year).length : null,
                    scope3_categories: config.detail_level === 'Detailed' ? [...new Set(scope3Entries.map(e => e.category_id))].length : null
                }
            };

            return base44.entities.GHGReport.create({
                title: config.title || `GHG Report ${year}`,
                report_type: config.report_type,
                reporting_year: config.reporting_year,
                status: "Generated",
                version: 1,
                sections_config: {
                    include_scope1: config.include_scope1,
                    include_scope2: config.include_scope2,
                    include_scope3: config.include_scope3,
                    detail_level: config.detail_level
                },
                data_snapshot: snapshot,
                generated_by: "System User" // In real app, use auth context
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['ghg-reports']);
            setIsGenerateOpen(false);
            toast.success("Report generated successfully");
        }
    });

    const handleExportPDF = (report) => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text(report.title, 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Type: ${report.report_type}`, 20, 30);
        doc.text(`Year: ${report.reporting_year}`, 20, 36);
        doc.text(`Generated: ${new Date(report.created_date).toLocaleDateString()}`, 20, 42);
        doc.text(`Status: ${report.status} (v${report.version})`, 20, 48);

        doc.setLineWidth(0.5);
        doc.line(20, 55, 190, 55);

        doc.setFontSize(16);
        doc.text("Executive Summary", 20, 70);

        const totals = report.data_snapshot?.totals || {};
        
        doc.setFontSize(12);
        doc.text(`Scope 1 Emissions: ${(totals.scope1 / 1000).toFixed(2)} tCO2e`, 20, 85);
        doc.text(`Scope 2 Emissions: ${(totals.scope2 / 1000).toFixed(2)} tCO2e`, 20, 92);
        doc.text(`Scope 3 Emissions: ${(totals.scope3 / 1000).toFixed(2)} tCO2e`, 20, 99);
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Gross Emissions: ${(totals.total / 1000).toFixed(2)} tCO2e`, 20, 115);

        doc.save(`${report.title.replace(/\s+/g, '_')}.pdf`);
        toast.success("PDF Downloaded");
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reporting Hub</h2>
                    <p className="text-slate-500">Generate compliant GHG reports, manage versions, and export data.</p>
                </div>
                <Button onClick={() => setIsGenerateOpen(true)} className="bg-[#86b027] hover:bg-[#769c22] text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" /> Generate New Report
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Reports</CardTitle>
                        <div className="text-2xl font-bold text-slate-800">{reports.length}</div>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Last Generated</CardTitle>
                        <div className="text-sm font-bold text-slate-800">
                            {reports.length > 0 ? new Date(reports[0].created_date).toLocaleDateString() : "-"}
                        </div>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Standards Used</CardTitle>
                        <div className="flex gap-1 mt-1">
                            {[...new Set(reports.map(r => r.report_type))].slice(0,3).map(t => (
                                <Badge key={t} variant="outline" className="text-[10px] bg-white">{t.split('_')[0]}</Badge>
                            ))}
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Report Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Total Emissions (tCO₂e)</TableHead>
                                <TableHead>Generated Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map(report => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            {report.title}
                                        </div>
                                        <div className="text-[10px] text-slate-400 ml-6">v{report.version} • {report.sections_config?.detail_level}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs">{report.report_type.replace(/_/g, ' ')}</Badge>
                                    </TableCell>
                                    <TableCell>{report.reporting_year}</TableCell>
                                    <TableCell className="font-mono font-bold text-slate-700">
                                        {((report.data_snapshot?.totals?.total || 0) / 1000).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {new Date(report.created_date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            report.status === 'Finalized' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                            report.status === 'Archived' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                            'bg-blue-100 text-blue-700 border-blue-200'
                                        }>
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewReport(report)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportPDF(report)}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {reports.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                                        No reports generated yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Generation Modal */}
            <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Generate New GHG Report</DialogTitle>
                        <CardDescription>Create a snapshot of your emissions data for reporting.</CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Report Title</Label>
                            <Input 
                                placeholder="e.g. Sustainability Report 2025" 
                                value={newReport.title}
                                onChange={(e) => setNewReport({...newReport, title: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Framework Standard</Label>
                                <Select value={newReport.report_type} onValueChange={(v) => setNewReport({...newReport, report_type: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GHG_Protocol_Standard">GHG Protocol Corporate Std</SelectItem>
                                        <SelectItem value="CSRD_E1">CSRD ESRS E1</SelectItem>
                                        <SelectItem value="CDP_Climate">CDP Climate Change</SelectItem>
                                        <SelectItem value="Custom">Custom / Internal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Reporting Year</Label>
                                <Input 
                                    type="number" 
                                    value={newReport.reporting_year}
                                    onChange={(e) => setNewReport({...newReport, reporting_year: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                            <Label className="text-slate-600 font-bold">Included Scopes</Label>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="s1" checked={newReport.include_scope1} onCheckedChange={(c) => setNewReport({...newReport, include_scope1: c})} />
                                    <label htmlFor="s1" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Scope 1</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="s2" checked={newReport.include_scope2} onCheckedChange={(c) => setNewReport({...newReport, include_scope2: c})} />
                                    <label htmlFor="s2" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Scope 2</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="s3" checked={newReport.include_scope3} onCheckedChange={(c) => setNewReport({...newReport, include_scope3: c})} />
                                    <label htmlFor="s3" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Scope 3</label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Detail Level</Label>
                            <Select value={newReport.detail_level} onValueChange={(v) => setNewReport({...newReport, detail_level: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Summary">Summary Only (Totals)</SelectItem>
                                    <SelectItem value="Detailed">Detailed (Category Breakdowns)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
                        <Button 
                            onClick={() => generateReportMutation.mutate(newReport)} 
                            disabled={generateReportMutation.isPending || !newReport.title}
                            className="bg-[#86b027] hover:bg-[#769c22] text-white"
                        >
                            {generateReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileCheck className="w-4 h-4 mr-2" />}
                            Generate Report
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Modal */}
            <Dialog open={!!viewReport} onOpenChange={(o) => !o && setViewReport(null)}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>{viewReport?.title}</DialogTitle>
                        <CardDescription>
                            {viewReport?.report_type} • {viewReport?.reporting_year} • {new Date(viewReport?.created_date).toLocaleDateString()}
                        </CardDescription>
                    </DialogHeader>
                    
                    {viewReport && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                    <div className="text-xs text-red-600 font-bold uppercase">Scope 1</div>
                                    <div className="text-xl font-bold text-red-900">
                                        {((viewReport.data_snapshot?.totals?.scope1 || 0)/1000).toFixed(1)} t
                                    </div>
                                </div>
                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                    <div className="text-xs text-yellow-600 font-bold uppercase">Scope 2</div>
                                    <div className="text-xl font-bold text-yellow-900">
                                        {((viewReport.data_snapshot?.totals?.scope2 || 0)/1000).toFixed(1)} t
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                                    <div className="text-xs text-slate-600 font-bold uppercase">Scope 3</div>
                                    <div className="text-xl font-bold text-slate-900">
                                        {((viewReport.data_snapshot?.totals?.scope3 || 0)/1000).toFixed(1)} t
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2 border border-slate-200">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Snapshot ID:</span>
                                    <span className="font-mono">{viewReport.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Generated By:</span>
                                    <span>{viewReport.generated_by || "System"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Detail Level:</span>
                                    <span>{viewReport.sections_config?.detail_level}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => handleExportPDF(viewReport)}>
                                    <Download className="w-4 h-4 mr-2" /> Export PDF
                                </Button>
                                {viewReport.status !== 'Finalized' && (
                                    <Button variant="default" onClick={() => {
                                        base44.entities.GHGReport.update(viewReport.id, { status: 'Finalized' });
                                        queryClient.invalidateQueries(['ghg-reports']);
                                        setViewReport(null);
                                        toast.success("Report Finalized");
                                    }}>
                                        Finalize
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}