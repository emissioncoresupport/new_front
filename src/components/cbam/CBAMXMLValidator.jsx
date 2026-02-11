import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileCheck, Upload, AlertTriangle, CheckCircle2, XCircle, 
  FileText, Download, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

/**
 * CBAM XML Schema Validator
 * Validates CBAM XML reports against EU Implementing Regulation 2023/1773 schema
 * Cross-platform validation for reports from any solution provider
 */

export default function CBAMXMLValidator() {
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // EU CBAM XML Schema Rules (Implementing Regulation 2023/1773)
  const requiredFields = {
    report_metadata: ['reporting_year', 'reporting_quarter', 'eori_number', 'member_state', 'declarant_name'],
    emission_entry: [
      'cn_code', 
      'country_of_origin', 
      'quantity', 
      'functional_unit',
      'direct_emissions_specific', 
      'calculation_method',
      'import_date'
    ],
    verification: ['verification_status'],
    optional: ['indirect_emissions_specific', 'precursor_emissions_embedded', 'carbon_price_due_paid']
  };

  const cnCodePattern = /^\d{8}$/;
  const eoriPattern = /^[A-Z]{2}[\dA-Z]{1,15}$/;

  const validateXML = async (file) => {
    setIsValidating(true);
    setUploadedFile(file);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract and validate with AI
      const validation = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CBAM XML validator per EU Implementing Regulation 2023/1773.
        
Validate this CBAM report XML/data file and check:

1. MANDATORY FIELDS (Report Level):
   - reporting_year (>= 2026)
   - reporting_quarter (1-4)
   - eori_number (format: 2-letter country + alphanumeric, e.g., DE123456789012)
   - member_state (2-letter ISO code)
   - declarant_name

2. MANDATORY FIELDS (Per Entry):
   - cn_code (8-digit CN code from Annex I)
   - country_of_origin (ISO 3166-1 alpha-2)
   - quantity (tonnes, > 0)
   - functional_unit (tonnes, kWh, etc.)
   - direct_emissions_specific (tCO2e per functional unit)
   - calculation_method (actual_values, default_values, combined_actual_default)
   - import_date

3. VALIDATION RULES:
   - If calculation_method = default_values: MUST have production_route
   - If calculation_method = actual_values: SHOULD have verification_status
   - CN codes MUST be 8 digits from CBAM Annex I goods
   - Emissions values MUST be non-negative
   - reporting_year CANNOT be before 2026
   - If precursors exist: MUST include precursor_cn_code, quantity_consumed, emissions_embedded

4. CROSS-FIELD VALIDATION:
   - total_embedded_emissions = direct + indirect + precursors
   - certificates_required calculation accuracy
   - Free allocation adjustment if applicable

Extract all entries and validate against schema. Return detailed validation report.`,
        add_context_from_internet: false,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            is_valid: { type: "boolean" },
            schema_version: { type: "string" },
            total_entries: { type: "number" },
            valid_entries: { type: "number" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entry_index: { type: "number" },
                  field: { type: "string" },
                  error_type: { type: "string" },
                  message: { type: "string" },
                  severity: { type: "string", enum: ["critical", "warning", "info"] }
                }
              }
            },
            warnings: {
              type: "array",
              items: { type: "string" }
            },
            report_metadata: {
              type: "object",
              properties: {
                reporting_year: { type: "number" },
                reporting_quarter: { type: "number" },
                eori_number: { type: "string" },
                total_emissions: { type: "number" }
              }
            },
            compliance_score: { type: "number" }
          }
        }
      });

      setValidationResult({
        ...validation,
        file_name: file.name,
        file_size: file.size,
        validated_at: new Date().toISOString()
      });

      if (validation.is_valid) {
        toast.success('✓ XML Report Valid', {
          description: `${validation.valid_entries}/${validation.total_entries} entries compliant`
        });
      } else {
        toast.error('✗ Validation Failed', {
          description: `${validation.errors.length} errors found`
        });
      }

    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Validation failed: ' + error.message);
      setValidationResult({
        is_valid: false,
        errors: [{ message: error.message, severity: 'critical' }]
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['text/xml', 'application/xml', 'application/json', 'text/csv'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xml') && !file.name.endsWith('.json')) {
        toast.error('Invalid file type. Please upload XML, JSON, or CSV');
        return;
      }
      validateXML(file);
    }
  };

  const ErrorsList = ({ errors }) => (
    <div className="space-y-2">
      {errors.map((error, idx) => (
        <Alert key={idx} variant={error.severity === 'critical' ? 'destructive' : 'default'}>
          <div className="flex items-start gap-3">
            {error.severity === 'critical' ? (
              <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {error.field || 'General'}
                </Badge>
                {error.entry_index !== undefined && (
                  <span className="text-xs text-slate-500">Entry #{error.entry_index}</span>
                )}
              </div>
              <AlertDescription className="text-sm">
                {error.message}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-[#02a1e8]" />
          CBAM XML Schema Validator
        </h3>
        <p className="text-slate-500 text-sm mt-1">
          Cross-platform validation for CBAM reports from any solution provider • EU Implementing Regulation 2023/1773 compliance
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Report for Validation</CardTitle>
          <CardDescription>
            Supports XML, JSON, and CSV formats from any CBAM compliance platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-[#86b027] transition-colors">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <label htmlFor="xml-upload" className="cursor-pointer">
              <Button variant="outline" disabled={isValidating} asChild>
                <span>
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </>
                  )}
                </span>
              </Button>
            </label>
            <input
              id="xml-upload"
              type="file"
              accept=".xml,.json,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isValidating}
            />
            <p className="text-xs text-slate-500 mt-3">
              XML, JSON, or CSV • Max 10MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {validationResult.is_valid ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Validation Passed
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      Validation Failed
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {uploadedFile?.name} • {new Date(validationResult.validated_at).toLocaleString()}
                </CardDescription>
              </div>
              
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">
                  {validationResult.compliance_score || 0}%
                </div>
                <p className="text-xs text-slate-500">Compliance Score</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="errors">
                  Errors ({validationResult.errors?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Total Entries</p>
                    <p className="text-2xl font-bold text-slate-900">{validationResult.total_entries || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">Valid Entries</p>
                    <p className="text-2xl font-bold text-green-700">{validationResult.valid_entries || 0}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-700">Errors</p>
                    <p className="text-2xl font-bold text-red-700">{validationResult.errors?.length || 0}</p>
                  </div>
                </div>

                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">Warnings:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="errors">
                {validationResult.errors && validationResult.errors.length > 0 ? (
                  <ErrorsList errors={validationResult.errors} />
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-slate-600">No errors found</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metadata">
                {validationResult.report_metadata ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Reporting Year</p>
                        <p className="font-semibold">{validationResult.report_metadata.reporting_year}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Reporting Quarter</p>
                        <p className="font-semibold">Q{validationResult.report_metadata.reporting_quarter}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">EORI Number</p>
                        <p className="font-semibold">{validationResult.report_metadata.eori_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Emissions</p>
                        <p className="font-semibold">{validationResult.report_metadata.total_emissions?.toFixed(2)} tCO2e</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 pt-3 border-t">
                      Schema Version: {validationResult.schema_version || 'EU 2023/1773'}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">No metadata available</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Validation Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">EU CBAM Schema Requirements</CardTitle>
          <CardDescription>Mandatory fields per Implementing Regulation 2023/1773</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Report Metadata</h4>
              <ul className="space-y-1 text-slate-600">
                {requiredFields.report_metadata.map(field => (
                  <li key={field} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Per Entry</h4>
              <ul className="space-y-1 text-slate-600">
                {requiredFields.emission_entry.map(field => (
                  <li key={field} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}