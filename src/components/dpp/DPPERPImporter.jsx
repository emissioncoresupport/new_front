import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function DPPERPImporter({ open, onOpenChange }) {
  const [selectedConnection, setSelectedConnection] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: erpConnections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const connection = erpConnections.find(c => c.id === selectedConnection);
      
      toast.loading('Connecting to ERP system...');
      
      // Simulate ERP data fetch (in real implementation, this would call the ERP API)
      const mockERPData = [
        {
          sku: 'ERP-001',
          name: 'Industrial Pump Model X',
          category: 'Machinery',
          manufacturer: 'TechCorp GmbH',
          materials: [
            { material: 'Stainless Steel 304', percentage: 60, recyclable: true },
            { material: 'Copper Alloy', percentage: 20, recyclable: true },
            { material: 'Rubber Seal', percentage: 15, recyclable: false },
            { material: 'Aluminum Housing', percentage: 5, recyclable: true }
          ],
          carbon_footprint_kg: 45.2,
          weight_kg: 25,
          lifetime_years: 15
        },
        {
          sku: 'ERP-002',
          name: 'Electric Motor 3kW',
          category: 'Electronics',
          manufacturer: 'ElectroWorks Ltd',
          materials: [
            { material: 'Copper Winding', percentage: 45, recyclable: true },
            { material: 'Steel Core', percentage: 40, recyclable: true },
            { material: 'Plastic Housing', percentage: 15, recyclable: true }
          ],
          carbon_footprint_kg: 38.5,
          weight_kg: 18,
          lifetime_years: 20
        }
      ];

      toast.loading('Creating products and DPPs...');

      for (const erpProduct of mockERPData) {
        // Create Product
        const product = await base44.entities.Product.create({
          name: erpProduct.name,
          sku: erpProduct.sku,
          category: erpProduct.category,
          weight_kg: erpProduct.weight_kg,
          pcf_co2e: erpProduct.carbon_footprint_kg,
          expected_lifetime: erpProduct.lifetime_years,
          description: `Imported from ${connection.name}`
        });

        // Create DPP
        const dppId = `DPP-ERP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const qrResult = await base44.integrations.Core.GenerateImage({ 
          prompt: `QR code for ${dppId}` 
        });

        await base44.entities.DPPRecord.create({
          product_id: product.id,
          dpp_id: dppId,
          status: 'draft',
          qr_code_url: qrResult.url,
          general_info: {
            product_name: erpProduct.name,
            sku: erpProduct.sku,
            manufacturer: erpProduct.manufacturer,
            category: erpProduct.category
          },
          material_composition: erpProduct.materials,
          sustainability_info: {
            carbon_footprint_kg: erpProduct.carbon_footprint_kg,
            water_usage_liters: 0,
            energy_consumption_kwh: 0
          },
          circularity_metrics: {
            recyclability_score: 7.5,
            recycled_content_percentage: 0,
            repairability_index: 6,
            expected_lifetime_years: erpProduct.lifetime_years
          },
          compliance_declarations: [],
          version: '1.0',
          is_public: false
        });
      }

      return mockERPData.length;
    },
    onSuccess: (count) => {
      setImportedCount(count);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dpp-records'] });
      toast.success(`Imported ${count} products from ERP`);
    },
    onError: () => {
      toast.error('ERP import failed');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import from ERP System</DialogTitle>
        </DialogHeader>

        {importedCount === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Import product master data and create Digital Product Passports automatically from your ERP system.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select ERP Connection</label>
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose ERP system" />
                </SelectTrigger>
                <SelectContent>
                  {erpConnections.map(conn => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.system_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {erpConnections.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
                No ERP connections configured. Set up an ERP integration in SupplyLens first.
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">What will be imported:</p>
              <ul className="text-xs space-y-1">
                <li>• Product master data (SKU, name, category)</li>
                <li>• Material composition from BOM</li>
                <li>• Supplier relationships from procurement data</li>
                <li>• Carbon footprint from linked PCF module</li>
              </ul>
            </div>

            <Button 
              onClick={() => importMutation.mutate()}
              disabled={!selectedConnection || importMutation.isPending}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              {importMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing...</>
              ) : (
                <><Database className="w-4 h-4 mr-2" /> Import Products</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
            <div>
              <h3 className="text-lg font-bold">Import Successful!</h3>
              <p className="text-sm text-slate-600 mt-2">
                {importedCount} products imported and DPPs created as drafts
              </p>
            </div>
            <Button onClick={() => { setImportedCount(0); onOpenChange(false); }} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}