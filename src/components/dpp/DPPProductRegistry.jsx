import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Plus, Search, QrCode, Eye, Pencil, Trash2, Shield, FileText, Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DPPCreationWizard from './DPPCreationWizard';
import DPPDatasheetImporter from './DPPDatasheetImporter';
import DPPERPImporter from './DPPERPImporter';
import DPPBlockchainTracker from './DPPBlockchainTracker';

export default function DPPProductRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showDatasheetImporter, setShowDatasheetImporter] = useState(false);
  const [showERPImporter, setShowERPImporter] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDPP, setSelectedDPP] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: dppRecords = [] } = useQuery({
    queryKey: ['dpp-records'],
    queryFn: () => base44.entities.DPPRecord.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      toast.success('Product deleted');
      setDeletingProduct(null);
    }
  });

  const filtered = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductDPP = (productId) => {
    return dppRecords.find(d => d.product_id === productId);
  };

  const getStatusBadge = (dpp) => {
    if (!dpp) return <Badge variant="outline" className="text-slate-500">No DPP</Badge>;
    if (dpp.status === 'published') return <Badge className="bg-emerald-500">Published</Badge>;
    if (dpp.status === 'draft') return <Badge className="bg-amber-500">Draft</Badge>;
    if (dpp.status === 'updated') return <Badge className="bg-blue-500">Updated</Badge>;
    return <Badge variant="outline">Archived</Badge>;
  };

  const handleCreateDPP = (product) => {
    setSelectedProduct(product);
    setShowWizard(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowDatasheetImporter(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Import Datasheet
          </Button>
          <Button variant="outline" onClick={() => setShowERPImporter(true)}>
            <Database className="w-4 h-4 mr-2" />
            Import from ERP
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Total Products</p>
            <h3 className="text-2xl font-bold text-slate-900">{products.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 uppercase font-bold">With DPP</p>
            <h3 className="text-2xl font-bold text-emerald-600">{dppRecords.filter(d => d.status === 'published').length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase font-bold">Draft</p>
            <h3 className="text-2xl font-bold text-amber-600">{dppRecords.filter(d => d.status === 'draft').length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Pending</p>
            <h3 className="text-2xl font-bold text-slate-500">{products.length - dppRecords.length}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map(product => {
              const dpp = getProductDPP(product.id);
              return (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{product.name}</h4>
                      <div className="flex gap-2 text-sm text-slate-500 mt-1">
                        <span>SKU: {product.sku || 'N/A'}</span>
                        {product.category && <span>• {product.category}</span>}
                      </div>
                    </div>
                    {getStatusBadge(dpp)}
                  </div>
                  <div className="flex gap-2">
                    {dpp ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => window.open(dpp.publication_url, '_blank')}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCreateDPP(product)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => { setSelectedDPP(dpp); setShowBlockchain(true); }}
                          className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                        >
                          <Shield className="w-4 h-4 mr-1" />
                          Blockchain
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="bg-[#86b027] hover:bg-[#769c22]" onClick={() => handleCreateDPP(product)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Create DPP
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setDeletingProduct(product)}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DPPCreationWizard 
        open={showWizard} 
        onOpenChange={setShowWizard} 
        product={selectedProduct}
        existingDPP={selectedProduct ? getProductDPP(selectedProduct.id) : null}
      />

      <DPPDatasheetImporter 
        open={showDatasheetImporter}
        onOpenChange={setShowDatasheetImporter}
      />

      <DPPERPImporter
        open={showERPImporter}
        onOpenChange={setShowERPImporter}
      />

      {/* Blockchain Tracker Dialog */}
      <Dialog open={showBlockchain} onOpenChange={setShowBlockchain}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Blockchain Audit Trail - {selectedDPP?.general_info?.product_name}</DialogTitle>
          </DialogHeader>
          {selectedDPP && <DPPBlockchainTracker dppId={selectedDPP.dpp_id} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingProduct?.name}" and its associated DPP. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deletingProduct.id)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}