import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { FileCode, Download, Send, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export default function CBAMXMLGenerator({ reportId }) {
  const [generatedXML, setGeneratedXML] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: report } = useQuery({
    queryKey: ['cbam-report', reportId],
    queryFn: async () => {
      const reports = await base44.entities.CBAMReport.list();
      return reports.find(r => r.id === reportId);
    },
    enabled: !!reportId
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-entries', reportId],
    queryFn: async () => {
      const all = await base44.entities.CBAMEmissionEntry.list();
      return all.filter(e => e.report_id === reportId);
    },
    enabled: !!reportId
  });

  const generateXMLMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      toast.loading('Generating CBAM XML Report...');

      const xmlPrompt = `Generate CBAM quarterly report XML according to EU Commission Implementing Regulation (EU) 2023/1773:

Report Details:
- Period: ${report.period}
- Year: ${report.year}
- Total Emissions: ${report.total_emissions} tCO2e
- Direct Emissions: ${report.total_direct_emissions} tCO2e
- Indirect Emissions: ${report.total_indirect_emissions} tCO2e
- Certificates Required: ${report.certificates_required}
- Certificates Surrendered: ${report.certificates_surrendered}

Import Entries (${entries.length} total):
${entries.map(e => `
- Import ID: ${e.import_id}
  HS Code: ${e.hs_code}
  Origin: ${e.country_of_origin}
  Mass: ${e.net_mass_tonnes}t
  Emissions: ${e.total_embedded_emissions} tCO2e
  Method: ${e.calculation_method}
`).join('\n')}

Generate valid XML following CBAM Transitional Registry schema with:
- Header (declarant info, period, timestamp)
- GoodsCategory elements for each import
- EmissionData with direct/indirect breakdown
- CalculationMethod and DataQuality indicators
- Digital signature placeholder

Return ONLY the XML content, no markdown.`;

      const xml = await base44.integrations.Core.InvokeLLM({
        prompt: xmlPrompt
      });

      setGeneratedXML(xml);
      return xml;
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success('XML report generated successfully');
      setIsGenerating(false);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Failed to generate XML');
      setIsGenerating(false);
    }
  });

  const downloadXML = () => {
    const blob = new Blob([generatedXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CBAM_Report_${report.period}_${report.year}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('XML downloaded');
  };

  return (
    <div className="space-y-4">
      <Card className="border-indigo-200 bg-gradient-to-br from-white to-indigo-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode className="w-5 h-5 text-indigo-600" />
            Automated XML Report Generation
          </CardTitle>
          <p className="text-sm text-slate-600">
            Generate compliant XML for CBAM Transitional Registry submission
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!generatedXML ? (
            <div className="text-center py-8">
              <Button
                onClick={() => generateXMLMutation.mutate()}
                disabled={isGenerating || !reportId}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating XML...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> Generate XML Report</>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 rounded-lg p-4 max-h-[400px] overflow-auto">
                <code className="text-xs text-green-400 font-mono whitespace-pre">
                  {generatedXML}
                </code>
              </div>
              <div className="flex gap-3">
                <Button onClick={downloadXML} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download XML
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  <Send className="w-4 h-4 mr-2" />
                  Submit to Registry
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}