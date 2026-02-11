import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Package, ChevronRight, Check, MapPin, Factory, Satellite } from "lucide-react";

export default function EUDRBatchCreationWizard({ open, onOpenChange }) {
  const [step, setStep] = useState(0);
  const [batchData, setBatchData] = useState({
    batch_id: `BATCH-${Date.now()}`,
    product_sku: '',
    commodity_type: '',
    quantity: '',
    unit: 'tons',
    harvest_date: '',
    tier_1_suppliers: [],
    tier_2_suppliers: [],
    tier_3_suppliers: []
  });
  const [selectedTier1, setSelectedTier1] = useState([]);
  const [selectedTier2, setSelectedTier2] = useState([]);
  const [selectedTier3, setSelectedTier3] = useState([]);

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-batch'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: plots = [] } = useQuery({
    queryKey: ['plots-batch'],
    queryFn: () => base44.entities.EUDRPlot.list()
  });

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      const batch = await base44.entities.EUDRBatch.create({
        ...batchData,
        tier_1_suppliers: selectedTier1,
        tier_2_suppliers: selectedTier2,
        tier_3_suppliers: selectedTier3,
        total_plots: 0,
        verified_plots: 0,
        flagged_plots: 0
      });

      // Create traceability links
      const allLinks = [];

      // Tier 1
      for (const supplierId of selectedTier1) {
        allLinks.push({
          link_id: `LINK-${Date.now()}-${Math.random()}`,
          batch_id: batch.id,
          tier_level: 1,
          supplier_id: supplierId,
          quantity_sourced: batchData.quantity / selectedTier1.length,
          percentage_of_batch: 100 / selectedTier1.length
        });
      }

      // Tier 2
      for (const supplierId of selectedTier2) {
        allLinks.push({
          link_id: `LINK-${Date.now()}-${Math.random()}`,
          batch_id: batch.id,
          tier_level: 2,
          supplier_id: supplierId,
          quantity_sourced: batchData.quantity / (selectedTier2.length || 1),
          percentage_of_batch: 100 / (selectedTier2.length || 1)
        });
      }

      // Tier 3 (with plots)
      for (const supplierId of selectedTier3) {
        const supplierPlots = plots.filter(p => 
          suppliers.find(s => s.id === supplierId)?.country === p.country_iso
        );

        allLinks.push({
          link_id: `LINK-${Date.now()}-${Math.random()}`,
          batch_id: batch.id,
          tier_level: 3,
          supplier_id: supplierId,
          plot_ids: supplierPlots.map(p => p.plot_id),
          quantity_sourced: batchData.quantity / (selectedTier3.length || 1),
          percentage_of_batch: 100 / (selectedTier3.length || 1),
          geolocation_verified: supplierPlots.length > 0
        });
      }

      await base44.entities.EUDRTraceabilityLink.bulkCreate(allLinks);

      return batch;
    },
    onSuccess: () => {
      toast.success('Batch created successfully!');
      queryClient.invalidateQueries(['eudr-batches']);
      queryClient.invalidateQueries(['eudr-traceability-links']);
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create batch');
    }
  });

  const resetForm = () => {
    setStep(0);
    setBatchData({
      batch_id: `BATCH-${Date.now()}`,
      product_sku: '',
      commodity_type: '',
      quantity: '',
      unit: 'tons',
      harvest_date: '',
      tier_1_suppliers: [],
      tier_2_suppliers: [],
      tier_3_suppliers: []
    });
    setSelectedTier1([]);
    setSelectedTier2([]);
    setSelectedTier3([]);
  };

  const steps = [
    { id: 0, name: 'Batch Info', icon: Package },
    { id: 1, name: 'Tier 1', icon: Factory },
    { id: 2, name: 'Tier 2', icon: Factory },
    { id: 3, name: 'Tier 3', icon: MapPin },
    { id: 4, name: 'Review', icon: Check }
  ];

  const SupplierSelector = ({ selected, onSelect, tierLabel }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{tierLabel} Suppliers</Label>
        <Badge variant="outline">{selected.length} selected</Badge>
      </div>
      <div className="max-h-[300px] overflow-y-auto border rounded-lg p-3 space-y-2">
        {suppliers.map(supplier => (
          <div
            key={supplier.id}
            onClick={() => {
              if (selected.includes(supplier.id)) {
                onSelect(selected.filter(id => id !== supplier.id));
              } else {
                onSelect([...selected, supplier.id]);
              }
            }}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selected.includes(supplier.id)
                ? 'bg-[#86b027]/10 border-[#86b027]'
                : 'bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{supplier.legal_name}</div>
                <div className="text-xs text-slate-500">📍 {supplier.country}</div>
              </div>
              {selected.includes(supplier.id) && (
                <Check className="w-5 h-5 text-[#86b027]" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Traceable Batch</DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === idx;
            const isCompleted = step > idx;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex flex-col items-center gap-2 ${idx < steps.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted ? 'bg-emerald-500 border-emerald-500' :
                    isActive ? 'bg-[#86b027] border-[#86b027]' : 'bg-white border-slate-300'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5 text-white" /> : <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-[#86b027]' : 'text-slate-500'}`}>{s.name}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Batch Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch ID</Label>
                  <Input value={batchData.batch_id} readOnly className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>Product SKU</Label>
                  <Input 
                    value={batchData.product_sku}
                    onChange={(e) => setBatchData({...batchData, product_sku: e.target.value})}
                    placeholder="Enter product SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commodity Type</Label>
                  <Select value={batchData.commodity_type} onValueChange={(v) => setBatchData({...batchData, commodity_type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select commodity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cattle">Cattle</SelectItem>
                      <SelectItem value="Cocoa">Cocoa</SelectItem>
                      <SelectItem value="Coffee">Coffee</SelectItem>
                      <SelectItem value="Palm Oil">Palm Oil</SelectItem>
                      <SelectItem value="Rubber">Rubber</SelectItem>
                      <SelectItem value="Soy">Soy</SelectItem>
                      <SelectItem value="Wood">Wood</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Harvest Date</Label>
                  <Input 
                    type="date"
                    value={batchData.harvest_date}
                    onChange={(e) => setBatchData({...batchData, harvest_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number"
                    value={batchData.quantity}
                    onChange={(e) => setBatchData({...batchData, quantity: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={batchData.unit} onValueChange={(v) => setBatchData({...batchData, unit: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tons">Tons</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Tier 1: Direct Suppliers</h3>
              <p className="text-sm text-slate-600">Select your direct suppliers (importers/traders)</p>
              <SupplierSelector 
                selected={selectedTier1}
                onSelect={setSelectedTier1}
                tierLabel="Tier 1"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Tier 2: Processors/Aggregators</h3>
              <p className="text-sm text-slate-600">Select intermediate processors (optional)</p>
              <SupplierSelector 
                selected={selectedTier2}
                onSelect={setSelectedTier2}
                tierLabel="Tier 2"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Tier 3: Origin Suppliers</h3>
              <p className="text-sm text-slate-600">Select farmers/plantations at origin</p>
              <SupplierSelector 
                selected={selectedTier3}
                onSelect={setSelectedTier3}
                tierLabel="Tier 3"
              />
              {selectedTier3.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  ℹ️ Plot data will be automatically linked based on supplier location
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Review Batch Configuration</h3>
              <div className="bg-slate-50 p-6 rounded-lg border space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Batch ID:</span>
                  <span className="font-bold">{batchData.batch_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Product SKU:</span>
                  <span className="font-bold">{batchData.product_sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Commodity:</span>
                  <span className="font-bold">{batchData.commodity_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Quantity:</span>
                  <span className="font-bold">{batchData.quantity} {batchData.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tier 1 Suppliers:</span>
                  <span className="font-bold">{selectedTier1.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tier 2 Suppliers:</span>
                  <span className="font-bold">{selectedTier2.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tier 3 Suppliers:</span>
                  <span className="font-bold">{selectedTier3.length}</span>
                </div>
              </div>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-900">
                  After creation, run AI traceability analysis to assess risk and verify satellite coverage.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Navigation */}
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button 
              className="bg-[#86b027] hover:bg-[#769c22]"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && (!batchData.product_sku || !batchData.commodity_type || !batchData.quantity)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => createBatchMutation.mutate()}
              disabled={createBatchMutation.isPending || selectedTier1.length === 0}
            >
              Create Batch
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}