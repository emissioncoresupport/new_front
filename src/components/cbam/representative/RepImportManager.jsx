import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, Download, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RequestDataModal from './RequestDataModal';

export default function RepImportManager({ imports, clients, onAddImport }) {
  const [filterClient, setFilterClient] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [requestDataFor, setRequestDataFor] = useState(null);

  const filteredImports = imports.filter(i => {
    const matchesClient = filterClient === "all" || i.eori_number === filterClient;
    const matchesSearch = i.import_id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.cn_code?.includes(searchTerm) ||
                          i.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          i.aggregated_goods_category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClient && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search imports..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[200px]">
               <SelectValue placeholder="Filter by Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.declarant_id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              const csvData = filteredImports.map(e => ({
                import_id: e.import_id || '',
                eori: e.eori_number || '',
                declarant: e.declarant_name || '',
                cn_code: e.cn_code || '',
                product: e.product_name || '',
                origin: e.country_of_origin || '',
                quantity: e.quantity || 0,
                emissions: e.total_embedded_emissions || 0,
                method: e.calculation_method || '',
                status: e.validation_status || ''
              }));
              
              const headers = Object.keys(csvData[0]);
              const csv = [
                headers.join(','),
                ...csvData.map(row => headers.map(h => row[h]).join(','))
              ].join('\n');
              
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `client_imports_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={onAddImport}>
            <Plus className="w-4 h-4 mr-2" /> Add Import
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Import ID</TableHead>
                <TableHead>EORI / Declarant</TableHead>
                <TableHead>Product / CN Code</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Quantity (t)</TableHead>
                <TableHead>Emissions</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredImports.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.import_id || 'PENDING'}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{entry.declarant_name || 'N/A'}</div>
                    <div className="text-xs font-mono text-slate-400">{entry.eori_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{entry.product_name}</div>
                    <div className="text-xs text-slate-400">CN: {entry.cn_code}</div>
                  </TableCell>
                  <TableCell>{entry.country_of_origin}</TableCell>
                  <TableCell>{entry.quantity?.toFixed(3)}</TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-700">{entry.total_embedded_emissions?.toFixed(1)}</div>
                    <div className="text-[10px] text-slate-400">tCO2e</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {entry.calculation_method === 'EU_method' ? 'EU' : 'Default'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className={
                       entry.validation_status === 'validated' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                       "bg-amber-50 text-amber-700 border-amber-200"
                     }>
                       {entry.validation_status === 'validated' ? 'Verified' : 'Pending'}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {entry.calculation_method === 'Default_values' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRequestDataFor(entry)}
                          className="text-[#02a1e8] border-[#02a1e8]/30 hover:bg-[#02a1e8]/10"
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Request Data
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredImports.length === 0 && (
                <TableRow>
                   <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                     No imports found matching your filters.
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RequestDataModal
        open={!!requestDataFor}
        onOpenChange={(open) => !open && setRequestDataFor(null)}
        importEntry={requestDataFor}
      />
    </div>
  );
}