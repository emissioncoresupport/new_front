import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, FileCheck, Pencil, Trash2, Sparkles, UploadCloud, Loader2, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import ESRSDataPointModal from './ESRSDataPointModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ESRSDataCollection() {
  const [showModal, setShowModal] = useState(false);
  const [editingDataPoint, setEditingDataPoint] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const queryClient = useQueryClient();

  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const { data: materialTopics = [] } = useQuery({
    queryKey: ['csrd-materiality-topics'],
    queryFn: () => base44.entities.CSRDMaterialityTopic.list()
  });

  const esrsStandards = ['ESRS E1', 'ESRS E2', 'ESRS E3', 'ESRS E4', 'ESRS E5', 'ESRS S1', 'ESRS S2', 'ESRS S3', 'ESRS S4', 'ESRS G1'];

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CSRDDataPoint.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] });
      toast.success('Data point deleted');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CSRDDataPoint.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] });
      toast.success('Data point updated');
    }
  });

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingDoc(true);
    const loadingToast = toast.loading('🤖 AI analyzing document for ESG data...');
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an ESG data extraction expert. Analyze this document and extract ALL relevant CSRD/ESRS data points.
        
Extract:
- Quantitative metrics (emissions, energy, waste, water, workforce data, etc.)
- Match to ESRS standards (E1-E5, S1-S4, G1)
- Generate appropriate ESRS codes (e.g., ESRS E1-1, ESRS S1-6)
- Include units and verification status
- Extract narrative sections related to policies, processes, targets

Return a comprehensive JSON array of data points with: esrs_standard, esrs_code, metric_name, value, unit, data_source, verification_status, notes.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            data_points: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  esrs_standard: { type: "string" },
                  esrs_code: { type: "string" },
                  metric_name: { type: "string" },
                  value: { type: "number" },
                  unit: { type: "string" },
                  data_source: { type: "string" },
                  verification_status: { type: "string" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      const result = typeof response === 'string' ? JSON.parse(response) : response;
      
      let created = 0;
      for (const dp of result.data_points || []) {
        const existing = await base44.entities.CSRDDataPoint.filter({ 
          esrs_code: dp.esrs_code,
          reporting_year: new Date().getFullYear()
        });
        
        if (existing.length === 0) {
          await base44.entities.CSRDDataPoint.create({
            ...dp,
            reporting_year: new Date().getFullYear(),
            data_source: `Extracted from ${file.name}`
          });
          created++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] });
      toast.dismiss(loadingToast);
      toast.success(`✅ Extracted and created ${created} new data points!`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Document extraction failed: ' + error.message);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Filter data points
  const filteredDataPoints = dataPoints.filter(dp => {
    const matchesStandard = selectedStandard === 'all' || dp.esrs_standard === selectedStandard;
    const matchesSearch = searchQuery === '' || 
      dp.metric_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dp.esrs_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStandard && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extralight text-slate-900 mb-1">ESRS Data Collection</h2>
            <p className="text-sm text-slate-500 font-light">AI-powered extraction from documents + auto-collection + manual entry</p>
          </div>
          <div className="flex gap-3">
          <div className="relative">
            <input 
              type="file"
              id="doc-upload"
              className="hidden"
              onChange={handleDocumentUpload}
              accept=".pdf,.xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg"
              disabled={isUploadingDoc}
            />
            <Button 
              onClick={() => document.getElementById('doc-upload')?.click()}
              disabled={isUploadingDoc}
              variant="outline"
              className="border-[#02a1e8] text-[#02a1e8] hover:bg-[#02a1e8]/10"
            >
              {isUploadingDoc ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><UploadCloud className="w-4 h-4 mr-2" /> AI Extract from Document</>
              )}
            </Button>
          </div>
          <Button 
            onClick={async () => {
              const { autoCollectDataFromModules } = await import('./CSRDMaterialityService');
              const loadingToast = toast.loading('🤖 Auto-collecting data from modules...');
              
              try {
                let collected = 0;
                const materialTopics = await base44.entities.CSRDMaterialityTopic.filter({ is_material: true });
                
                for (const topic of materialTopics) {
                  const dataPoints = await autoCollectDataFromModules(topic.esrs_standard);
                  for (const dp of dataPoints) {
                    const existing = await base44.entities.CSRDDataPoint.filter({ esrs_code: dp.esrs_code });
                    if (existing.length === 0) {
                      await base44.entities.CSRDDataPoint.create({
                        ...dp,
                        esrs_standard: topic.esrs_standard,
                        reporting_year: new Date().getFullYear(),
                        data_source: 'Auto-collected',
                        verification_status: 'Internally Verified'
                      });
                      collected++;
                    }
                  }
                }
                
                queryClient.invalidateQueries({ queryKey: ['csrd-data-points'] });
                toast.dismiss(loadingToast);
                toast.success(`✅ ${collected} data points auto-collected!`);
              } catch (error) {
                toast.dismiss(loadingToast);
                toast.error('Auto-collection failed');
              }
            }}
            variant="outline"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-Collect from Modules
          </Button>
          <Button onClick={() => { setEditingDataPoint(null); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#769c22]">
            <Plus className="w-4 h-4 mr-2" />
            Add Manually
          </Button>
          </div>
          </div>
          </div>

      {/* Compact Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Total Data Points</p>
          <p className="text-4xl font-extralight text-slate-900">{dataPoints.length}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Verified</p>
          <p className="text-4xl font-extralight text-emerald-600">
            {dataPoints.filter(d => d.verification_status === 'Externally Assured' || d.verification_status === 'Internally Verified').length}
          </p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Material Topics</p>
          <p className="text-4xl font-extralight text-[#02a1e8]">{materialTopics.filter(t => t.is_material).length}</p>
        </div>
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Coverage</p>
          <p className="text-4xl font-extralight text-[#86b027]">
            {materialTopics.length > 0 ? Math.round((dataPoints.length / (materialTopics.filter(t => t.is_material).length * 15)) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by metric name or ESRS code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedStandard} onValueChange={setSelectedStandard}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by ESRS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ESRS Standards</SelectItem>
            {esrsStandards.map(std => (
              <SelectItem key={std} value={std}>{std}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Points Table */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-lg font-light text-slate-900 mb-6">Data Points ({filteredDataPoints.length})</h3>
          <div>
          {filteredDataPoints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ESRS</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDataPoints.map(dp => (
                  <TableRow key={dp.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {dp.esrs_standard}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {dp.esrs_code}
                    </TableCell>
                    <TableCell className="font-medium">{dp.metric_name}</TableCell>
                    <TableCell className="font-bold">{dp.value}</TableCell>
                    <TableCell className="text-slate-600">{dp.unit}</TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {dp.data_source || 'Manual'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        dp.verification_status === 'Externally Assured' ? 'bg-emerald-100 text-emerald-700' :
                        dp.verification_status === 'Internally Verified' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {dp.verification_status === 'Externally Assured' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {dp.verification_status || 'Unverified'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setEditingDataPoint(dp); setShowModal(true); }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            if (confirm('Delete this data point?')) {
                              deleteMutation.mutate(dp.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No data points found</p>
              <p className="text-sm">Upload a document, auto-collect from modules, or add manually</p>
            </div>
          )}
        </div>
        </div>
      </div>

      <ESRSDataPointModal 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingDataPoint(null);
        }} 
        dataPoint={editingDataPoint}
      />
    </div>
  );
}