import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scale, AlertTriangle, CheckCircle2, Bell, Download, TrendingUp } from "lucide-react";
import { CBAM_DE_MINIMIS_THRESHOLD } from '../constants';

export default function RepClientDeMinimisTracker({ clients, imports }) {
  const currentYear = new Date().getFullYear();

  // Calculate de minimis status per client
  const clientAnalysis = useMemo(() => {
    return clients.map(client => {
      const clientImports = imports.filter(i => 
        i.eori_number === client.eori_number &&
        new Date(i.import_date).getFullYear() === currentYear
      );

      const totalQuantity = clientImports.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const percentage = (totalQuantity / CBAM_DE_MINIMIS_THRESHOLD) * 100;
      const remaining = Math.max(0, CBAM_DE_MINIMIS_THRESHOLD - totalQuantity);
      const isExempt = totalQuantity <= CBAM_DE_MINIMIS_THRESHOLD;
      const isNearThreshold = percentage > 80 && percentage <= 100;
      const hasExceeded = percentage > 100;

      return {
        client,
        totalQuantity,
        percentage,
        remaining,
        isExempt,
        isNearThreshold,
        hasExceeded,
        importsCount: clientImports.length
      };
    });
  }, [clients, imports, currentYear]);

  // Count alerts
  const nearThresholdCount = clientAnalysis.filter(a => a.isNearThreshold).length;
  const exceededCount = clientAnalysis.filter(a => a.hasExceeded).length;
  const exemptCount = clientAnalysis.filter(a => a.isExempt && !a.isNearThreshold).length;

  // Export CSV
  const handleExport = () => {
    const headers = ['Client Name', 'EORI', 'Total Quantity (t)', 'Threshold %', 'Remaining (t)', 'Status', 'Imports Count'];
    const rows = clientAnalysis.map(a => [
      a.client.name,
      a.client.eori_number,
      a.totalQuantity.toFixed(2),
      a.percentage.toFixed(1) + '%',
      a.remaining.toFixed(2),
      a.hasExceeded ? 'EXCEEDED' : a.isNearThreshold ? 'WARNING' : 'EXEMPT',
      a.importsCount
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_de_minimis_${currentYear}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">CBAM Exempt</p>
                <h3 className="text-3xl font-bold text-emerald-600">{exemptCount}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Near Threshold</p>
                <h3 className="text-3xl font-bold text-amber-600">{nearThresholdCount}</h3>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Exceeded</p>
                <h3 className="text-3xl font-bold text-rose-600">{exceededCount}</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {(nearThresholdCount > 0 || exceededCount > 0) && (
        <Alert className="border-amber-200 bg-amber-50">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <strong>{nearThresholdCount + exceededCount} client(s)</strong> require attention regarding de minimis thresholds.
            {nearThresholdCount > 0 && ` ${nearThresholdCount} approaching threshold.`}
            {exceededCount > 0 && ` ${exceededCount} have exceeded.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Client Tracker Table */}
      <Card className="border-purple-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Scale className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Client De Minimis Tracker ({currentYear})</CardTitle>
                <p className="text-xs text-slate-600 mt-1">
                  Annual threshold: 50 tonnes per client (Regulation 2025/2083 Art. 2a)
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>EORI</TableHead>
                <TableHead>Imports</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientAnalysis
                .sort((a, b) => b.percentage - a.percentage)
                .map(analysis => (
                <TableRow key={analysis.client.id} className={
                  analysis.hasExceeded ? 'bg-rose-50/50' : 
                  analysis.isNearThreshold ? 'bg-amber-50/50' : ''
                }>
                  <TableCell className="font-medium">{analysis.client.name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {analysis.client.eori_number}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{analysis.importsCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">{analysis.totalQuantity.toFixed(2)}</span>
                    <span className="text-xs text-slate-500 ml-1">tonnes</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-[180px]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{analysis.percentage.toFixed(1)}%</span>
                        <span className="text-purple-600 font-mono">50t</span>
                      </div>
                      <Progress 
                        value={Math.min(100, analysis.percentage)} 
                        className="h-2" 
                        indicatorClassName={
                          analysis.hasExceeded ? "bg-rose-500" : 
                          analysis.isNearThreshold ? "bg-amber-500" : 
                          "bg-emerald-500"
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {analysis.isExempt ? (
                      <span className="text-sm font-medium text-slate-700">
                        {analysis.remaining.toFixed(2)}t
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-rose-600">
                        +{(analysis.totalQuantity - CBAM_DE_MINIMIS_THRESHOLD).toFixed(2)}t
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {analysis.hasExceeded ? (
                      <Badge className="bg-rose-100 text-rose-700 border-0">
                        CBAM Applies
                      </Badge>
                    ) : analysis.isNearThreshold ? (
                      <Badge className="bg-amber-100 text-amber-700 border-0 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Warning
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        Exempt
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {clientAnalysis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No clients to track
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Information Note */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm text-slate-700">
        <strong className="text-purple-700">Automated Alert System:</strong> Representatives are automatically notified when:
        <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
          <li>A client reaches 80% of the 50-tonne threshold (Warning)</li>
          <li>A client exceeds the 50-tonne threshold (CBAM obligations apply)</li>
          <li>Any new import pushes a client closer to the threshold</li>
        </ul>
      </div>
    </div>
  );
}