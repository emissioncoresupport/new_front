import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Send, Loader2, Euro, BarChart3 } from "lucide-react";
import PPWRReportingService from './services/PPWRReportingService';
import { toast } from 'sonner';

export default function PPWRAutomatedEPRReporting() {
  const [period, setPeriod] = useState('2025-Q4');
  const [memberState, setMemberState] = useState('DE');
  const [generatedReports, setGeneratedReports] = useState([]);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const handleGenerateReports = async () => {
    setGenerating(true);
    toast.info('Generating EPR reports...');

    try {
      const reports = await PPWRReportingService.generateEPRReport(period, memberState);
      setGeneratedReports(reports);
      toast.success(`${reports.length} EPR reports generated`);
    } catch (error) {
      toast.error('Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = (report) => {
    const csvContent = this.convertToCSV(report);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EPR_Report_${report.epr_scheme_id}_${period}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    toast.success('Report downloaded');
  };

  const convertToCSV = (report) => {
    let csv = 'Packaging Name,Material,Weight (kg),Fee (EUR)\n';
    report.items.forEach(item => {
      csv += `"${item.packaging_name}","${item.material}",${item.weight_kg},${item.fee_eur}\n`;
    });
    csv += `\nTotal,,,${report.total_fees_eur}\n`;
    return csv;
  };

  const eprSchemes = [...new Set(packaging.map(p => p.epr_scheme_id).filter(Boolean))];

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#86b027]">
            <FileText className="w-5 h-5" />
            Automated EPR Reporting Pipeline
          </CardTitle>
          <p className="text-sm text-slate-500">
            Generate quarterly/annual reports for Extended Producer Responsibility schemes
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reporting Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-Q4">2025 - Q4</SelectItem>
                  <SelectItem value="2026-Q1">2026 - Q1</SelectItem>
                  <SelectItem value="2026-Q2">2026 - Q2</SelectItem>
                  <SelectItem value="2026-Q3">2026 - Q3</SelectItem>
                  <SelectItem value="2026-Q4">2026 - Q4</SelectItem>
                  <SelectItem value="2026-Annual">2026 - Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Member State</Label>
              <Select value={memberState} onValueChange={setMemberState}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                  <SelectItem value="FR">🇫🇷 France</SelectItem>
                  <SelectItem value="NL">🇳🇱 Netherlands</SelectItem>
                  <SelectItem value="IT">🇮🇹 Italy</SelectItem>
                  <SelectItem value="ES">🇪🇸 Spain</SelectItem>
                  <SelectItem value="PL">🇵🇱 Poland</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total Packaging</p>
                <p className="text-lg font-bold text-slate-900">{packaging.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">EPR Registered</p>
                <p className="text-lg font-bold text-[#86b027]">
                  {packaging.filter(p => p.epr_registered).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">EPR Schemes</p>
                <p className="text-lg font-bold text-[#02a1e8]">{eprSchemes.length}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleGenerateReports}
            disabled={generating || packaging.filter(p => p.epr_registered).length === 0}
            className="w-full bg-[#86b027] hover:bg-[#769c22] text-white"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Reports...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate EPR Reports for {period}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Reports */}
      {generatedReports.length > 0 && (
        <div className="space-y-4">
          {generatedReports.map((report, idx) => (
            <Card key={idx} className="border-emerald-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {report.epr_scheme_id}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {report.reporting_period} | {report.member_state}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500 text-white">
                    {report.items.length} items
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Total Weight</p>
                    <p className="font-bold text-slate-900">{report.total_weight_kg.toFixed(2)} kg</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-xs text-emerald-700 mb-1">Avg PCR</p>
                    <p className="font-bold text-emerald-700">{report.avg_recycled_content}%</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 mb-1">Total Fees</p>
                    <p className="font-bold text-blue-700">€{report.total_fees_eur.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-700 mb-1">Status</p>
                    <Badge variant="outline">{report.payment_status}</Badge>
                  </div>
                </div>

                {/* Material Breakdown */}
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Material Breakdown</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(report.breakdown_by_material).map(([material, weight]) => (
                      <div key={material} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span className="text-slate-600">{material}</span>
                        <span className="font-bold text-slate-900">{weight.toFixed(2)} kg</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleDownloadReport(report)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit to {report.epr_scheme_id}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}