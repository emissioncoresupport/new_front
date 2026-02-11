import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Network, Layers, Box, Plus, ArrowRight, ChevronRight, 
  ChevronDown, FileInput, Paperclip, FilePlus, RefreshCw, Upload,
  Globe, MoreVertical, Search, Presentation, Leaf, Lock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MarketIntelligenceModal from "./MarketIntelligenceModal";
import BOMScenarioSimulator from "./BOMScenarioSimulator";
import { toast } from "sonner";
import BOMImportModal from "./BOMImportModal";
import BOMAIAnalysisPanel from "./BOMAIAnalysisPanel";
import { calculateAggregatedPCF, checkSustainabilityCompliance } from './SustainabilityEngine';

// Recursively render BOM Tree
const BOMNode = ({ sku, bomData, skus, suppliers, level = 0, onRequestData, onMarketIntel, viewMode, ancestors = new Set() }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Cycle detection for rendering
  const isCycle = ancestors.has(sku.id);
  const nextAncestors = new Set(ancestors).add(sku.id);

  // Find children
  const childrenLinks = isCycle ? [] : bomData.filter(link => link.parent_sku_id === sku.id);
  
  return (
    <div className="select-none">
      <div 
        className={`
          flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-slate-50
          ${level === 0 ? 'bg-white border-slate-200 shadow-sm mb-2' : 'bg-transparent border-transparent border-l-slate-200 ml-4'}
        `}
      >
        <div className="flex items-center gap-2 flex-1">
          {childrenLinks.length > 0 ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-slate-200 rounded">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
          ) : (
             <span className="w-6" /> // Spacer
          )}
          
          <div className={`p-2 rounded-md ${level === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            <Box className="w-4 h-4" />
          </div>
          
          <div>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              {sku.sku_code}
              {level === 0 && <Badge className="bg-indigo-600 hover:bg-indigo-700">End Product</Badge>}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{sku.description}</span>
              {level > 0 && (
                 <>
                   <span className="text-slate-300">|</span>
                   {(() => {
                     const link = bomData.find(l => l.child_sku_id === sku.id);
                     return link?.cost_per_unit ? (
                       <span className="font-medium text-slate-700">${link.cost_per_unit}</span>
                     ) : null;
                   })()}
                   {(() => {
                     const link = bomData.find(l => l.child_sku_id === sku.id);
                     return link?.lead_time_days ? (
                       <span className="text-slate-400">({link.lead_time_days}d)</span>
                     ) : null;
                   })()}
                 </>
              )}
            </div>
            
            {viewMode === 'sustainability' && (
               <div className="mt-1 flex items-center gap-2">
                  {sku.pcf_co2e > 0 && (
                    <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">
                       <Leaf className="w-3 h-3 mr-1" /> {sku.pcf_co2e} kgCO2e
                    </Badge>
                  )}
                  {sku.lca_stage === 'epd_verified' && (
                    <Badge variant="outline" className="text-[10px] border-blue-200 bg-blue-50 text-blue-700">
                       EPD Verified
                    </Badge>
                  )}
               </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quantity Badge if child */}
          {level > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              x{bomData.find(l => l.child_sku_id === sku.id)?.quantity || 1}
            </Badge>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Smart Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onMarketIntel(sku)}>
                <Globe className="mr-2 h-4 w-4 text-blue-500" />
                Market Intelligence
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMarketIntel(sku)}>
                <Search className="mr-2 h-4 w-4 text-purple-500" />
                Find Alternates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRequestData(sku, 'certificate')}>
                <FilePlus className="mr-2 h-4 w-4 text-indigo-500" />
                Request Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRequestData(sku, 'pcf')}>
                <Leaf className="mr-2 h-4 w-4 text-emerald-500" />
                Request Carbon Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRequestData(sku, 'epd')}>
                <Lock className="mr-2 h-4 w-4 text-blue-500" />
                Request EPD
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && childrenLinks.length > 0 && (
        <div className="border-l border-dashed border-slate-300 ml-6 pl-2 mt-1 space-y-1">
          {childrenLinks.map(link => {
            const childSku = skus.find(s => s.id === link.child_sku_id);
            if (!childSku) return null;
            return (
              <BOMNode 
                key={link.id} 
                sku={childSku} 
                bomData={bomData} 
                skus={skus} 
                suppliers={suppliers}
                level={level + 1}
                onRequestData={onRequestData}
                onMarketIntel={onMarketIntel}
                viewMode={viewMode}
                ancestors={nextAncestors}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function ProductBOMExplorer({ suppliers }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestDialogSku, setRequestDialogSku] = useState(null);
  const [requestType, setRequestType] = useState('certificate');
  const [marketIntelSku, setMarketIntelSku] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [viewMode, setViewMode] = useState('standard');
  const queryClient = useQueryClient();

  // Fetch SKUs
  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  // Fetch BOM Links
  const { data: bomLinks = [] } = useQuery({
    queryKey: ['bom-links'],
    queryFn: () => base44.entities.BillOfMaterials.list()
  });

  // Identify "Top Level" products (SKUs that are parents but never children, or explicitly marked)
  // We filter for Finished Goods OR SKUs that are already parents in a BOM
  const parentIds = new Set(bomLinks.map(l => l.parent_sku_id));
  const products = skus.filter(s => 
    s.category === 'Finished Good' || parentIds.has(s.id)
  );

  const createRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.DataRequest.create(data),
    onSuccess: () => {
      toast.success("Data Request Sent Successfully");
      setRequestDialogSku(null);
    }
  });

  const handleCreateRequest = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createRequestMutation.mutate({
      title: formData.get('title'),
      supplier_id: formData.get('supplier_id'),
      sku_id: requestDialogSku.id,
      request_type: formData.get('request_type'),
      description: formData.get('description'),
      due_date: formData.get('due_date'),
      status: 'requested'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left: Product List */}
      <Card className="lg:col-span-1 border-slate-100 shadow-sm rounded-2xl flex flex-col h-full overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-[#F5F7F8]">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold text-[#545454]">Products</CardTitle>
            <div className="flex gap-2">
               <Button 
                 size="icon" 
                 variant="ghost" 
                 className="h-8 w-8 text-slate-400 hover:text-[#02a1e8]"
                 onClick={() => {
                   queryClient.invalidateQueries({ queryKey: ['skus'] });
                   queryClient.invalidateQueries({ queryKey: ['bom-links'] });
                 }}
               >
                 <RefreshCw className="w-4 h-4" />
               </Button>
               <Button size="sm" variant="outline" onClick={() => setShowSimulator(true)} disabled={!selectedProduct} className="text-[#02a1e8] border-[#02a1e8]/30 hover:bg-[#02a1e8]/10 text-xs h-8">
                 <Presentation className="w-3 h-3 mr-2" />
                 Simulate
               </Button>
               <Button size="sm" variant="outline" onClick={() => setShowImportModal(true)} className="text-[#86b027] border-[#86b027]/30 hover:bg-[#86b027]/10 text-xs h-8">
                 <Upload className="w-3 h-3 mr-2" /> 
                 Import
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {products.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No products with BOM structure found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {products.map(prod => (
                <div 
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className={`p-5 cursor-pointer hover:bg-[#F5F7F8] transition-all border-l-4 ${selectedProduct?.id === prod.id ? 'bg-[#F5F7F8] border-[#86b027]' : 'border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-[#545454] text-sm">{prod.sku_code}</span>
                    <Badge variant="secondary" className="text-[10px] bg-[#02a1e8]/10 text-[#02a1e8] border-0 font-bold px-2">Finished Good</Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">{prod.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                    <Layers className="w-3 h-3" />
                    <span>{bomLinks.filter(l => l.parent_sku_id === prod.id).length} Components</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Center: BOM Visualization */}
      <Card className="lg:col-span-1 border-slate-100 shadow-sm rounded-2xl flex flex-col h-full overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white pb-0">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg font-bold text-[#545454] flex items-center gap-2">
              <Network className="w-5 h-5 text-[#86b027]" />
              Structure
              {selectedProduct && <span className="text-slate-400 font-medium text-sm ml-2">/ {selectedProduct.sku_code}</span>}
            </CardTitle>
          </div>
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-slate-100/50 mb-2">
              <TabsTrigger value="standard" className="text-xs">Standard View</TabsTrigger>
              <TabsTrigger value="sustainability" className="text-xs data-[state=active]:text-emerald-700 data-[state=active]:bg-emerald-50">
                 <Leaf className="w-3 h-3 mr-2" /> Sustainability
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 bg-[#F5F7F8]/50">
          {selectedProduct ? (
            <BOMNode 
              sku={selectedProduct}
              bomData={bomLinks}
              skus={skus}
              suppliers={suppliers}
              onRequestData={(sku, type) => {
                  setRequestDialogSku(sku);
                  if (type) setRequestType(type);
              }}
              onMarketIntel={setMarketIntelSku}
              viewMode={viewMode}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Network className="w-20 h-20 mb-4 opacity-10" />
              <p className="text-sm font-medium">Select a product to view structure</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: AI & Sustainability Analysis */}
      <div className="lg:col-span-1 h-full flex flex-col gap-4 overflow-y-auto">
         {viewMode === 'sustainability' && selectedProduct && (
           <Card className="border-emerald-100 bg-emerald-50/30 shadow-sm">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                 <Leaf className="w-4 h-4" /> Lifecycle Impact (LCA)
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               {(() => {
                  const impact = calculateAggregatedPCF(selectedProduct.id, bomLinks, skus);
                  return (
                    <>
                      <div className="flex items-end justify-between">
                         <div>
                           <p className="text-xs text-slate-500 uppercase font-bold">Total Carbon Footprint</p>
                           <p className="text-2xl font-extrabold text-slate-800 mt-1">
                             {impact.total_co2e} <span className="text-sm font-normal text-slate-500">kgCO2e</span>
                           </p>
                         </div>
                         <Badge variant={impact.coverage_percent > 80 ? 'default' : 'secondary'} className={impact.coverage_percent > 80 ? 'bg-emerald-600' : ''}>
                            {impact.coverage_percent}% Data Coverage
                         </Badge>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-800">Compliance Readiness (CSRD/CSDDD)</p>
                        <div className="grid grid-cols-2 gap-2">
                           {checkSustainabilityCompliance(selectedProduct).map((check, i) => (
                             <div key={i} className={`p-2 rounded border text-xs flex items-center gap-2 ${check.status === 'pass' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-rose-200 text-rose-700'}`}>
                                {check.status === 'pass' ? <Lock className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                                {check.label}
                             </div>
                           ))}
                        </div>
                      </div>

                      {impact.missing_data_skus.length > 0 && (
                        <div className="pt-2">
                           <p className="text-xs text-slate-500 mb-1">Missing Data Gaps:</p>
                           <div className="flex flex-wrap gap-1">
                             {impact.missing_data_skus.slice(0, 3).map((s, i) => (
                               <Badge key={i} variant="outline" className="text-[10px] border-dashed border-slate-300 text-slate-500">
                                 {s.sku.sku_code}
                               </Badge>
                             ))}
                             {impact.missing_data_skus.length > 3 && (
                               <span className="text-[10px] text-slate-400">+{impact.missing_data_skus.length - 3} more</span>
                             )}
                           </div>
                        </div>
                      )}
                    </>
                  );
               })()}
             </CardContent>
           </Card>
         )}
      
        <BOMAIAnalysisPanel 
          product={selectedProduct} 
          bomData={bomLinks} 
          skus={skus}
          suppliers={suppliers}
        />
      </div>

      {/* Data Request Dialog */}
      <Dialog open={!!requestDialogSku} onOpenChange={(open) => !open && setRequestDialogSku(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Compliance Data</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4 py-2">
            <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between mb-2">
               <span className="text-sm font-medium text-slate-600">Target Component:</span>
               <Badge variant="outline" className="bg-white">{requestDialogSku?.sku_code}</Badge>
            </div>
            
            <div className="space-y-2">
              <Label>Request Title</Label>
              <Input name="title" placeholder="e.g. 2025 Carbon Footprint Report" defaultValue={requestType === 'epd' ? `EPD Request for ${requestDialogSku?.sku_code}` : ''} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select name="supplier_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select name="request_type" defaultValue={requestType === 'epd' ? 'certificate' : requestType === 'pcf' ? 'carbon_footprint' : 'certificate'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certificate">Certificate (EPD/ISO)</SelectItem>
                    <SelectItem value="test_report">Test Report</SelectItem>
                    <SelectItem value="carbon_footprint">Carbon Footprint (PCF)</SelectItem>
                    <SelectItem value="traceability">Traceability Info</SelectItem>
                    <SelectItem value="material_declaration">Material Declaration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instructions</Label>
              <Textarea name="description" placeholder="Please upload the valid ISO certificate..." defaultValue={requestType === 'epd' ? 'Please upload the Environmental Product Declaration (EPD) according to ISO 14025.' : ''} />
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" name="due_date" required />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BOMImportModal open={showImportModal} onOpenChange={setShowImportModal} />
      <MarketIntelligenceModal 
        sku={marketIntelSku} 
        open={!!marketIntelSku} 
        onOpenChange={(open) => !open && setMarketIntelSku(null)} 
      />
      <BOMScenarioSimulator 
        open={showSimulator}
        onOpenChange={setShowSimulator}
        product={selectedProduct}
        bomData={bomLinks}
        skus={skus}
      />
    </div>
  );
}