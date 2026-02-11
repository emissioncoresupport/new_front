import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Package, FileCheck, Globe, QrCode, ShieldCheck, BarChart3, RefreshCcw, Recycle, Plus, Upload, Database, Shield, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DPPDashboard from '@/components/dpp/DPPDashboard';
import DPPProductRegistry from '@/components/dpp/DPPProductRegistry';
import DPPPublisher from '@/components/pcf/DPPPublisher';
import DPPCompliance from '@/components/dpp/DPPCompliance';
import DPPAnalytics from '@/components/dpp/DPPAnalytics';
import DPPLifecycleTracker from '@/components/dpp/DPPLifecycleTracker';
import WastePartnerManagement from '@/components/dpp/WastePartnerManagement';
import DPPCreationWizard from '@/components/dpp/DPPCreationWizard';
import ProductCreationModal from '@/components/dpp/ProductCreationModal';
import DPPEvidenceVault from '@/components/dpp/DPPEvidenceVault';
import DPPBlockchainTracker from '@/components/dpp/DPPBlockchainTracker';
import DPPCategoryTemplates from '@/components/dpp/DPPCategoryTemplates';
import DPPLCAIntegration from '@/components/dpp/DPPLCAIntegration';
import SupplyLensProductImporter from '@/components/dpp/SupplyLensProductImporter';
import DatasheetProductExtractor from '@/components/dpp/DatasheetProductExtractor';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DPPPage() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const initialTab = urlParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [showProductCreation, setShowProductCreation] = useState(false);
  const [showSupplyLensSelector, setShowSupplyLensSelector] = useState(false);
  const [showDatasheetUpload, setShowDatasheetUpload] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products-dpp'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus-dpp'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-dpp'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: supplierMappings = [] } = useQuery({
    queryKey: ['supplier-mappings-dpp'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const allProducts = [...products, ...skus];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white p-6 md:p-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-light mb-2">
            <Package className="w-3.5 h-3.5" />
            Digital Product Passport
          </div>
          <h1 className="text-4xl font-light text-slate-900 tracking-tight">DPP Management</h1>
          <p className="text-slate-500 font-light mt-1">EU Ecodesign for Sustainable Products Regulation (ESPR).</p>
        </div>
        <Button 
          onClick={() => setShowProductSelector(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 text-sm font-normal"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New DPP
        </Button>
      </div>

      <div className="relative z-10">
        <div className="relative bg-white/50 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/50 backdrop-blur-md border-b border-slate-200/60 rounded-none h-auto p-0 w-full justify-start">
            <TabsTrigger value="dashboard" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="registry" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Registry</span>
            </TabsTrigger>
            <TabsTrigger value="publisher" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Publisher</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="lifecycle" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Lifecycle</span>
            </TabsTrigger>
            <TabsTrigger value="partners" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Partners</span>
            </TabsTrigger>
            <TabsTrigger value="evidence" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Evidence</span>
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide">
              <span className="relative z-10">Blockchain</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-3 p-3">
            <DPPDashboard setActiveTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="registry" className="mt-3 p-3">
            <DPPProductRegistry />
          </TabsContent>

          <TabsContent value="publisher" className="mt-3 p-3">
            <DPPPublisher />
          </TabsContent>

          <TabsContent value="compliance" className="mt-3 p-3">
            <DPPCompliance />
          </TabsContent>

          <TabsContent value="analytics" className="mt-3 p-3">
            <DPPAnalytics />
          </TabsContent>

          <TabsContent value="lifecycle" className="mt-3 p-3">
            <DPPLifecycleTracker />
          </TabsContent>

          <TabsContent value="partners" className="mt-3 p-3">
            <WastePartnerManagement />
          </TabsContent>

          <TabsContent value="evidence" className="mt-3 p-3">
            <DPPEvidenceVault />
          </TabsContent>

          <TabsContent value="blockchain" className="mt-4 p-6">
            <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
              <div className="relative p-6">
                <h3 className="text-xl font-extralight text-slate-900 mb-1">DPP Blockchain Audit Trail</h3>
                <p className="text-sm text-slate-500 font-light mb-6">Select a DPP to view its immutable blockchain history</p>
                <p className="text-sm text-slate-400 font-light">Select a specific DPP from the Product Registry to view its blockchain trail</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>

        {/* Product Selector Modal */}
        <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
          <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-white/80 via-white/60 to-white/40 backdrop-blur-3xl border border-white/50 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-extralight text-xl tracking-tight">Select Product for DPP Creation</DialogTitle>
              <p className="text-sm text-slate-600 font-light">Choose a product from your inventory to create its Digital Product Passport</p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Button 
                  variant="outline"
                  className="w-full flex-col h-auto py-6 rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/20 hover:border-[#86b027]/30 group transition-all"
                  onClick={() => {
                    setShowProductSelector(false);
                    setShowProductCreation(true);
                  }}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center mb-2 group-hover:border-[#86b027]/30 transition-all">
                    <Plus className="w-5 h-5 text-slate-600 group-hover:text-[#86b027] transition-colors" />
                  </div>
                  <span className="text-xs font-light text-slate-700">Manual Entry</span>
                </Button>
                <Button 
                  variant="outline"
                  className="w-full flex-col h-auto py-6 rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/20 hover:border-[#86b027]/30 group transition-all"
                  onClick={() => {
                    setShowProductSelector(false);
                    setShowSupplyLensSelector(true);
                  }}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center mb-2 group-hover:border-[#86b027]/30 transition-all">
                    <Database className="w-5 h-5 text-slate-600 group-hover:text-[#86b027] transition-colors" />
                  </div>
                  <span className="text-xs font-light text-slate-700">From Supply Lens</span>
                </Button>
                <Button 
                  variant="outline"
                  className="w-full flex-col h-auto py-6 rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/20 hover:border-[#86b027]/30 group transition-all"
                  onClick={() => {
                    setShowProductSelector(false);
                    setShowDatasheetUpload(true);
                  }}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center mb-2 group-hover:border-[#86b027]/30 transition-all">
                    <Upload className="w-5 h-5 text-slate-600 group-hover:text-[#86b027] transition-colors" />
                  </div>
                  <span className="text-xs font-light text-slate-700">Upload Datasheet</span>
                </Button>
              </div>
              
              {allProducts.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-white/50 rounded-xl bg-white/20 backdrop-blur-sm">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-900 font-light">No products found</p>
                <p className="text-sm text-slate-600 font-light mt-2">Use one of the options above to create your first product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Or select existing product:</Label>
                <Select 
                  value={selectedProduct?.id} 
                  onValueChange={(id) => {
                    const product = allProducts.find(p => p.id === id);
                    setSelectedProduct(product);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{p.name}</span>
                            {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                          </div>
                          {p.sku && <span className="text-xs text-slate-400">SKU: {p.sku}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              )}
              
              {selectedProduct && (
                <div className="relative bg-gradient-to-br from-[#86b027]/10 via-[#86b027]/5 to-white/30 backdrop-blur-sm p-4 rounded-xl border border-[#86b027]/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent pointer-events-none"></div>
                  <div className="relative">
                  <h4 className="font-light text-slate-900 mb-3">Selected Product</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Name</span>
                      <p className="font-light text-slate-900 mt-0.5">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Category</span>
                      <p className="font-light text-slate-900 mt-0.5">{selectedProduct.category || 'Not set - will select in wizard'}</p>
                    </div>
                    {selectedProduct.sku && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-light">SKU</span>
                        <p className="font-light text-slate-900 mt-0.5">{selectedProduct.sku}</p>
                      </div>
                    )}
                    {selectedProduct.weight_kg && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Weight</span>
                        <p className="font-light text-slate-900 mt-0.5">{selectedProduct.weight_kg} kg</p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProductSelector(false)} className="rounded-xl border-white/50 backdrop-blur-sm hover:bg-white/10 font-light">Cancel</Button>
              <Button 
                onClick={() => {
                  if (selectedProduct) {
                    setShowProductSelector(false);
                    setShowCreationWizard(true);
                  }
                }}
                disabled={!selectedProduct}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 transition-all font-light"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Continue to DPP Creation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Creation Modal */}
        <ProductCreationModal 
          open={showProductCreation}
          onOpenChange={(open) => {
            setShowProductCreation(open);
            if (!open) setShowProductSelector(true);
          }}
          onProductCreated={(product) => {
            setSelectedProduct(product);
            setShowCreationWizard(true);
          }}
        />

        {/* Supply Lens Importer */}
        <SupplyLensProductImporter 
          open={showSupplyLensSelector}
          onOpenChange={(open) => {
            setShowSupplyLensSelector(open);
            if (!open) setShowProductSelector(true);
          }}
          onProductCreated={(product) => {
            setSelectedProduct(product);
            setShowCreationWizard(true);
          }}
        />

        {/* Datasheet Extractor */}
        <DatasheetProductExtractor 
          open={showDatasheetUpload}
          onOpenChange={(open) => {
            setShowDatasheetUpload(open);
            if (!open) setShowProductSelector(true);
          }}
          onProductCreated={(product) => {
            setSelectedProduct(product);
            setShowCreationWizard(true);
          }}
        />

        {/* DPP Creation Wizard */}
        {showCreationWizard && selectedProduct && (
          <DPPCreationWizard 
            open={showCreationWizard}
            onOpenChange={(open) => {
              setShowCreationWizard(open);
              if (!open) setSelectedProduct(null);
            }}
            product={selectedProduct}
          />
        )}
      </div>
    </div>
  );
}