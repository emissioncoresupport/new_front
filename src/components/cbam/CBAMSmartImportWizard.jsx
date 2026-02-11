import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Zap, Package, ArrowRight, Users, GripVertical, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isCBAMScope, getCBAMCategory, getDefaultBenchmark } from './constants.jsx';
import { getSupplyLensSuppliers, getSupplyLensSKUs, isEUCountry, linkCBAMToSupplyLens } from './services/SupplyLensIntegration';

export default function CBAMSmartImportWizard({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [formData, setFormData] = useState({
    cn_code: '',
    product_name: '',
    country_of_origin: '',
    quantity_tonnes: '',
    emissions_intensity: '',
    import_date: new Date().toISOString().split('T')[0],
    po_number: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  // Center modal on open
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const queryClient = useQueryClient();

  // Fetch suppliers from SupplyLens (system of record)
  const { data: suppliers = [], isLoading: loadingSuppliers, error: suppliersError } = useQuery({
    queryKey: ['supplylens-suppliers-non-eu'],
    queryFn: () => getSupplyLensSuppliers(true), // Only non-EU suppliers for CBAM
    staleTime: 60000
  });

  // Fetch SKUs for selected supplier from SupplyLens
  // Note: getSupplyLensSKUs filters by tenant_id (supplier reference in SKU table)
  const { data: allSKUs = [] } = useQuery({
    queryKey: ['supplylens-skus', selectedSupplier?.id],
    queryFn: () => selectedSupplier?.id ? getSupplyLensSKUs(selectedSupplier?.supplier_id || selectedSupplier?.id) : Promise.resolve([]),
    enabled: !!selectedSupplier?.id,
    staleTime: 60000
  });

  // Filter SKUs for CBAM scope
  const skus = allSKUs.filter(sku => 
    isCBAMScope(sku.hs_code || sku.cn_code)
  );

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders', selectedSupplier?.id],
    queryFn: () => base44.entities.PurchaseOrder.filter({ supplier_id: selectedSupplier?.id }),
    enabled: !!selectedSupplier?.id
  });

  const resetForm = () => {
    setStep(1);
    setSelectedSupplier(null);
    setSelectedSKU(null);
    setIsProcessing(false);
    setFormData({
      cn_code: '',
      product_name: '',
      country_of_origin: '',
      quantity_tonnes: '',
      emissions_intensity: '',
      import_date: new Date().toISOString().split('T')[0],
      po_number: ''
    });
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData(prev => ({
      ...prev,
      country_of_origin: supplier.country_code || supplier.country || ''
    }));
  };

  const handleSKUSelect = (sku) => {
    setSelectedSKU(sku);
    setFormData(prev => ({
      ...prev,
      product_name: sku.product_name || sku.sku_name || '',
      cn_code: sku.hs_code || sku.cn_code || ''
    }));
  };

  const handleSubmit = async () => {
    if (!selectedSupplier || !formData.cn_code || !formData.quantity_tonnes) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsProcessing(true);
    try {
      const quantity = parseFloat(formData.quantity_tonnes);
      const intensity = parseFloat(formData.emissions_intensity) || 
        getDefaultBenchmark(formData.cn_code, formData.country_of_origin, 2026);
      const totalEmissions = quantity * intensity;
      
      // Link CBAM entry to SupplyLens records (canonical IDs)
      const cbamData = linkCBAMToSupplyLens(
        {
          cn_code: formData.cn_code,
          product_name: formData.product_name,
          country_of_origin: formData.country_of_origin,
          quantity: quantity,
          direct_emissions_specific: intensity,
          indirect_emissions_specific: 0,
          total_embedded_emissions: totalEmissions,
          import_date: formData.import_date,
          po_reference: formData.po_number || undefined,
          calculation_method: formData.emissions_intensity ? 'actual_values' : 'default_values',
          data_quality_rating: formData.emissions_intensity ? 'high' : 'medium',
          validation_status: 'pending',
          source: 'Smart Import Wizard',
          reporting_period_year: new Date().getFullYear(),
          functional_unit: 'tonnes'
        },
        selectedSupplier,
        selectedSKU
      );
      
      await base44.entities.CBAMEmissionEntry.create(cbamData);
      
      // Send email to supplier requesting verification
      const supplierEmail = selectedSupplier.primary_contact_email;
      if (supplierEmail) {
        await base44.integrations.Core.SendEmail({
          to: supplierEmail,
          subject: 'CBAM Data Verification Request',
          body: `Dear ${selectedSupplier.legal_name},\n\nWe have recorded an import of ${formData.product_name} (CN: ${formData.cn_code}) and need you to verify the embedded emissions data.\n\nPlease log in to the supplier portal to provide verified emissions data.\n\nThank you for your cooperation.`
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success('✅ CBAM entry created and linked to SupplyLens');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating entry:', error);
      toast.error(`Error: ${error.message || 'Failed to create entry'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-300"
      >
        {/* Tesla Header with Drag Handle */}
        <div className="drag-handle flex items-center justify-between px-6 py-4 border-b border-slate-300 bg-white cursor-grab active:cursor-grabbing rounded-t-2xl">
          <div className="flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <Zap className="w-4 h-4 text-slate-900" />
            <h2 className="text-base font-light text-slate-900 tracking-tight">Smart Import</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100/80 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-6 py-5">

          {/* Step 1: Select Supplier */}
           {step === 1 && (
             <div className="space-y-4">
               <div className="bg-white p-4 rounded-xl border border-slate-300">
                 <Label className="text-sm font-light text-slate-900 mb-1 block">Step 1: Select Supplier (SupplyLens)</Label>
                 <p className="text-xs font-light text-slate-500">Choose the non-EU supplier for this import • Data synced from SupplyLens</p>
               </div>

               {suppliersError && (
                 <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/60 rounded-xl flex gap-3">
                   <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                   <p className="text-sm text-red-900">Error loading suppliers. Please try again.</p>
                 </div>
               )}

               {loadingSuppliers && (
                 <div className="p-8 text-center">
                   <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                   <p className="text-sm text-slate-500">Loading suppliers from SupplyLens...</p>
                 </div>
               )}

               {!loadingSuppliers && suppliers.length === 0 && (
                 <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-xl">
                   <p className="text-sm text-amber-900">
                     <strong>No non-EU suppliers found in SupplyLens.</strong> CBAM only applies to imports from outside the EU. Add suppliers in SupplyLens first.
                   </p>
                 </div>
               )}

              {!loadingSuppliers && suppliers.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {suppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      onClick={() => {
                        handleSupplierSelect(supplier);
                        setStep(2);
                      }}
                      className="group w-full p-4 bg-white border border-slate-300 rounded-xl hover:border-slate-900 hover:bg-slate-50/50 hover:shadow-lg transition-all text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{supplier.legal_name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{supplier.primary_contact_email}</p>
                          {supplier.country_code && (
                            <Badge variant="outline" className="mt-2 text-xs border-slate-300 bg-white text-slate-900">{supplier.country_code}</Badge>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select SKU */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-300">
                <Label className="text-sm font-medium text-slate-900 mb-1 block">Step 2: Select Product/SKU</Label>
                <p className="text-xs text-slate-500">
                  From <strong>{selectedSupplier?.legal_name || selectedSupplier?.trade_name}</strong>
                </p>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {skus.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl">
                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 mb-1 font-medium">No CBAM SKUs found</p>
                    <p className="text-xs text-slate-400 mb-4">Only Iron/Steel, Aluminium, Fertilizers shown</p>
                    <Button 
                      onClick={() => {
                        setSelectedSKU(null);
                        setStep(3);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                    >
                      Continue Without SKU
                    </Button>
                  </div>
                ) : (
                  skus.map((sku) => {
                    const cnCode = sku.hs_code || sku.cn_code;
                    const category = getCBAMCategory(cnCode);
                    return (
                      <button
                        key={sku.id}
                        onClick={() => {
                          handleSKUSelect(sku);
                          setStep(3);
                        }}
                        className="group w-full p-4 bg-white border border-slate-300 rounded-xl hover:border-slate-900 hover:bg-slate-50/50 hover:shadow-lg transition-all text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900">{sku.product_name || sku.sku_name || sku.supplier_sku}</h4>
                            <p className="text-xs text-slate-500 mt-1">SKU: {sku.supplier_sku || sku.internal_sku || 'N/A'}</p>
                            <div className="flex gap-2 mt-2">
                              {cnCode && (
                                <Badge variant="outline" className="bg-white text-slate-900 text-xs border-slate-300">CN: {cnCode}</Badge>
                              )}
                              {category && (
                                <Badge className="bg-slate-100 text-slate-900 border-slate-300 text-xs">{category}</Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200/50 justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-slate-300 hover:bg-slate-50">
                  Back
                </Button>
                {selectedSKU && (
                  <Button onClick={() => setStep(3)} className="bg-slate-900 hover:bg-slate-800 text-white">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Enter CBAM Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-300">
                <Label className="text-sm font-medium text-slate-900 mb-1 block">Step 3: Enter Import Details</Label>
                <p className="text-xs text-slate-500">
                  From: <strong>{selectedSupplier?.legal_name || selectedSupplier?.trade_name}</strong>
                  {selectedSKU && <> • <strong>{selectedSKU?.product_name}</strong></>}
                </p>
              </div>
              
              <div className="bg-white border border-slate-300 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold">CN Code *</Label>
                    <Input
                      value={formData.cn_code}
                      onChange={(e) => setFormData({...formData, cn_code: e.target.value})}
                      placeholder="e.g., 72031000"
                      className="mt-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Product Name *</Label>
                    <Input
                      value={formData.product_name}
                      onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                      placeholder="e.g., Steel Products"
                      className="mt-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Country of Origin</Label>
                    <Input
                      value={formData.country_of_origin}
                      onChange={(e) => setFormData({...formData, country_of_origin: e.target.value})}
                      placeholder="Auto-filled from supplier"
                      className="mt-1.5 bg-white"
                      disabled
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Quantity (tonnes) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.quantity_tonnes}
                      onChange={(e) => setFormData({...formData, quantity_tonnes: e.target.value})}
                      placeholder="e.g., 1000"
                      className="mt-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Emissions Intensity (tCO2/t)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.emissions_intensity}
                      onChange={(e) => setFormData({...formData, emissions_intensity: e.target.value})}
                      placeholder="Leave blank to request from supplier"
                      className="mt-1.5 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Import Date *</Label>
                    <Input
                      type="date"
                      value={formData.import_date}
                      onChange={(e) => setFormData({...formData, import_date: e.target.value})}
                      className="mt-1.5 bg-white"
                    />
                  </div>
                </div>

                {purchaseOrders.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold">Link to Purchase Order (optional)</Label>
                    <Select 
                      value={formData.po_number} 
                      onValueChange={(value) => setFormData({...formData, po_number: value})}
                    >
                      <SelectTrigger className="mt-1.5 bg-white">
                        <SelectValue placeholder="Select PO (optional)..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No PO</SelectItem>
                        {purchaseOrders.map(po => (
                          <SelectItem key={po.id} value={po.po_number || po.id}>
                            {po.po_number || `PO-${po.id.substring(0, 8)}`} - {po.total_amount ? `€${po.total_amount}` : 'No amount'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-700">
                    <strong className="text-slate-900">📧 Auto-Notification:</strong> Email sent to {selectedSupplier?.primary_contact_email} for data verification
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/50">
                <Button variant="outline" onClick={() => setStep(2)} className="border-slate-300 hover:bg-slate-50">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.cn_code || !formData.quantity_tonnes || isProcessing}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Create & Notify
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}