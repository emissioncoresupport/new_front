import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UploadCloud, FileSpreadsheet, Clock, Play, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function PCFDataImporter() {
    const [file, setFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newJob, setNewJob] = useState({ name: "", source_type: "CSV", schedule_type: "One-time" });
    const queryClient = useQueryClient();

    const { data: jobs = [] } = useQuery({
        queryKey: ['import-jobs'],
        queryFn: () => base44.entities.ImportJob.list()
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!file) return;
            setIsAnalyzing(true);
            try {
                // 1. Upload File
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                // 2. Extract & Analyze via AI
                const response = await base44.integrations.Core.InvokeLLM({
                    prompt: `Extract BOM data from this file URL: ${file_url}.
                    Map columns to: name, quantity, unit, material_type.
                    Return JSON array of components.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            components: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        name: { type: "string" },
                                        quantity: { type: "number" },
                                        unit: { type: "string" },
                                        material_type: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                const result = typeof response === 'string' ? JSON.parse(response) : response;
                
                // 3. Create Components (Mock - in real app would select product first)
                toast.success(`Analyzed ${result.components.length} rows. Ready to import.`);
                return result.components;
            } catch (e) {
                toast.error("Import Analysis Failed");
            } finally {
                setIsAnalyzing(false);
            }
        }
    });

    const createJobMutation = useMutation({
        mutationFn: (data) => base44.entities.ImportJob.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['import-jobs']);
            setNewJob({ name: "", source_type: "CSV", schedule_type: "One-time" });
            toast.success("Scheduled Job Created");
        }
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Data Ingestion Hub</h2>
                    <p className="text-slate-500">Automate BOM imports and manage data pipelines</p>
                </div>
            </div>

            <Tabs defaultValue="upload" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="upload">File Upload</TabsTrigger>
                    <TabsTrigger value="scheduled">Scheduled Jobs</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Import BOM from File</CardTitle>
                            <CardDescription>Upload CSV or Excel files. AI will auto-map columns.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:bg-slate-50 transition-colors">
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    id="file-upload"
                                    onChange={(e) => setFile(e.target.files[0])}
                                    accept=".csv,.xlsx,.xls"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                    <div className="p-4 bg-slate-100 rounded-full mb-4">
                                        <UploadCloud className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <span className="font-medium text-slate-700">{file ? file.name : "Click to upload or drag and drop"}</span>
                                    <span className="text-xs text-slate-400 mt-1">CSV, Excel (max 10MB)</span>
                                </label>
                            </div>

                            <div className="flex justify-end">
                                <Button 
                                    onClick={() => uploadMutation.mutate()} 
                                    disabled={!file || isAnalyzing}
                                    className="bg-[#86b027] hover:bg-[#769c22] text-white"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Process File
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="scheduled" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-1 h-fit">
                            <CardHeader>
                                <CardTitle>New Pipeline</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Job Name</Label>
                                    <Input 
                                        value={newJob.name}
                                        onChange={(e) => setNewJob({...newJob, name: e.target.value})}
                                        placeholder="e.g. Weekly ERP Sync" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Source</Label>
                                    <Select value={newJob.source_type} onValueChange={(v) => setNewJob({...newJob, source_type: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CSV">FTP / CSV</SelectItem>
                                            <SelectItem value="SupplyLens">SupplyLens Integration</SelectItem>
                                            <SelectItem value="ERP">ERP Connector</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Frequency</Label>
                                    <Select value={newJob.schedule_type} onValueChange={(v) => setNewJob({...newJob, schedule_type: v})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="One-time">One-time</SelectItem>
                                            <SelectItem value="Daily">Daily</SelectItem>
                                            <SelectItem value="Weekly">Weekly</SelectItem>
                                            <SelectItem value="Monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    className="w-full" 
                                    onClick={() => createJobMutation.mutate(newJob)}
                                    disabled={!newJob.name}
                                >
                                    Create Schedule
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Active Jobs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Schedule</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Run</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {jobs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                                                    No scheduled jobs found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            jobs.map(job => (
                                                <TableRow key={job.id}>
                                                    <TableCell className="font-medium">{job.name}</TableCell>
                                                    <TableCell>{job.source_type}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{job.schedule_type}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={job.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                                                            {job.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {job.last_run ? new Date(job.last_run).toLocaleDateString() : 'Never'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}