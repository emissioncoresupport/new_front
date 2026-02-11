import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Eye, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ProvenancePanel from './ProvenancePanel';

export default function EvidenceVaultWithProvenance() {
  const [tenantFilter, setTenantFilter] = useState('CURRENT');
  const [createdViaFilter, setCreatedViaFilter] = useState('ALL');
  const [provenanceFilter, setProvenanceFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [isAdmin, setIsAdmin] = useState(true); // TODO: get from user
  const [currentTenant, setCurrentTenant] = useState('PRODUCTION');

  const { data: allEvidence = [], refetch } = useQuery({
    queryKey: ['evidenceWithProvenance'],
    queryFn: async () => {
      const records = await base44.asServiceRole.entities.Evidence.list('-ingestion_timestamp_utc');
      return records;
    },
    refetchInterval: null
  });

  // Apply filters
  const filteredEvidence = allEvidence.filter(e => {
    // Tenant filter
    if (tenantFilter === 'CURRENT' && e.tenant_id !== currentTenant) return false;
    if (tenantFilter === 'DEMO' && e.tenant_id !== 'DEMO_TENANT') return false;
    if (tenantFilter === 'TEST' && e.tenant_id !== 'TEST_TENANT') return false;

    // Created via filter
    if (createdViaFilter !== 'ALL' && e.created_via !== createdViaFilter) return false;

    // Provenance filter
    if (provenanceFilter === 'COMPLETE' && e.provenance_incomplete) return false;
    if (provenanceFilter === 'INCOMPLETE' && !e.provenance_incomplete) return false;

    return true;
  });

  const handlePurge = async () => {
    if (purgeConfirmText !== 'PURGE') {
      toast.error('Type "PURGE" to confirm');
      return;
    }

    try {
      const demoDemoRecords = allEvidence.filter(e => 
        ['SEED', 'TEST_RUNNER'].includes(e.created_via) ||
        ['DEMO_TENANT', 'TEST_TENANT'].includes(e.tenant_id)
      );

      let purgedCount = 0;
      for (const record of demoDemoRecords) {
        await base44.asServiceRole.entities.Evidence.delete(record.id);
        purgedCount++;
      }

      // Log audit event
      await base44.asServiceRole.entities.AuditEvent.create({
        audit_event_id: crypto.randomUUID(),
        tenant_id: currentTenant,
        evidence_id: 'SYSTEM',
        actor_user_id: 'ADMIN_PURGE',
        action: 'DATA_PURGE_EXECUTED',
        reason_code: 'DEMO_TEST_CLEANUP',
        request_id: crypto.randomUUID(),
        context_json: {
          purged_count: purgedCount,
          timestamp: new Date().toISOString()
        },
        created_at_utc: new Date().toISOString()
      });

      toast.success(`Purged ${purgedCount} demo/test records`);
      setPurgeConfirmText('');
      setShowPurgeDialog(false);
      refetch();
    } catch (error) {
      toast.error('Purge failed: ' + error.message);
    }
  };

  // Get tenant data mode from settings
  const { data: tenantSettings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      try {
        const settings = await base44.asServiceRole.entities.Company.filter({
          tenant_id: currentTenant
        });
        return settings?.[0] || { data_mode: 'LIVE' };
      } catch {
        return { data_mode: 'LIVE' };
      }
    }
  });
  
  const dataMode = tenantSettings?.data_mode || 'LIVE';

  return (
    <div className="space-y-6">
      {/* Data Mode Banner */}
      <div className={`rounded-lg p-3 border font-medium text-sm flex items-center gap-2 ${
        dataMode === 'LIVE' ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-200 text-blue-900' :
        dataMode === 'DEMO' ? 'bg-gradient-to-r from-amber-50 to-amber-50/50 border-amber-200 text-amber-900' :
        'bg-gradient-to-r from-red-50 to-red-50/50 border-red-200 text-red-900'
      }`}>
        <span className="text-lg">⚡</span>
        DATA MODE: <strong>{dataMode}</strong>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Tenant</label>
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT">Current Tenant</SelectItem>
                  <SelectItem value="DEMO">Demo Tenant</SelectItem>
                  <SelectItem value="TEST">Test Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Created Via</label>
              <Select value={createdViaFilter} onValueChange={setCreatedViaFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="UI">UI</SelectItem>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="CONNECTOR">Connector</SelectItem>
                  <SelectItem value="TEST_RUNNER">Test Runner</SelectItem>
                  <SelectItem value="SEED">Seed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Provenance</label>
              <Select value={provenanceFilter} onValueChange={setProvenanceFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="COMPLETE">Complete</SelectItem>
                  <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="flex items-end">
                <Button
                  onClick={() => setShowPurgeDialog(true)}
                  size="sm"
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50 gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Purge Demo/Test
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evidence List */}
      <div className="space-y-2">
        {filteredEvidence.length === 0 ? (
          <Card className="bg-slate-50">
            <CardContent className="p-6 text-center text-slate-600">
              No evidence records match filters
            </CardContent>
          </Card>
        ) : (
          filteredEvidence.map(record => (
            <Card key={record.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-slate-900">{record.dataset_type}</h3>
                      <Badge variant="outline" className="text-xs">
                        {record.evidence_status}
                      </Badge>
                      <Badge className={`text-xs ${
                        record.created_via === 'SEED' ? 'bg-amber-100 text-amber-800' :
                        record.created_via === 'TEST_RUNNER' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {record.created_via}
                      </Badge>
                      {record.provenance_incomplete && (
                        <Badge variant="destructive" className="text-xs">⚠ INCOMPLETE</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      {record.source_system} • {record.ingestion_method}
                    </p>
                    {/* Provenance Badge */}
                    <div className="text-xs text-slate-500 font-mono space-y-0.5">
                      <div>📦 {record.created_via} • {record.tenant_id}</div>
                      <div>👤 {record.created_by_actor_id?.substring(0, 12)}...</div>
                      <div>🔗 {record.request_id?.substring(0, 12)}...</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedRecord(record)}
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="flex items-center justify-between sticky top-0 bg-white border-b">
              <CardTitle>Evidence Record Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRecord(null)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs font-medium text-slate-600 mb-1">Evidence ID</p>
                  <p className="font-mono text-sm text-slate-900 break-all">{selectedRecord.evidence_id}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <p className="text-xs font-medium text-slate-600 mb-1">Status</p>
                  <p className="font-mono text-sm text-slate-900">{selectedRecord.evidence_status}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded col-span-2">
                  <p className="text-xs font-medium text-slate-600 mb-1">Dataset Type</p>
                  <p className="text-sm text-slate-900">{selectedRecord.dataset_type}</p>
                </div>
              </div>
              <ProvenancePanel evidence={selectedRecord} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purge Dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Purge Demo/Test Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all records with created_via=SEED/TEST_RUNNER or in DEMO_TENANT/TEST_TENANT.
              <br /><br />
              Type <strong>"PURGE"</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            placeholder="Type PURGE..."
            value={purgeConfirmText}
            onChange={(e) => setPurgeConfirmText(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm font-mono"
          />
          <AlertDialogAction
            onClick={handlePurge}
            disabled={purgeConfirmText !== 'PURGE'}
            className="bg-red-600 hover:bg-red-700"
          >
            Purge Now
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}