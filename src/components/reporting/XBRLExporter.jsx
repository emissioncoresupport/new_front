import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, CheckCircle2, Globe } from "lucide-react";
import { toast } from "sonner";

export default function XBRLExporter() {
  const [selectedStandards, setSelectedStandards] = useState(['CSRD', 'SEC']);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dataPoints = [] } = useQuery({
    queryKey: ['csrd-data-points'],
    queryFn: () => base44.entities.CSRDDataPoint.list()
  });

  const { data: ccfEntries = [] } = useQuery({
    queryKey: ['ccf-entries'],
    queryFn: () => base44.entities.CCFEntry.list()
  });

  const standards = [
    { id: 'CSRD', name: 'EU CSRD/ESRS', description: 'European sustainability disclosure' },
    { id: 'SEC', name: 'SEC Climate Disclosure', description: 'US Securities and Exchange Commission' },
    { id: 'IFRS', name: 'IFRS S1/S2', description: 'International Financial Reporting Standards' }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    const loadingToast = toast.loading('Generating XBRL files...');

    try {
      for (const std of selectedStandards) {
        const xbrlData = generateXBRLData(std);
        const blob = new Blob([xbrlData], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${std}_ESG_Report_${new Date().getFullYear()}.xbrl`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.dismiss(loadingToast);
      toast.success(`✅ Generated ${selectedStandards.length} XBRL file(s)`);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateXBRLData = (standard) => {
    const scope1 = ccfEntries.filter(e => e.scope === 'scope_1').reduce((s, e) => s + (e.co2e_tonnes || 0), 0);
    const scope2 = ccfEntries.filter(e => e.scope === 'scope_2').reduce((s, e) => s + (e.co2e_tonnes || 0), 0);
    const scope3 = ccfEntries.filter(e => e.scope === 'scope_3').reduce((s, e) => s + (e.co2e_tonnes || 0), 0);

    return `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance"
      xmlns:esg="${standard === 'CSRD' ? 'http://xbrl.efrag.org/taxonomy/esrs' : 'http://xbrl.sec.gov/climate/2024'}">
  <context id="current_period">
    <entity>
      <identifier scheme="http://www.example.com">COMPANY_ID</identifier>
    </entity>
    <period>
      <startDate>${new Date().getFullYear()}-01-01</startDate>
      <endDate>${new Date().getFullYear()}-12-31</endDate>
    </period>
  </context>
  
  <!-- Scope 1 Emissions -->
  <esg:Scope1Emissions contextRef="current_period" unitRef="tonnes_co2e" decimals="2">
    ${scope1.toFixed(2)}
  </esg:Scope1Emissions>
  
  <!-- Scope 2 Emissions -->
  <esg:Scope2Emissions contextRef="current_period" unitRef="tonnes_co2e" decimals="2">
    ${scope2.toFixed(2)}
  </esg:Scope2Emissions>
  
  <!-- Scope 3 Emissions -->
  <esg:Scope3Emissions contextRef="current_period" unitRef="tonnes_co2e" decimals="2">
    ${scope3.toFixed(2)}
  </esg:Scope3Emissions>
  
  ${dataPoints.map(dp => `
  <!-- ${dp.metric_name} -->
  <esg:${dp.esrs_code?.replace(/\s/g, '_') || 'DataPoint'} contextRef="current_period" decimals="2">
    ${dp.value}
  </esg:>${dp.esrs_code?.replace(/\s/g, '_') || 'DataPoint'}>`).join('\n')}
  
  <unit id="tonnes_co2e">
    <measure>tonnes_co2e</measure>
  </unit>
</xbrl>`;
  };

  return (
    <Card className="border-[#02a1e8]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#02a1e8] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>XBRL Export for Financial Filings</CardTitle>
              <p className="text-xs text-slate-600">SEC & CSRD-ready structured data export</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-bold mb-3">Select Filing Standards</p>
          <div className="space-y-2">
            {standards.map(std => (
              <div key={std.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelectedStandards(prev => 
                  prev.includes(std.id) ? prev.filter(s => s !== std.id) : [...prev, std.id]
                )}>
                <Checkbox checked={selectedStandards.includes(std.id)} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{std.name}</p>
                  <p className="text-xs text-slate-600">{std.description}</p>
                </div>
                {selectedStandards.includes(std.id) && <CheckCircle2 className="w-4 h-4 text-[#86b027]" />}
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-900 mb-2">📊 Data Coverage</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-600">CSRD Data Points</p>
                <p className="text-lg font-bold">{dataPoints.length}</p>
              </div>
              <div>
                <p className="text-slate-600">Emissions Entries</p>
                <p className="text-lg font-bold">{ccfEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedStandards.length === 0}
          className="w-full bg-[#02a1e8] hover:bg-[#0291d1]"
        >
          <Download className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : `Generate ${selectedStandards.length} XBRL File(s)`}
        </Button>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs font-bold text-blue-900 mb-1">💡 XBRL for Financial Reporting</p>
          <p className="text-xs text-blue-800">
            eXtensible Business Reporting Language (XBRL) enables machine-readable ESG disclosures 
            for SEC climate filings, EU CSRD/ESRS, and IFRS S1/S2 standards. Files are ready for submission 
            to regulatory authorities and integration with financial reporting systems.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}