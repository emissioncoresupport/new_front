import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link as LinkIcon, Unlink, RefreshCw, AlertTriangle, CheckCircle2, 
  ArrowRight, Database, Search, Filter, Sparkles, AlertCircle, Settings
} from "lucide-react";
import { toast } from "sonner";
import SmartMappingAI from './SmartMappingAI';
import MappingConflictResolver from './MappingConflictResolver';

export default function SmartMappingHub({ suppliers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const [isRunningRules, setIsRunningRules] = useState(false);

  // Fetch External Records (Pending Import)
  const { data: externalRecords = [], isLoading: isLoadingExternal } = useQuery({
    queryKey: ['external-records'],
    queryFn: () => base44.entities.ExternalRecord.list()
  });

  // Fetch Data Mapping Suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['data-mapping-suggestions'],
    queryFn: () => base44.entities.DataMappingSuggestion.list()
  });

  // Fetch Existing Mappings
  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  // Fetch SKUs
  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const pendingExternalRecords = externalRecords.filter(r => r.status === 'pending');
  const mappedSkuIds = new Set(mappings.map(m => m.sku_id));
  
  // Mutation to create mapping
  const createMappingMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierSKUMapping.create(data),
    onSuccess: () => {
      toast.success("Mapping Created Successfully");
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
    }
  });

  // Mutation to delete mapping
  const deleteMappingMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplierSKUMapping.delete(id),
    onSuccess: () => {
      toast.success("Mapping Removed");
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
    }
  });

  // Mutation to create suggestion
  const createSuggestionMutation = useMutation({
    mutationFn: (data) => base44.entities.DataMappingSuggestion.create(data),
  });

  const handleGenerateDemoData = async () => {
    try {
      toast.loading("Generating sample external records...");
      await base44.entities.ExternalRecord.create({
        source_id: "ERP-SKU-9001",
        source_system: "SAP",
        record_type: "sku",
        raw_data: { name: "Steel Bearing X1", description: "High grade steel bearing, 50mm", material: "Steel" },
        status: "pending"
      });
      await base44.entities.ExternalRecord.create({
        source_id: "ERP-SKU-9002",
        source_system: "SAP",
        record_type: "sku",
        raw_data: { name: "Aluminium Sheet 2mm", description: "Alu Sheet, 2x2m", material: "Aluminium" },
        status: "pending"
      });
      await base44.entities.ExternalRecord.create({
        source_id: "ERP-SUP-55",
        source_system: "Oracle",
        record_type: "supplier",
        raw_data: { name: "Acme Metals Corp", country: "USA" },
        status: "pending"
      });
      queryClient.invalidateQueries({ queryKey: ['external-records'] });
      toast.dismiss();
      toast.success("Sample data generated!");
    } catch (e) {
      toast.error("Failed to generate data");
    }
  };

  const handleRunAutomatedRules = async () => {
    setIsRunningRules(true);
    try {
      let suggestionsCreated = 0;
      
      // Simple rule: Fuzzy match name
      for (const record of pendingExternalRecords) {
        let match = null;
        
        if (record.record_type === 'sku' || !record.record_type) { // Default to SKU if undefined
           // Try to match with internal SKUs
           const recordName = record.raw_data?.name || record.raw_data?.description || '';
           const recordCode = record.source_id;
           
           match = skus.find(s => 
             (s.sku_code && s.sku_code.toLowerCase() === recordCode.toLowerCase()) ||
             (s.description && recordName && s.description.toLowerCase().includes(recordName.toLowerCase()))
           );
           
           if (match) {
             await createSuggestionMutation.mutateAsync({
               external_record_id: record.id,
               suggested_entity_id: match.id,
               suggested_entity_type: 'SKU',
               confidence_score: 85,
               reasoning: `Matched based on code/name similarity: ${recordCode}`,
               status: 'pending'
             });
             suggestionsCreated++;
           }
        }
      }

      toast.success(`Auto-workflow complete. Generated ${suggestionsCreated} new suggestions.`);
      queryClient.invalidateQueries({ queryKey: ['data-mapping-suggestions'] });
      
    } catch (error) {
      console.error(error);
      toast.error("Failed to run automated rules");
    } finally {
      setIsRunningRules(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="dashboard" className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Smart Mapping Hub</h2>
            <p className="text-slate-500">Reconcile external data with internal entities</p>
          </div>
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <Database className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="ai-matching" className="gap-2">
              <Sparkles className="w-4 h-4" /> AI Matching
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="gap-2">
              <AlertCircle className="w-4 h-4" /> Conflicts
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="flex-1 space-y-6">
          {externalRecords.length === 0 && mappings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center p-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Database className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Smart Mapping Hub is Empty</h3>
              <p className="text-slate-500 max-w-md mt-2 mb-6">
                This hub reconciles data from external systems (like ERPs) with your internal records. 
                Connect an integration or import a file to see pending records here.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleGenerateDemoData}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Demo Data
                </Button>
                <Button onClick={() => document.getElementById('import-trigger')?.click()}>
                   Import File
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left: Overview & Unmapped */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    Data Health
                  </CardTitle>
                  <CardDescription>
                    Connectivity status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="text-xs font-bold text-emerald-600 uppercase">Mapped Records</p>
                      <p className="text-2xl font-bold text-emerald-800">{externalRecords.length - pendingExternalRecords.length}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-xs font-bold text-amber-600 uppercase">Pending Import</p>
                      <p className="text-2xl font-bold text-amber-800">{pendingExternalRecords.length}</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    onClick={handleRunAutomatedRules}
                    disabled={isRunningRules || pendingExternalRecords.length === 0}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRunningRules ? 'animate-spin' : ''}`} />
                    {isRunningRules ? 'Processing...' : 'Run Auto-Workflow'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm flex-1">
                <CardHeader>
                  <CardTitle className="text-md font-semibold text-slate-700">Pending External Records</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                  {pendingExternalRecords.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No pending records to map.</p>
                  ) : (
                    pendingExternalRecords.map(record => (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{record.source_system}</Badge>
                            <p className="text-sm font-medium text-slate-700 truncate">{record.source_id}</p>
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[200px] mt-1">
                            {record.raw_data?.description || record.raw_data?.name || 'No description'}
                          </p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right: Active Mappings Table */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm h-full flex flex-col">
                <CardHeader className="border-b border-slate-100 bg-white pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-bold text-slate-700">Active Mappings</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search mappings..."
                          className="pl-9 h-9 w-[200px]"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings
                        .filter(m => {
                          const sku = skus.find(s => s.id === m.sku_id);
                          const supplier = suppliers.find(s => s.id === m.supplier_id);
                          const term = searchTerm.toLowerCase();
                          return (
                            sku?.sku_code?.toLowerCase().includes(term) ||
                            supplier?.legal_name?.toLowerCase().includes(term)
                          );
                        })
                        .map(mapping => {
                          const sku = skus.find(s => s.id === mapping.sku_id);
                          const supplier = suppliers.find(s => s.id === mapping.supplier_id);
                          
                          return (
                            <TableRow key={mapping.id}>
                              <TableCell>
                                 <div className="font-medium text-slate-700">{sku?.sku_code || 'Unknown SKU'}</div>
                                 <div className="text-xs text-slate-400">{sku?.description}</div>
                              </TableCell>
                              <TableCell>
                                 <div className="font-medium text-slate-700">{supplier?.legal_name || 'Unknown Supplier'}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{mapping.relationship_type}</Badge>
                              </TableCell>
                              <TableCell>
                                {mapping.mapping_confidence > 80 ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">{mapping.mapping_confidence}%</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">{mapping.mapping_confidence}%</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => deleteMappingMutation.mutate(mapping.id)}
                                >
                                  <Unlink className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="ai-matching" className="flex-1 overflow-y-auto">
          <SmartMappingAI />
        </TabsContent>

        <TabsContent value="conflicts" className="flex-1 overflow-y-auto">
          <MappingConflictResolver />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MappingDialog({ sku, suppliers, onMap }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [type, setType] = useState('manufacturer');

  const handleMap = () => {
    if (!selectedSupplier) return;
    onMap({
      sku_id: sku.id,
      supplier_id: selectedSupplier,
      relationship_type: type,
      mapping_confidence: 100,
      source_system: 'manual_override',
      is_primary_supplier: true
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="h-7 px-2 text-indigo-600" onClick={() => setIsOpen(!isOpen)}>
        <LinkIcon className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-[300px] bg-white rounded-lg shadow-xl border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-200">
            <h4 className="font-semibold text-sm mb-3">Map {sku.sku_code}</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Supplier</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-500">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="raw_material_supplier">Raw Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8" onClick={handleMap}>
                Confirm Mapping
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}