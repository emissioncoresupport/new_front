import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileText, Truck, Shield, AlertTriangle, 
  CheckCircle2, Loader2, Download, RefreshCw, Database
} from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import eventBus, { CBAM_EVENTS } from '../services/CBAMEventBus';

/**
 * Customs Data Importer
 * Import declarations from customs systems (AES, ICS2, SAD)
 * AUTO-CREATE CBAM entries from customs data
 * 
 * Supported formats:
 * - EU Single Administrative Document (SAD)
 * - Import Control System 2 (ICS2)
 * - Automated Export System (AES)
 * - CSV/Excel customs extract
 */

export default function CustomsDataImporter() {
  const [uploading, setUploading] = useState(false);
  const [importType, setImportType] = useState('sad');
  const queryClient = useQueryClient();

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    toast.info('Analyzing customs declaration...');

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract customs data using AI
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            customs_declarations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mrn: { type: "string", description: "Movement Reference Number" },
                  import_date: { type: "string", format: "date" },
                  cn_code: { type: "string" },
                  goods_description: { type: "string" },
                  country_of_origin: { type: "string" },
                  net_mass_kg: { type: "number" },
                  customs_value_eur: { type: "number" },
                  importer_eori: { type: "string" },
                  customs_procedure_code: { type: "string" },
                  supplier_name: { type: "string" },
                  supplier_country: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (!extractResult.output?.customs_declarations) {
        throw new Error('No customs declarations found in file');
      }

      const declarations = extractResult.output.customs_declarations;
      
      // Filter CBAM-relevant goods (CN codes from Annex I)
      const cbamRelevantCodes = [
        '7201', '7202', '7203', '7204', '7205', '7206', '7207', // Iron & Steel
        '7601', '7602', '7603', '7604', '7605', '7606', '7607', '7608', // Aluminium
        '2523', '2507', // Cement
        '3102', '3103', '3104', '3105', // Fertilizers
        '2804', // Hydrogen
        '2716' // Electricity
      ];

      const cbamDeclarations = declarations.filter(d => {
        const cnPrefix = d.cn_code?.substring(0, 4);
        return cbamRelevantCodes.some(code => cnPrefix === code);
      });

      if (cbamDeclarations.length === 0) {
        toast.warning('No CBAM-relevant goods found in customs data');
        return;
      }

      // Create CBAM entries
      const created = [];
      for (const decl of cbamDeclarations) {
        const entry = await base44.entities.CBAMEmissionEntry.create({
          import_id: decl.mrn || `IMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          customs_declaration_mrn: decl.mrn,
          import_date: decl.import_date,
          cn_code: decl.cn_code,
          goods_nomenclature: decl.goods_description,
          product_name: decl.goods_description,
          country_of_origin: decl.country_of_origin,
          quantity: (decl.net_mass_kg || 0) / 1000, // Convert kg to tonnes
          customs_value_eur: decl.customs_value_eur,
          eori_number: decl.importer_eori,
          customs_procedure_code: decl.customs_procedure_code,
          supplier_name: decl.supplier_name,
          calculation_method: 'Default_values', // Will be upgraded when supplier data arrives
          data_source: 'customs_import',
          validation_status: 'pending',
          reporting_period_year: new Date(decl.import_date).getFullYear()
        });

        created.push(entry);
        eventBus.emit(CBAM_EVENTS.ENTRY_CREATED, { entryId: entry.id, entry });
      }

      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      
      toast.success(`✓ Created ${created.length} CBAM entries from customs data`, {
        description: `${declarations.length - cbamDeclarations.length} non-CBAM goods filtered out`
      });

    } catch (error) {
      console.error(error);
      toast.error('Import failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#86b027]" />
          Customs Data Importer
        </CardTitle>
        <CardDescription>
          Import declarations from EU customs systems (SAD, ICS2, AES) to auto-create CBAM entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm">
            <strong>Auto-Import from Customs:</strong> Upload your customs declarations (SAD, ICS2, AES) and we'll automatically create CBAM entries for Annex I goods. Non-CBAM goods will be filtered out.
          </AlertDescription>
        </Alert>

        <div>
          <Label>Declaration Type</Label>
          <Select value={importType} onValueChange={setImportType}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sad">Single Administrative Document (SAD)</SelectItem>
              <SelectItem value="ics2">Import Control System 2 (ICS2)</SelectItem>
              <SelectItem value="aes">Automated Export System (AES)</SelectItem>
              <SelectItem value="csv">CSV/Excel Extract</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-[#86b027] transition-colors relative">
          <input 
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            accept=".pdf,.xml,.csv,.xlsx"
            disabled={uploading}
          />
          <div className="w-12 h-12 bg-[#86b027]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-[#86b027] animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-[#86b027]" />
            )}
          </div>
          <h4 className="font-medium text-slate-900 mb-2">
            {uploading ? 'Processing Customs Data...' : 'Upload Customs Declaration'}
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            Drop your {importType.toUpperCase()} file here or click to browse
          </p>
          <Button 
            variant="outline" 
            disabled={uploading}
            className="pointer-events-none"
          >
            {uploading ? 'Analyzing...' : 'Select File'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="font-semibold text-slate-900 mb-2">✓ Auto-Extracted</div>
            <ul className="space-y-1 text-slate-600">
              <li>• CN Codes & Descriptions</li>
              <li>• Net Mass (kg → tonnes)</li>
              <li>• Country of Origin</li>
              <li>• Customs Value</li>
              <li>• MRN & Import Date</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="font-semibold text-slate-900 mb-2">⚡ Smart Features</div>
            <ul className="space-y-1 text-slate-600">
              <li>• Filter Annex I goods only</li>
              <li>• Auto-apply default emissions</li>
              <li>• Link to SupplyLens suppliers</li>
              <li>• Real-time validation</li>
            </ul>
          </div>
        </div>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Direct API integration with EU customs systems (AES, ICS2) requires production credentials. Currently using document upload with AI extraction.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}