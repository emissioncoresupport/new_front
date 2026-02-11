import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Zap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * EVIDENCE VAULT REFACTORED — Show provenance, origin, created_by
 * Supports DATA MODE visibility and DEMO/Test purging
 */

export default function EvidenceVaultRefactored() {
  const [filters, setFilters] = useState({
    ingestion_method: 'ALL',
    provenance: 'ALL',
    ledger_state: 'ALL'
  });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isPurging, setIsPurging] = useState(false);

  // Fetch evidence
  const { data: evidence = [], refetch } = useQuery({
    queryKey: ['evidence-vault'],
    queryFn: () => base44.asServiceRole.entities.Evidence.list('-ingestion_timestamp_utc')
  });

  // Get tenant settings for data mode
  const { data: tenantSettings = {} } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const settings = await base44.asServiceRole.entities.Company.filter({
        tenant_id: 'CURRENT'
      });
      return settings?.[0] || { data_mode: 'LIVE' };
    }
  });

  const dataMode = tenantSettings?.data_mode || 'LIVE';

  // Filter evidence
  const filtered = evidence.filter(e => {
    if (filters.ingestion_method !== 'ALL' && e.ingestion_method !== filters.ingestion_method) return false;
    if (filters.provenance !== 'ALL' && e.provenance !== filters.provenance) return false;
    if (filters.ledger_state !== 'ALL' && e.ledger_state !== filters.ledger_state) return false;
    return true;
  });

  // Purge test fixtures (non-LIVE mode only)
   const handlePurgeDemoData = async () => {
     if (dataMode === 'LIVE') {
       toast.error('Purge not available in LIVE mode');
       return;
     }

     setIsPurging(true);

     try {
       const toDelete = evidence.filter(e => e.provenance === 'TEST_FIXTURE' || e.provenance === 'DEMO_SEED');

       if (toDelete.length === 0) {
         toast.info('No test fixtures to purge');
         setIsPurging(false);
         return;
       }

       let purgedCount = 0;
       for (const record of toDelete) {
         await base44.asServiceRole.entities.Evidence.delete(record.id);
         purgedCount++;
       }

       // Log audit event
       await base44.asServiceRole.entities.AuditEvent.create({
         audit_event_id: crypto.randomUUID(),
         tenant_id: 'CURRENT',
         evidence_id: 'SYSTEM',
         actor_user_id: 'ADMIN',
         action: 'DEMO_PURGE_EXECUTED',
         request_id: crypto.randomUUID(),
         context_json: {
           purged_count: purgedCount,
           provenance_types: ['TEST_FIXTURE', 'DEMO_SEED']
         },
         created_at_utc: new Date().toISOString()
       });

       toast.success(`Purged ${purgedCount} test fixtures`);
       refetch();
     } catch (error) {
       toast.error('Purge failed: ' + error.message);
     } finally {
       setIsPurging(false);
     }
   };

  return (
    <div className="space-y-4">
      {/* DATA MODE Banner */}
      <div className={`px-4 py-3 rounded-lg flex items-center gap-2 font-medium text-sm ${
        dataMode === 'LIVE' ? 'bg-blue-50 border border-blue-200 text-blue-900' :
        dataMode === 'DEMO' ? 'bg-amber-50 border border-amber-200 text-amber-900' :
        'bg-red-50 border border-red-200 text-red-900'
      }`}>
        <Zap className="w-4 h-4" />
        <span>DATA MODE: <strong>{dataMode}</strong></span>
        {dataMode === 'DEMO' && (
          <span className="ml-auto text-xs">Test fixtures allowed</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filters.ingestion_method} onValueChange={(val) => setFilters({...filters, ingestion_method: val})}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Ingestion Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Methods</SelectItem>
            <SelectItem value="FILE_UPLOAD">File Upload</SelectItem>
            <SelectItem value="ERP_API">ERP API</SelectItem>
            <SelectItem value="ERP_EXPORT">ERP Export</SelectItem>
            <SelectItem value="SUPPLIER_PORTAL">Supplier Portal</SelectItem>
            <SelectItem value="API_PUSH">API Push</SelectItem>
            <SelectItem value="MANUAL_ENTRY">Manual Entry</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.provenance} onValueChange={(val) => setFilters({...filters, provenance: val})}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Provenance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="USER_PROVIDED">User Provided</SelectItem>
            <SelectItem value="SYSTEM_INTEGRATION">System Integration</SelectItem>
            {dataMode === 'DEMO' && <SelectItem value="TEST_FIXTURE">Test Fixture</SelectItem>}
          </SelectContent>
        </Select>

        <Select value={filters.ledger_state} onValueChange={(val) => setFilters({...filters, ledger_state: val})}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All States</SelectItem>
            <SelectItem value="INGESTED">Ingested</SelectItem>
            <SelectItem value="SEALED">Sealed</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>

        {dataMode === 'LIVE' ? (
           <Button disabled size="sm" className="text-xs opacity-50">
             Purge disabled (LIVE mode)
           </Button>
         ) : (
           <Button
             onClick={handlePurgeDemoData}
             disabled={isPurging || evidence.filter(e => e.provenance === 'TEST_FIXTURE' || e.provenance === 'DEMO_SEED').length === 0}
             variant="destructive"
             size="sm"
             className="gap-1"
           >
             <Trash2 className="w-3 h-3" />
             {isPurging ? 'Purging...' : 'Purge Test Fixtures'}
           </Button>
         )}
      </div>

      {/* Evidence List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="bg-slate-50">
            <CardContent className="p-6 text-center text-slate-500 text-sm">
              No evidence records match filters
            </CardContent>
          </Card>
        ) : (
          filtered.map(record => (
            <Card key={record.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedRecord(record)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-medium text-slate-900">{record.dataset_type}</h3>
                      <Badge className={`text-xs font-medium ${
                        record.ledger_state === 'SEALED' ? 'bg-green-100 text-green-800' :
                        record.ledger_state === 'INGESTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {record.ledger_state}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${
                        record.provenance === 'TEST_FIXTURE' ? 'border-amber-300 text-amber-700' :
                        'border-slate-300 text-slate-700'
                      }`}>
                        {record.provenance}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-600 mb-1">
                      <strong>Method:</strong> {record.ingestion_method}
                    </p>
                    <p className="text-xs text-slate-600 mb-1">
                      <strong>Origin:</strong> {record.origin_system_name || record.origin_system_type || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created by {record.created_by_user_id?.substring(0, 8)} on {new Date(record.ingestion_timestamp_utc).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500 mb-2">
                      {record.audit_event_count || 0} audit event{(record.audit_event_count || 0) !== 1 ? 's' : ''}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(record);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setSelectedRecord(null)}>
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="sticky top-0 bg-white border-b flex items-center justify-between">
              <CardTitle>Evidence Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>✕</Button>
            </CardHeader>
            
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs font-medium text-slate-600 mb-1">Evidence ID</p>
                  <code className="text-xs font-mono break-all text-slate-900">{selectedRecord.evidence_id}</code>
                </div>
                
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs font-medium text-slate-600 mb-1">Ledger State</p>
                  <p className="text-sm font-medium text-slate-900">{selectedRecord.ledger_state}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs font-medium text-slate-600 mb-1">Ingestion Method</p>
                  <p className="text-sm text-slate-900">{selectedRecord.ingestion_method}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs font-medium text-slate-600 mb-1">Provenance</p>
                  <p className="text-sm text-slate-900">{selectedRecord.provenance}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded col-span-2">
                  <p className="text-xs font-medium text-slate-600 mb-1">Origin System</p>
                  <p className="text-sm text-slate-900">{selectedRecord.origin_system_name || selectedRecord.origin_system_type || 'N/A'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded col-span-2">
                  <p className="text-xs font-medium text-slate-600 mb-1">Dataset Type</p>
                  <p className="text-sm text-slate-900">{selectedRecord.dataset_type}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded col-span-2">
                  <p className="text-xs font-medium text-slate-600 mb-1">Payload Hash (SHA-256)</p>
                  <code className="text-xs font-mono break-all text-slate-700">{selectedRecord.payload_hash_sha256 || '(not computed)'}</code>
                </div>

                <div className="p-3 bg-slate-50 rounded col-span-2">
                  <p className="text-xs font-medium text-slate-600 mb-1">Created By</p>
                  <p className="text-xs text-slate-900">{selectedRecord.created_by_user_id} on {new Date(selectedRecord.ingestion_timestamp_utc).toISOString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}