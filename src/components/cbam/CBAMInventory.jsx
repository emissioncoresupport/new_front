import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Download, RefreshCw, CheckCircle, AlertCircle, Sparkles, Trash2, Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import CBAMEntryModal from "./CBAMEntryModal";
import CBAMInviteModal from "./CBAMInviteModal";
import CBAMSmartImportWizard from "./CBAMSmartImportWizard";
import CBAMBatchOperationsPanel from './CBAMBatchOperationsPanel';
import CBAMInventoryRow from './CBAMInventoryRow';
import { cn } from "@/lib/utils";
import { COUNTRY_FLAGS, isEUCountry } from './constants.jsx';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { CountryFlag } from '@/components/utils/CountryFlagService';
import eventBus, { CBAM_EVENTS } from './services/CBAMEventBus';

export default function CBAMInventory({ entries = [] }) {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const queryClient = useQueryClient();

  // Fetch suppliers ONCE at parent level
  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const nonEUSuppliers = allSuppliers.filter(s => s.country && !isEUCountry(s.country));

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open) => {
    setIsModalOpen(open);
    if (!open) setSelectedEntry(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CBAMEmissionEntry.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      eventBus.emit(CBAM_EVENTS.ENTRY_DELETED, { entryId: deletedId });
      toast.success('Entry deleted successfully');
    },
    onError: () => toast.error('Failed to delete entry')
  });

  // Listen for entry updates from other components
  React.useEffect(() => {
    const unsubscribe = eventBus.on(CBAM_EVENTS.ENTRY_UPDATED, () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const filteredEntries = entries.filter(e => 
    !filter || 
    e.product_name?.toLowerCase().includes(filter.toLowerCase()) ||
    e.cn_code?.includes(filter) ||
    e.country_of_origin?.toLowerCase().includes(filter.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / pageSize);
  const paginatedEntries = filteredEntries.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      {selectedEntries.length > 0 && (
        <CBAMBatchOperationsPanel
          entries={entries}
          selectedIds={selectedEntries}
          onSelectionChange={setSelectedEntries}
        />
      )}
      
      {/* Clean Actions Bar */}
      <div className="p-4 bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 px-4 text-sm shadow-sm" onClick={() => setShowSmartWizard(true)}>
             <Sparkles className="w-3.5 h-3.5 mr-2" />
             Smart Import
             {nonEUSuppliers.length > 0 && (
               <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">{nonEUSuppliers.length}</Badge>
             )}
           </Button>
           <Button variant="outline" className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm shadow-none" onClick={() => setIsModalOpen(true)}>
             <Plus className="w-3.5 h-3.5 mr-2" />
             Quick Add
           </Button>
           <Button 
             variant="outline" 
             className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-4 text-sm shadow-none"
             onClick={() => {
               const csvData = filteredEntries.map(e => ({
                 import_id: e.import_id || '',
                 import_date: e.import_date || '',
                 cn_code: e.cn_code || '',
                 product_name: e.product_name || '',
                 country_of_origin: e.country_of_origin || '',
                 quantity: e.quantity || 0,
                 direct_emissions: e.direct_emissions_specific || 0,
                 indirect_emissions: e.indirect_emissions_specific || 0,
                 total_emissions: e.total_embedded_emissions || 0,
                 calculation_method: e.calculation_method || '',
                 validation_status: e.validation_status || ''
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
               link.download = `cbam_inventory_${new Date().toISOString().split('T')[0]}.csv`;
               link.click();
             }}
           >
             <Download className="w-3.5 h-3.5 mr-2" />
             Export
           </Button>
         </div>
         <div className="flex items-center gap-2">
           <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-8 w-[200px] h-9 bg-white border-slate-200/80 text-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
           </div>
           <Button 
             variant="outline" 
             className="border-slate-200/80 text-slate-700 hover:bg-slate-50 h-9 px-3 text-sm shadow-none"
             onClick={async () => {
               const brokenEntries = entries.filter(e => !e.total_embedded_emissions || e.total_embedded_emissions === 0);
               if (brokenEntries.length === 0) {
                 toast.info('All entries have valid calculations');
                 return;
               }

               if (!confirm(`Recalculate ${brokenEntries.length} entries with zero emissions?`)) return;

               const loadingToast = toast.loading('Recalculating entries...');

               try {
                 const { data } = await base44.functions.invoke('cbamBatchRecalculate', {
                   entry_ids: brokenEntries.map(e => e.id)
                 });

                 toast.dismiss(loadingToast);

                 if (data.success) {
                   queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
                   toast.success(`✓ Fixed ${data.results.success} entries`);
                 } else {
                   toast.error('Recalculation failed');
                 }
               } catch (error) {
                 toast.dismiss(loadingToast);
                 toast.error('Recalculation failed: ' + error.message);
               }
             }}
           >
              <RefreshCw className="w-3.5 h-3.5" />
           </Button>
         </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-200/60">
                <TableHead className="text-xs w-8">
                  <Checkbox
                    checked={selectedEntries.length === entries.length && entries.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEntries(entries.map(e => e.id));
                      } else {
                        setSelectedEntries([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="text-xs">Import ID / Date</TableHead>
                <TableHead className="text-xs">CN Code</TableHead>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">Origin</TableHead>
                <TableHead className="text-xs">Quantity (t)</TableHead>
                <TableHead className="text-xs">Direct Em.</TableHead>
                <TableHead className="text-xs">Total Em.</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={11} className="text-center py-16 text-slate-500">
                     <div className="flex flex-col items-center">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                          <RefreshCw className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-base font-medium text-slate-900">No Imports Found</h3>
                        <p className="text-sm max-w-sm mx-auto mt-2 mb-6 text-slate-500">Start by adding your first import declaration</p>
                        <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white">
                           Create Entry
                        </Button>
                     </div>
                   </TableCell>
                 </TableRow>
              ) : (
                paginatedEntries.map(entry => (
                  <CBAMInventoryRow
                    key={entry.id}
                    entry={entry}
                    suppliers={allSuppliers}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    selectedEntries={selectedEntries}
                    setSelectedEntries={setSelectedEntries}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-slate-200/60 shadow-sm">
          <div className="text-xs text-slate-600">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredEntries.length)} of {filteredEntries.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <div className="text-xs text-slate-600">
              Page {page + 1} of {totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <CBAMSmartImportWizard isOpen={showSmartWizard} onClose={() => setShowSmartWizard(false)} />
      <CBAMEntryModal open={isModalOpen} onOpenChange={handleCloseModal} initialData={selectedEntry} />
      <CBAMInviteModal open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen} />
      </div>
  );
}