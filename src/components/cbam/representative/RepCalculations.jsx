import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Sparkles, Download, Info } from "lucide-react";

export default function RepCalculations({ clients, imports }) {
  
  const calculateClientData = (client) => {
    const clientImports = imports.filter(i => i.eori_number === client.eori_number);
    
    // Calculate total embedded emissions
    const totalEmissions = clientImports.reduce((sum, i) => sum + (i.total_embedded_emissions || 0), 0);
    
    // 2026 CBAM: 2.5% certificate obligation (Regulation 2025/2083)
    const cbamRate2026 = 0.025;
    const certificatesRequired = Math.ceil(totalEmissions * cbamRate2026);
    
    const etsPrice = 88; // Q1 2026 EUA price
    const grossCost = certificatesRequired * etsPrice;
    
    // Calculate deductions from carbon price paid abroad (Art. 9)
    const deductions = clientImports.reduce((sum, i) => {
        if (i.carbon_price_due_paid && i.total_embedded_emissions) {
            return sum + (i.total_embedded_emissions * i.carbon_price_due_paid);
        }
        return sum;
    }, 0);

    const netPayable = Math.max(0, grossCost - deductions);
    
    return {
        period: 'Q1 2026',
        totalEmissions,
        cbamRate: cbamRate2026,
        certificatesRequired,
        etsPrice,
        grossCost,
        deductions,
        netPayable,
        importsCount: clientImports.length
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0f172a] text-white p-6 rounded-xl shadow-md flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
             <Calculator className="w-5 h-5 text-[#86b027]" />
             CBAM Calculation Engine
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Real-time calculation of emissions liabilities and deductions per client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
            onClick={() => {
              const csvData = clients.map(client => {
                const data = calculateClientData(client);
                return {
                  client: client.name,
                  eori: client.eori_number,
                  period: data.period,
                  imports: data.importsCount,
                  total_emissions: data.totalEmissions.toFixed(1),
                  cbam_rate: (data.cbamRate * 100) + '%',
                  certificates_required: data.certificatesRequired,
                  eua_price: data.etsPrice,
                  gross_cost: data.grossCost.toFixed(2),
                  deductions: data.deductions.toFixed(2),
                  net_payable: data.netPayable.toFixed(2)
                };
              });
              
              const headers = Object.keys(csvData[0]);
              const csv = [
                headers.join(','),
                ...csvData.map(row => headers.map(h => row[h]).join(','))
              ].join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `client_calculations_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Export Results
          </Button>
          <Button className="bg-[#86b027] hover:bg-[#769c22] text-white">
            <Sparkles className="w-4 h-4 mr-2" /> Revalidate All
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Client / EORI</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Imports</TableHead>
                <TableHead>Total Emissions</TableHead>
                <TableHead>CBAM Rate</TableHead>
                <TableHead>Certs Required</TableHead>
                <TableHead>EUA Price</TableHead>
                <TableHead>Gross Cost</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Payable</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => {
                const data = calculateClientData(client);
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{client.name}</div>
                      <div className="font-mono text-xs text-slate-400">{client.eori_number}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{data.period}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50">{data.importsCount}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">{data.totalEmissions.toFixed(1)} <span className="text-xs font-normal text-slate-400">tCO2e</span></TableCell>
                    <TableCell>
                      <Badge className="bg-[#86b027]/10 text-[#86b027] border-0">{(data.cbamRate * 100)}%</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-[#86b027]">{data.certificatesRequired.toLocaleString()}</TableCell>
                    <TableCell>€{data.etsPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-slate-700">€{data.grossCost.toLocaleString()}</TableCell>
                    <TableCell className="text-emerald-600">€{data.deductions.toLocaleString()}</TableCell>
                    <TableCell className="font-bold text-lg text-slate-900">€{data.netPayable.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm">
                         <Download className="w-4 h-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-slate-400">
                    No clients available for calculation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-[#02a1e8]/10 border border-[#02a1e8]/20 rounded-lg text-xs text-slate-800 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#02a1e8] shrink-0" />
          <div>
            <strong>2026 Phase-in:</strong> Only 2.5% of embedded emissions require certificate surrender. 
            Full obligation (100%) begins in 2034 when EU ETS free allocation ends completely.
          </div>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <strong>Carbon Price Deduction (Art. 9):</strong> Carbon prices paid in third countries (e.g., China ETS, UK ETS) 
            are automatically deducted from CBAM obligation.
          </div>
        </div>
      </div>
    </div>
  );
}