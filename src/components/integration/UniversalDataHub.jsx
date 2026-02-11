import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, Package, FileText, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Universal Data Hub - Single entry point for all module data
 * Eliminates duplication across CBAM, EUDR, PCF, LCA, Logistics, etc.
 */
export default function UniversalDataHub({ targetModule, onDataImported }) {
  const [activeTab, setActiveTab] = useState('supplylens');
  const queryClient = useQueryClient();

  const importFromSupplyLens = useMutation({
    mutationFn: async () => {
      const suppliers = await base44.entities.Supplier.list();
      const parts = await base44.entities.Part.list();
      const boms = await base44.entities.BOM.list();
      
      return { suppliers, parts, boms };
    },
    onSuccess: (data) => {
      toast.success(`Imported ${data.suppliers.length} suppliers, ${data.parts.length} parts`);
      onDataImported?.(data);
    }
  });

  const uploadDocument = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const schema = targetModule === 'CBAM' 
        ? { type: "object", properties: { cn_code: { type: "string" }, quantity: { type: "number" }, direct_emissions_specific: { type: "number" } } }
        : targetModule === 'EUDR'
        ? { type: "object", properties: { commodity: { type: "string" }, supplier_name: { type: "string" }, production_country: { type: "string" } } }
        : { type: "object", properties: { name: { type: "string" }, value: { type: "number" } } };

      const { output } = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      return { extracted: output, file_url };
    },
    onSuccess: (data) => {
      toast.success(`Extracted ${Array.isArray(data.extracted) ? data.extracted.length : 1} records`);
      onDataImported?.(data.extracted);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-[#86b027]" />
          Universal Data Import Hub
        </CardTitle>
        <p className="text-sm text-slate-600">Centralized data entry for all modules</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="supplylens" className="gap-2">
              <Package className="w-4 h-4" />
              SupplyLens
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Document
            </TabsTrigger>
            <TabsTrigger value="erp" className="gap-2">
              <Zap className="w-4 h-4" />
              ERP Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="supplylens" className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-4">
                Import supplier data, BOMs, and parts from SupplyLens into {targetModule}
              </p>
              <Button 
                onClick={() => importFromSupplyLens.mutate()}
                disabled={importFromSupplyLens.isPending}
                className="w-full bg-[#86b027] hover:bg-[#769c22]"
              >
                {importFromSupplyLens.isPending ? 'Importing...' : 'Import from SupplyLens'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-sm text-slate-600 mb-4">
                Upload Excel, CSV, or PDF with {targetModule} data
              </p>
              <input
                type="file"
                accept=".xlsx,.csv,.pdf"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    uploadDocument.mutate(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button as="span" className="bg-[#02a1e8] hover:bg-[#0189c9]">
                  Choose File
                </Button>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="erp" className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-4">
                Sync from SAP, Oracle, Microsoft Dynamics, or NetSuite
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Configure ERP Connection
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}