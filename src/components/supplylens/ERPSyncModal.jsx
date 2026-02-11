import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import DraggableDashboard from '@/components/layout/DraggableDashboard';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, CheckCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ERPSyncModal({ open, onClose, onSyncComplete }) {
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedSuppliers, setSyncedSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: async () => {
      try {
        return await base44.entities.ERPConnection.list();
      } catch (error) {
        console.error('Failed to load ERP connections:', error);
        return [];
      }
    },
    enabled: open,
    initialData: []
  });

  const activeConnections = (connections || []).filter(c => c?.status === 'active');

  const handleSync = async () => {
    console.log('=== ERP SYNC STARTED ===');
    console.log('Selected connection:', selectedConnection);
    
    if (!selectedConnection) {
      toast.error('Please select an ERP connection');
      return;
    }

    setIsSyncing(true);
    const toastId = toast.loading('Syncing suppliers from ERP...');

    try {
      console.log('Getting user...');
      const user = await base44.auth.me();
      console.log('User:', user.email);

      console.log('Invoking erpBidirectionalSync function...');
      const result = await base44.functions.invoke('erpBidirectionalSync', {
        erp_connection_id: selectedConnection,
        sync_direction: 'import',
        entity_types: ['suppliers'],
        conflict_resolution: 'erp_wins'
      });

      toast.dismiss(toastId);
      
      if (result.data?.results?.suppliers) {
        const suppliers = result.data.results.suppliers.records || [];
        
        // INGESTION PIPELINE: Create source records for each ERP supplier
        const enrichedSuppliers = [];
        for (const erpData of suppliers) {
          const sourceRecord = await base44.entities.SourceRecord.create({
            tenant_id: user.company_id,
            source_system: `erp_${selectedConnection}`,
            entity_type: 'supplier',
            external_id: erpData.erp_id || erpData.external_id || erpData.id,
            source_data: erpData,
            raw_payload: erpData,
            status: 'pending',
            ingested_at: new Date().toISOString(),
            ingested_by: user.email
          });

          enrichedSuppliers.push({
            ...erpData,
            _source_record_id: sourceRecord.id
          });
        }

        setSyncedSuppliers(enrichedSuppliers);
        toast.success(`Synced ${enrichedSuppliers.length} suppliers via ingestion pipeline`);
      } else {
        toast.warning('No suppliers found in ERP');
      }
    } catch (error) {
      console.error('=== ERP SYNC ERROR ===');
      console.error('Error:', error);
      console.error('Message:', error.message);
      toast.dismiss(toastId);
      toast.error('ERP sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectSupplier = async (supplier) => {
    setSelectedSupplier(supplier);
    
    // Update source record status to 'selected'
    if (supplier._source_record_id) {
      try {
        await base44.entities.SourceRecord.update(supplier._source_record_id, {
          status: 'selected'
        });
      } catch (error) {
        console.warn('Failed to update source record:', error);
      }
    }

    onSyncComplete(supplier);
  };

  const filteredSuppliers = supplierSearch
    ? syncedSuppliers.filter(s => 
        s.legal_name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.vat_number?.toLowerCase().includes(supplierSearch.toLowerCase())
      )
    : syncedSuppliers;

  if (!open) return null;

  return (
    <DraggableDashboard
      open={open}
      onClose={onClose}
      title="Sync Supplier from ERP"
      icon={Database}
      width="700px"
      height="650px"
      defaultPosition={{ top: 120, left: 120 }}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          {/* Step 1: Select ERP Connection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">1. Select ERP Connection</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading connections...
              </div>
            ) : activeConnections.length === 0 ? (
              <div className="p-4 rounded-lg border-2 border-dashed border-slate-200 text-center">
                <p className="text-sm text-slate-600 mb-3">No ERP connections configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = '/erp-integration';
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Configure ERP
                </Button>
              </div>
            ) : (
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select ERP system..." />
                </SelectTrigger>
                <SelectContent>
                  {activeConnections.map(conn => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.system_type?.toUpperCase() || 'ERP'} - {conn.connection_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Step 2: Sync */}
          {selectedConnection && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">2. Fetch Suppliers</Label>
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full bg-[#86b027] hover:bg-[#86b027]/90"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync from ERP
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 3: Select Supplier */}
          {syncedSuppliers.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">3. Select Supplier to Import</Label>
              <Input
                placeholder="Search by name or VAT number..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
                {filteredSuppliers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No suppliers match your search</p>
                ) : (
                  filteredSuppliers.map((supplier, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-[#86b027] hover:bg-[#86b027]/5",
                        selectedSupplier === supplier ? "border-[#86b027] bg-[#86b027]/5" : "border-slate-200"
                      )}
                      onClick={() => handleSelectSupplier(supplier)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{supplier.legal_name}</p>
                          <div className="flex gap-2 mt-1 text-xs text-slate-600">
                            {supplier.vat_number && <span>VAT: {supplier.vat_number}</span>}
                            {supplier.country && <span>• {supplier.country}</span>}
                          </div>
                        </div>
                        {selectedSupplier === supplier && (
                          <CheckCircle className="w-5 h-5 text-[#86b027]" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-white/60 backdrop-blur-xl">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </DraggableDashboard>
  );
}