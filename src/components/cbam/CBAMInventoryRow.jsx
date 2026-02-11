import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, AlertCircle, Edit, Trash2, Mail, User, Eye } from "lucide-react";
import { CountryFlag } from '@/components/utils/CountryFlagService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import CBAMEntryDetailModal from './CBAMEntryDetailModal';

export default function CBAMInventoryRow({ entry, suppliers = [], onEdit, onDelete, selectedEntries, setSelectedEntries }) {
  const [showDetail, setShowDetail] = useState(false);
  const queryClient = useQueryClient();

  // Get supplier from passed prop instead of fetching
  const supplier = suppliers.find(s => s.id === entry.supplier_id);

  const requestDataMutation = useMutation({
    mutationFn: async () => {
      if (!supplier) {
        throw new Error('No supplier linked to this entry');
      }

      if (supplier.primary_contact_email) {
        await base44.integrations.Core.SendEmail({
          to: supplier.primary_contact_email,
          subject: `CBAM Data Request - Import ${entry.import_id}`,
          body: `Dear ${supplier.legal_name},

We need actual emission data for the following import:

Import ID: ${entry.import_id}
CN Code: ${entry.cn_code}
Product: ${entry.product_name || 'N/A'}
Quantity: ${entry.quantity} tonnes

Please provide:
- Direct emissions (tCO2e per unit)
- Indirect emissions (tCO2e per unit)
- Production route information

Thank you,
CBAM Compliance Team`
        });
      }

      return supplier.legal_name;
    },
    onSuccess: (supplierName) => {
      toast.success(`Data request sent to ${supplierName}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send request');
    }
  });

  const total = entry.total_embedded_emissions || 0;
  const qty = entry.quantity || entry.net_mass_tonnes || 0;
  const calculated = total > 0 ? total : (qty * ((entry.direct_emissions_specific || 0) + (entry.indirect_emissions_specific || 0)));

  return (
    <>
      <TableRow className="group hover:bg-slate-50/50 transition-colors border-b border-slate-100">
        <TableCell className="py-3">
        <Checkbox
          checked={selectedEntries.includes(entry.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedEntries([...selectedEntries, entry.id]);
            } else {
              setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
            }
          }}
        />
      </TableCell>
      <TableCell className="py-3">
        <div className="font-medium text-slate-900 text-sm">{entry.import_id || 'PENDING'}</div>
        <div className="text-xs text-slate-400">{entry.import_date || 'No Date'}</div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline" className="font-mono text-xs text-slate-700 border-slate-200/80">
          {entry.cn_code}
        </Badge>
      </TableCell>
      <TableCell className="py-3">
        <div className="font-medium text-slate-900 text-sm">{entry.product_name}</div>
        <div className="text-xs text-slate-400">
          {supplier ? (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {supplier.legal_name}
            </div>
          ) : (
            entry.source || 'Manual'
          )}
        </div>
      </TableCell>
      <TableCell>
        <CountryFlag country={entry.country_of_origin} showName={true} />
      </TableCell>
      <TableCell className="font-medium text-slate-700">
        {(entry.quantity || entry.net_mass_tonnes || 0).toFixed(3)}
      </TableCell>
      <TableCell>
        <div className="font-medium text-slate-700">{(entry.direct_emissions_specific || 0).toFixed(3)}</div>
        {(entry.indirect_emissions_specific || 0) > 0 && (
          <div className="text-xs text-slate-400">
            + {(entry.indirect_emissions_specific || 0).toFixed(3)} indirect
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className={`font-bold ${calculated > 0 ? 'text-slate-800' : 'text-amber-600'}`}>
          {calculated > 0 ? calculated.toFixed(2) : 'Pending'}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {entry.calculation_method === 'actual_values' ? 'Actual' : 
           entry.calculation_method === 'default_values' ? 'Defaults' : 
           entry.calculation_method || 'N/A'}
        </Badge>
      </TableCell>
      <TableCell>
        {entry.validation_status === 'manual_verified' || entry.validation_status === 'ai_validated' ? (
          <div className="flex items-center text-emerald-600 text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Verified
          </div>
        ) : (
          <div className="flex items-center text-amber-600 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Pending
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-600 hover:bg-slate-100 h-8 px-2"
            onClick={() => setShowDetail(true)}
            title="View full details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          
          {supplier && entry.calculation_method !== 'actual_values' && entry.calculation_method !== 'EU_method' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#86b027] hover:text-[#86b027] hover:bg-[#86b027]/10 h-8 px-2"
              onClick={() => requestDataMutation.mutate()}
              disabled={requestDataMutation.isPending}
              title="Request data from supplier"
            >
              <Mail className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button variant="ghost" size="sm" className="text-[#02a1e8] h-8" onClick={() => onEdit(entry)}>
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8" 
            onClick={() => {
              if (confirm(`Delete import entry "${entry.product_name}"?`)) {
                onDelete(entry.id);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
      </TableRow>
      
      <CBAMEntryDetailModal 
        entry={entry} 
        supplier={supplier}
        open={showDetail} 
        onClose={() => setShowDetail(false)} 
      />
    </>
  );
}