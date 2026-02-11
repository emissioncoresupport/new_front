import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, MoreHorizontal, ShieldCheck, AlertTriangle, ExternalLink, Download } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function RepClientList({ clients, onAddClient }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-800">Managed Clients</h3>
          <p className="text-sm text-slate-500">Manage declarant accounts and representation mandates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              const csvData = clients.map(c => ({
                name: c.name,
                declarant_id: c.declarant_id,
                eori: c.eori_number,
                sector: c.sector,
                country: c.country,
                poa_status: c.poa_status,
                account_status: c.status,
                readiness_score: c.readiness_score
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
              link.download = `managed_clients_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={onAddClient} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Plus className="w-4 h-4 mr-2" /> Onboard Client
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Declarant ID</TableHead>
                <TableHead>EORI</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>PoA Status</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(client => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium text-slate-900">
                    {client.name}
                    {client.contact_person && <div className="text-[10px] text-slate-500">{client.contact_person}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{client.declarant_id}</TableCell>
                  <TableCell className="font-mono text-xs">{client.eori_number}</TableCell>
                  <TableCell>{client.sector}</TableCell>
                  <TableCell>
                    {client.poa_status === 'verified' ? (
                      <div className="flex items-center gap-2">
                         <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Verified</Badge>
                         {client.power_of_attorney_url && (
                           <a href={client.power_of_attorney_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#02a1e8]">
                             <ExternalLink className="w-3 h-3" />
                           </a>
                         )}
                      </div>
                    ) : client.poa_status === 'pending_review' ? (
                      <div className="flex items-center gap-2">
                         <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">Review PoA</Badge>
                         {client.power_of_attorney_url && (
                           <a href={client.power_of_attorney_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#02a1e8]">
                             <ExternalLink className="w-3 h-3" />
                           </a>
                         )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 flex w-fit items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Missing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                     <Badge variant="secondary" className={client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                       {client.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <Button variant="ghost" size="icon" className="h-8 w-8">
                       <MoreHorizontal className="w-4 h-4 text-slate-400" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    No clients managed. Start by onboarding a new client.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}