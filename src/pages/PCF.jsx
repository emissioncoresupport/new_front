import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
    Leaf, Package, BarChart3, FileText, Plus, Search, 
    UploadCloud, RefreshCcw, Layers, Zap, Trash2, 
    ChevronRight, Edit2, ShieldCheck, Download, ExternalLink, Check,
    LayoutDashboard, List as ListIcon, Import, MessageSquare, Users, 
    Target, Grid3x3
} from "lucide-react";
import { toast } from "sonner";
import ProductList from '@/components/pcf/ProductList';
import ProductDetail from '@/components/pcf/ProductDetail';
import PCFDashboard from '@/components/pcf/PCFDashboard';
import PCFDataImporter from '@/components/pcf/PCFDataImporter';
import RFIInbox from '@/components/pcf/RFIInbox';
import CCFEvidenceVault from '@/components/ccf/CCFEvidenceVault';

import ISO14067ComplianceAudit from '@/components/pcf/ISO14067ComplianceAudit';
import ProductPrioritization from '@/components/pcf/ProductPrioritization';
import SharedComponentLibrary from '@/components/pcf/SharedComponentLibrary';
import ProductFamilyTemplates from '@/components/pcf/ProductFamilyTemplates';

export default function PCFPage() {
    // Initialize view from URL param or default to 'dashboard'
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view') || 'dashboard';
    
    const [view, setView] = useState(initialView); // 'dashboard', 'list', 'detail', 'import', 'rfi', 'evidence', 'portal'
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [productViewMode, setProductViewMode] = useState('grid'); // 'grid' or 'table'
    const [searchQuery, setSearchQuery] = useState('');

    // Update URL when view changes (optional but good for UX)
    React.useEffect(() => {
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.pushState({}, '', url);
    }, [view]);

    const handleProductClick = (id) => {
        setSelectedProductId(id);
        setView('detail');
    };

    const handleBack = () => {
        setSelectedProductId(null);
        setView('list');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 px-8 py-8">
            <div className="space-y-3 mt-16">
            {/* Header - Tesla Minimalistic */}
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
              <div className="relative px-8 py-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)] group-hover:scale-110 transition-transform">
                      <Package className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-extralight tracking-tight text-slate-900">Product Carbon Footprint</h1>
                      <p className="text-sm text-slate-500 font-light mt-0.5">ISO 14067 compliant product-level emissions</p>
                    </div>
                  </div>
                  {view === 'list' && (
                    <button 
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5"
                    >
                      <Plus className="w-4 h-4 stroke-[1.5]" />
                      Add New Product
                    </button>
                  )}
                </div>
              </div>
            </div>

            {view !== 'detail' && (
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                <Tabs value={view} onValueChange={setView}>
                    <TabsList className="relative bg-white/30 backdrop-blur-md border-b border-white/30 rounded-none h-auto p-0 w-full justify-start">
                        <TabsTrigger value="dashboard" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Dashboard</span>
                        </TabsTrigger>
                        <TabsTrigger value="list" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Products</span>
                        </TabsTrigger>
                        <TabsTrigger value="import" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Ingestion</span>
                        </TabsTrigger>
                        <TabsTrigger value="rfi" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">RFI</span>
                        </TabsTrigger>
                        <TabsTrigger value="evidence" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Evidence</span>
                        </TabsTrigger>
                        <TabsTrigger value="portal" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Portal</span>
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">ISO</span>
                        </TabsTrigger>
                        <TabsTrigger value="prioritization" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Priority</span>
                        </TabsTrigger>
                        <TabsTrigger value="library" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Library</span>
                        </TabsTrigger>
                        <TabsTrigger value="templates" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-[#86b027] data-[state=active]:bg-white/20 data-[state=active]:text-slate-900 hover:bg-white/10 px-8 py-4 text-base font-extralight text-slate-600 transition-all tracking-wide backdrop-blur-sm">
                            <span className="relative z-10">Templates</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="mt-0 p-6">
                        <PCFDashboard />
                    </TabsContent>

                    <TabsContent value="import" className="mt-0 p-6">
                        <PCFDataImporter />
                    </TabsContent>

                    <TabsContent value="rfi" className="mt-0 p-6">
                        <RFIInbox />
                    </TabsContent>

                    <TabsContent value="evidence" className="mt-0 p-6">
                        <CCFEvidenceVault />
                    </TabsContent>

                    <TabsContent value="portal" className="mt-0 p-6">
                        <div className="text-center py-12 text-slate-500">
                            <p>Portal functionality is managed through SupplierEngagement module.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="audit" className="mt-0 p-6">
                        <ISO14067ComplianceAudit />
                    </TabsContent>

                    <TabsContent value="prioritization" className="mt-0 p-6">
                        <ProductPrioritization />
                    </TabsContent>

                    <TabsContent value="library" className="mt-0 p-6">
                        <SharedComponentLibrary targetProductId={selectedProductId} />
                    </TabsContent>

                    <TabsContent value="templates" className="mt-0 p-6">
                        <ProductFamilyTemplates />
                    </TabsContent>

                    <TabsContent value="list" className="mt-0 p-6">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <Input 
                                    placeholder="Search products by name, SKU, description..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white/40 backdrop-blur-sm border-white/50 rounded-xl h-10"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white/30 backdrop-blur-md p-1 rounded-lg border border-white/30 shrink-0">
                                <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setProductViewMode('grid')}
                                    className={`h-8 ${productViewMode === 'grid' ? 'bg-white/60 backdrop-blur-xl shadow-sm' : 'hover:bg-white/20'}`}
                                >
                                    <Grid3x3 className="w-4 h-4 mr-1.5" />
                                    <span className="text-sm">Grid</span>
                                </Button>
                                <Button 
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setProductViewMode('table')}
                                    className={`h-8 ${productViewMode === 'table' ? 'bg-white/60 backdrop-blur-xl shadow-sm' : 'hover:bg-white/20'}`}
                                >
                                    <ListIcon className="w-4 h-4 mr-1.5" />
                                    <span className="text-sm">Table</span>
                                </Button>
                            </div>
                        </div>
                        <ProductList 
                            onCreate={() => setIsCreateOpen(true)} 
                            onProductClick={handleProductClick}
                            viewMode={productViewMode}
                            searchQuery={searchQuery}
                        />
                    </TabsContent>
                </Tabs>
            </div>
            )}

            {view === 'detail' && selectedProductId && (
                <div className="space-y-4">
                    <ProductDetail 
                        productId={selectedProductId} 
                        onBack={handleBack} 
                    />
                </div>
            )}

            <CreateProductModal 
                isOpen={isCreateOpen} 
                onClose={() => setIsCreateOpen(false)} 
                onSuccess={(id) => handleProductClick(id)}
            />
            </div>
        </div>
    );
}

function CreateProductModal({ isOpen, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        unit: "piece",
        quantity_amount: 1,
        system_boundary: "Cradle-to-Gate",
        sku: "",
        version: "1.0",
        category: "",
        supplier_id: "",
        facility_id: ""
    });
    const [importMode, setImportMode] = useState(false);
    const [selectedSupplyLensBOM, setSelectedSupplyLensBOM] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);

    const { data: facilities = [] } = useQuery({
        queryKey: ['facilities'],
        queryFn: () => base44.entities.Facility.list()
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () => base44.entities.Supplier.list()
    });

    const { data: skus = [] } = useQuery({
        queryKey: ['skus'],
        queryFn: () => base44.entities.SKU.list()
    });

    const { data: supplierSKUMappings = [] } = useQuery({
        queryKey: ['supplier-sku-mappings'],
        queryFn: () => base44.entities.SupplierSKUMapping.list()
    });

    const { data: supplyLensBOMs = [] } = useQuery({
        queryKey: ['supplylens-boms'],
        queryFn: async () => {
            const [boms, skuList, supplierMappings, parts] = await Promise.all([
                base44.entities.BillOfMaterials.list(),
                base44.entities.SKU.list(),
                base44.entities.SupplierSKUMapping.list(),
                base44.entities.Part.list()
            ]);
            
            const groups = {};
            boms.forEach(b => {
                if (!groups[b.parent_sku_id]) groups[b.parent_sku_id] = [];
                groups[b.parent_sku_id].push(b);
            });
            
            return Object.entries(groups).map(([skuId, bomItems]) => {
                const parentSKU = skuList.find(s => s.id === skuId);
                const primarySupplierMapping = supplierMappings.find(m => m.sku_id === skuId && m.is_primary_supplier);
                
                return {
                    id: skuId,
                    skuCode: parentSKU?.sku_code || 'Unknown',
                    name: parentSKU?.internal_name || parentSKU?.sku_code || `SKU-${skuId.substring(0, 8)}`,
                    description: parentSKU?.description,
                    unit: parentSKU?.unit_of_measure || 'piece',
                    category: parentSKU?.category,
                    itemCount: bomItems.length,
                    items: bomItems,
                    parentSKU: parentSKU,
                    primarySupplierId: primarySupplierMapping?.supplier_id,
                    totalMass: bomItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
                };
            });
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const product = await base44.entities.Product.create(data);
            
            if (importMode && selectedSupplyLensBOM) {
                const bomData = supplyLensBOMs.find(b => b.id === selectedSupplyLensBOM);
                if (bomData && bomData.items.length > 0) {
                    // Fetch Parts and SKUs to get proper names
                    const [parts, childSKUs] = await Promise.all([
                        base44.entities.Part.list(),
                        base44.entities.SKU.list()
                    ]);
                    
                    for (const bomLine of bomData.items) {
                        // Try to find the child component details
                        const childSKU = childSKUs.find(s => s.id === bomLine.child_sku_id);
                        const part = parts.find(p => p.id === bomLine.part_id);
                        
                        const componentName = childSKU?.internal_name || childSKU?.sku_code || part?.part_number || `Component-${bomLine.id.substring(0, 6)}`;
                        const componentDesc = childSKU?.description || part?.description;
                        const componentUnit = bomLine.unit || childSKU?.unit_of_measure || 'kg';
                        
                        await base44.entities.ProductComponent.create({
                            product_id: product.id,
                            name: componentName,
                            material_type: part?.material_category || childSKU?.category || "Material",
                            quantity: bomLine.quantity || 1,
                            unit: componentUnit,
                            lifecycle_stage: "Production",
                            node_type: "Component",
                            geographic_origin: "Global",
                            data_quality_rating: 2 // Default - needs emission factor assignment
                        });
                    }
                    toast.success(`Imported ${bomData.items.length} components from SupplyLens BOM`);
                }
            }
            return product;
        },
        onSuccess: (newProduct) => {
            queryClient.invalidateQueries(['products']);
            queryClient.invalidateQueries(['product-components']);
            setSelectedSupplyLensBOM("");
            setFormData({
                name: "",
                description: "",
                unit: "piece",
                quantity_amount: 1,
                system_boundary: "Cradle-to-Gate",
                sku: "",
                version: "1.0",
                category: "",
                supplier_id: "",
                facility_id: ""
            });
            onClose();
            onSuccess(newProduct.id);
        }
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadedFile(file);
        setIsAnalyzing(true);
        
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Simulate AI Extraction
            const prompt = `Extract product details from this ${file.name}. 
            Fields: Product Name, Description, SKU, Unit, Quantity, Version, Category.
            Return JSON.`;
            
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        sku: { type: "string" },
                        unit: { type: "string" },
                        version: { type: "string" },
                        category: { type: "string" }
                    }
                }
            });

            const extracted = typeof response === 'string' ? JSON.parse(response) : response;
            
            setFormData(prev => ({
                ...prev,
                name: extracted.name || prev.name,
                description: extracted.description || prev.description,
                sku: extracted.sku || prev.sku,
                unit: extracted.unit || prev.unit,
                version: extracted.version || prev.version,
                category: extracted.category || prev.category
            }));
            toast.success("AI extracted product details");
        } catch (err) {
            toast.error("Failed to analyze document");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 font-extralight text-2xl tracking-tight">Add New Product</DialogTitle>
                    <DialogDescription className="text-slate-600 font-light">
                        Manually enter details, import from SupplyLens, or upload a Product Data Sheet for AI extraction.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="manual" className="w-full" onValueChange={(v) => setImportMode(v === 'supplylens')}>
                    <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/30 backdrop-blur-md p-1 border border-white/30">
                        <TabsTrigger value="manual" className="data-[state=active]:bg-white/60 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm font-light rounded-lg">Manual / AI Upload</TabsTrigger>
                        <TabsTrigger value="supplylens" className="data-[state=active]:bg-white/60 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm font-light rounded-lg">Import from SupplyLens</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="supplylens" className="space-y-4 py-4">
                        <div className="relative bg-gradient-to-br from-blue-100/60 via-blue-50/40 to-white/30 backdrop-blur-3xl p-4 rounded-2xl border border-blue-200/50 shadow-[0_8px_32px_rgba(59,130,246,0.12)] overflow-hidden mb-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none"></div>
                            <div className="relative">
                            <p className="font-light text-blue-900 flex items-center gap-2"><Search className="w-4 h-4"/> SupplyLens Integration</p>
                            <p className="mt-1 text-sm font-light text-blue-700">Select an existing Bill of Materials from SupplyLens to automatically import components and product details.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Select SupplyLens BOM *</Label>
                            <Select value={selectedSupplyLensBOM} onValueChange={async (bomId) => {
                                setSelectedSupplyLensBOM(bomId);
                                
                                const bomData = supplyLensBOMs.find(b => b.id === bomId);
                                if (bomData) {
                                    // Get supplier details
                                    const supplier = bomData.primarySupplierId 
                                        ? suppliers.find(s => s.id === bomData.primarySupplierId)
                                        : null;
                                    
                                    // Get supplier's primary facility
                                    const supplierSites = supplier 
                                        ? await base44.entities.SupplierSite.filter({ supplier_id: supplier.id })
                                        : [];
                                    const primarySite = supplierSites.find(s => s.is_primary) || supplierSites[0];
                                    
                                    setFormData(prev => ({
                                        ...prev,
                                        name: bomData.name,
                                        description: bomData.description || `Manufactured product - ${bomData.name}`,
                                        sku: bomData.skuCode,
                                        unit: bomData.unit,
                                        quantity_amount: 1, // One finished product
                                        supplier_id: bomData.primarySupplierId || '',
                                        category: bomData.category || prev.category,
                                        manufacturer: supplier?.legal_name || '',
                                        manufacturing_country: primarySite?.country || supplier?.country || 'Global'
                                    }));
                                    
                                    toast.success(`Loaded BOM: ${bomData.itemCount} components from SupplyLens`);
                                }
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select a BOM from SupplyLens..." /></SelectTrigger>
                                <SelectContent>
                                    {supplyLensBOMs.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">
                                            No BOMs found in SupplyLens. Create BOMs first in the SupplyLens module.
                                        </div>
                                    ) : (
                                        supplyLensBOMs.map(bom => (
                                            <SelectItem key={bom.id} value={bom.id}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{bom.skuCode} - {bom.name}</span>
                                                    <span className="text-xs text-slate-500">{bom.itemCount} components • {bom.totalMass.toFixed(2)} total units</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedSupplyLensBOM && (
                            <Card className="bg-emerald-50 border-emerald-200">
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                        <Check className="w-4 h-4" /> 
                                        BOM Import Preview
                                    </div>
                                    <div className="text-xs space-y-1">
                                        {(() => {
                                            const bom = supplyLensBOMs.find(b => b.id === selectedSupplyLensBOM);
                                            const supplier = bom?.primarySupplierId ? suppliers.find(s => s.id === bom.primarySupplierId) : null;
                                            return (
                                                <>
                                                    <p><strong>SKU Code:</strong> {bom?.skuCode}</p>
                                                    <p><strong>Components:</strong> {bom?.itemCount} items will be imported</p>
                                                    <p><strong>Primary Supplier:</strong> {supplier?.legal_name || 'Not assigned'}</p>
                                                    <p><strong>Unit:</strong> {bom?.unit}</p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="manual" className="space-y-4 py-4">
                        <div className="relative bg-gradient-to-br from-slate-100/60 via-slate-50/40 to-white/30 backdrop-blur-3xl p-4 rounded-2xl border border-slate-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden mb-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-400/5 via-transparent to-transparent pointer-events-none"></div>
                            <div className="relative">
                            <p className="font-light text-slate-900">Manual Product Entry</p>
                            <p className="mt-1 text-xs font-light text-slate-600">Enter product details manually or upload a datasheet for AI extraction.</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-4">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <Label>Product Name *</Label>
                            <Input 
                                placeholder="Enter product name" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (0/250)</Label>
                            <Textarea 
                                placeholder="Enter product description..." 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="h-20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Unit *</Label>
                                <Select value={formData.unit} onValueChange={(v) => setFormData({...formData, unit: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="piece">Piece</SelectItem>
                                        <SelectItem value="kg">Kilogram</SelectItem>
                                        <SelectItem value="liter">Liter</SelectItem>
                                        <SelectItem value="meter">Meter</SelectItem>
                                        <SelectItem value="m2">Square Meter</SelectItem>
                                        <SelectItem value="m3">Cubic Meter</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input 
                                    type="number" 
                                    value={formData.quantity_amount}
                                    onChange={(e) => setFormData({...formData, quantity_amount: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Manufacturing Facility</Label>
                                <Select value={formData.facility_id} onValueChange={(v) => setFormData({...formData, facility_id: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select your facility..." /></SelectTrigger>
                                    <SelectContent>
                                        {facilities.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                No facilities found. Add facilities in CCF module first.
                                            </div>
                                        ) : (
                                            facilities.map(f => (
                                                <SelectItem key={f.id} value={f.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{f.name}</span>
                                                        <span className="text-xs text-slate-500">{f.city}, {f.country}</span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Primary Supplier</Label>
                                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({...formData, supplier_id: v})}>
                                    <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                No suppliers found. Add suppliers in SupplyLens first.
                                            </div>
                                        ) : (
                                            suppliers.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{s.legal_name}</span>
                                                        <span className="text-xs text-slate-500">{s.country} • {s.industry_sector || 'N/A'}</span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>System Boundary</Label>
                            <Select value={formData.system_boundary} onValueChange={(v) => setFormData({...formData, system_boundary: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cradle-to-Gate">Cradle-to-Gate</SelectItem>
                                    <SelectItem value="Cradle-to-Grave">Cradle-to-Grave</SelectItem>
                                    <SelectItem value="Gate-to-Gate">Gate-to-Gate</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SKU / Product Code</Label>
                                <Input 
                                    value={formData.sku}
                                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Version</Label>
                                <Input 
                                    value={formData.version}
                                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div 
                            className={`relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border-2 border-dashed rounded-2xl p-6 text-center h-full flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all ${
                                uploadedFile ? 'border-[#86b027]/50 bg-[#86b027]/5' : 'border-white/50 hover:border-[#86b027]/30'
                            }`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-[#86b027]', 'bg-[#86b027]/10');
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-[#86b027]', 'bg-[#86b027]/10');
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-[#86b027]', 'bg-[#86b027]/10');
                                const files = e.dataTransfer.files;
                                if (files.length > 0) {
                                    const fakeEvent = { target: { files } };
                                    handleFileUpload(fakeEvent);
                                }
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
                            <input 
                                type="file" 
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept=".pdf,.png,.jpg,.jpeg"
                            />
                            {isAnalyzing ? (
                                <div className="relative flex flex-col items-center text-[#86b027]">
                                    <RefreshCcw className="w-10 h-10 animate-spin mb-3" />
                                    <span className="font-light">AI Analyzing...</span>
                                </div>
                            ) : uploadedFile ? (
                                <div className="relative flex flex-col items-center text-slate-900">
                                    {uploadedFile.type === 'application/pdf' ? (
                                        <>
                                            <div className="w-full h-48 bg-slate-100 rounded-lg mb-3 overflow-hidden border border-slate-200">
                                                <iframe 
                                                    src={URL.createObjectURL(uploadedFile)} 
                                                    className="w-full h-full"
                                                    title="PDF Preview"
                                                />
                                            </div>
                                            <FileText className="w-6 h-6 mb-2 text-[#86b027]" />
                                        </>
                                    ) : (
                                        <FileText className="w-10 h-10 mb-3 text-[#86b027]" />
                                    )}
                                    <span className="font-light text-sm break-all">{uploadedFile.name}</span>
                                    <span className="text-xs text-slate-400 mt-1 font-light">Drag to replace or click</span>
                                </div>
                            ) : (
                                <div className="relative flex flex-col items-center text-slate-400 pointer-events-none">
                                    <UploadCloud className="w-12 h-12 mb-3" />
                                    <span className="font-light">Drag & Drop Data Sheet</span>
                                    <span className="text-xs mt-1 max-w-[150px] font-light">
                                        or click to browse • PDF, PNG, JPG
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-6 border-t border-white/30">
                    <Button variant="outline" onClick={onClose} className="rounded-xl backdrop-blur-sm border-white/50 hover:bg-white/10 font-light">Cancel</Button>
                    <Button 
                        onClick={() => createMutation.mutate(formData)} 
                        disabled={!formData.name || !formData.quantity_amount}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all font-light"
                    >
                        Create Product
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}