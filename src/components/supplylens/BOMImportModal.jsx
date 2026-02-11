import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileInput, Upload, FileText, AlertCircle, CheckCircle2, Sparkles, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function BOMImportModal({ open, onOpenChange }) {
  const [importText, setImportText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const queryClient = useQueryClient();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportText(e.target.result);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Intelligent Import using LLM
  const importMutation = useMutation({
    mutationFn: async (textData) => {
      setIsParsing(true);
      
      try {
        // 1. Use LLM to parse unstructured/semi-structured BOM data
        const parsePrompt = `
          You are a supply chain data expert. Parse the following raw Bill of Materials (BOM) data into a structured JSON format.
          The data might be nested, flat, CSV, or just text. Infer the parent-child relationships.
          
          RAW DATA:
          ${textData}
          
          Return a JSON object with a "bom_entries" array. Each entry should have:
          - parent_sku: code of the parent item
          - parent_desc: description of parent (infer if missing)
          - child_sku: code of the child/component item
          - child_desc: description of child (infer if missing)
          - quantity: number needed per parent unit
          - parent_category: "Finished Good" or "Sub-Assembly" usually
          - child_category: "Component", "Raw Material", or "Sub-Assembly"
          - supplier_name: The name of the supplier for the child component (if mentioned)
          
          Handle multi-level structures by creating multiple entries (e.g. A -> B, then B -> C).
          If indentation implies structure, respect it.
        `;

        const parsedData = await base44.integrations.Core.InvokeLLM({
          prompt: parsePrompt,
          response_json_schema: {
            type: "object",
            properties: {
              bom_entries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    parent_sku: { type: "string" },
                    parent_desc: { type: "string" },
                    child_sku: { type: "string" },
                    child_desc: { type: "string" },
                    quantity: { type: "number" },
                    parent_category: { type: "string" },
                    child_category: { type: "string" },
                    supplier_name: { type: "string" }
                  },
                  required: ["parent_sku", "child_sku", "quantity"]
                }
              }
            },
            required: ["bom_entries"]
          }
        });

        // 2. Process the structured data
        const results = { createdSKUs: 0, createdLinks: 0, mappedSuppliers: 0 };
        const entries = parsedData.bom_entries || [];
        const existingSkus = await base44.entities.SKU.list(); 
        const existingSuppliers = await base44.entities.Supplier.list();

        for (const entry of entries) {
          // Check/Create Parent SKU
          let parentSKU = existingSkus.find(s => s.sku_code === entry.parent_sku);
          if (!parentSKU) {
            parentSKU = await base44.entities.SKU.create({
              sku_code: entry.parent_sku,
              description: entry.parent_desc || `Item ${entry.parent_sku}`,
              category: entry.parent_category || 'Finished Good',
              status: 'active'
            });
            existingSkus.push(parentSKU); // Update local cache
            results.createdSKUs++;
          }

          // Check/Create Child SKU
          let childSKU = existingSkus.find(s => s.sku_code === entry.child_sku);
          if (!childSKU) {
            childSKU = await base44.entities.SKU.create({
              sku_code: entry.child_sku,
              description: entry.child_desc || `Item ${entry.child_sku}`,
              category: entry.child_category || 'Component',
              status: 'active'
            });
            existingSkus.push(childSKU); // Update local cache
            results.createdSKUs++;
          }

          // Create BOM Link
          await base44.entities.BillOfMaterials.create({
            parent_sku_id: parentSKU.id,
            child_sku_id: childSKU.id,
            quantity: Number(entry.quantity) || 1,
            layer: 1 
          });
          results.createdLinks++;

          // Map Supplier if present
          if (entry.supplier_name) {
            let supplier = existingSuppliers.find(s => s.legal_name.toLowerCase() === entry.supplier_name.toLowerCase());
            if (!supplier) {
              // Create new supplier if not found
              supplier = await base44.entities.Supplier.create({
                legal_name: entry.supplier_name,
                status: 'active',
                country: 'Unknown', // Default
                source: 'file_upload'
              });
              existingSuppliers.push(supplier);
            }

            // Create Mapping
            await base44.entities.SupplierSKUMapping.create({
              supplier_id: supplier.id,
              sku_id: childSKU.id,
              relationship_type: 'manufacturer',
              is_primary_supplier: true,
              mapping_confidence: 100,
              source_system: 'bom_import'
            });
            results.mappedSuppliers++;
          }
        }

        setIsParsing(false);
        return results;

      } catch (error) {
        console.error("Import Error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast.success(`Imported ${data.createdSKUs} SKUs, ${data.createdLinks} links, and mapped ${data.mappedSuppliers} suppliers`);
      setImportText('');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      queryClient.invalidateQueries({ queryKey: ['bom-links'] });
    },
    onError: () => {
      setIsParsing(false);
      toast.error("Failed to import BOM data");
    }
  });

  const sampleData = `BAT-2025-X, MOD-CELL-A, 4, High Capacity Li-Ion Battery, Battery Module, Finished Good, Component
BAT-2025-X, CAS-AL-50, 1, High Capacity Li-Ion Battery, Aluminum Casing, Finished Good, Component
MOD-CELL-A, CAT-CO-99, 5, Battery Module, Cobalt Cathode, Component, Raw Material
MOD-CELL-A, ANO-GR-01, 4, Battery Module, Graphite Anode, Component, Raw Material`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Import Bill of Materials
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-800">
            <p className="font-medium mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              AI Intelligent Import
            </p>
            <p className="mb-2 opacity-90">Paste your BOM data in <strong>any format</strong> (CSV, indented text, JSON). The AI will analyze the structure and automatically map parent-child relationships.</p>
            <Button 
              variant="outline" 
              size="xs" 
              className="h-6 text-xs bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              onClick={() => setImportText(sampleData)}
            >
              Load Complex Sample
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="file-upload">Upload File (CSV, Excel, Text)</Label>
              <Input id="file-upload" type="file" accept=".csv,.txt,.json,.xlsx" onChange={handleFileUpload} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or paste text</span>
              </div>
            </div>

            <div>
              <Label>BOM Data</Label>
              <Textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your BOM data here, or upload a file..."
                className="font-mono text-xs h-[200px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tip: Include a "Supplier" column to automatically map suppliers to components.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => importMutation.mutate(importText)}
            disabled={!importText.trim() || isParsing}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isParsing ? "Importing..." : "Process Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}