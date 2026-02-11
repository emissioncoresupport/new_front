import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Trash2, Search, Settings, Plus } from 'lucide-react';
import SimpleEvidenceFilters from '@/components/supplylens/SimpleEvidenceFilters';
import EvidenceRowDetail from '@/components/supplylens/EvidenceRowDetail';
import EvidenceNotFoundBanner from './EvidenceNotFoundBanner';
import AdvancedEvidenceFilters from './AdvancedEvidenceFilters';
import DraftsPanel from './DraftsPanel';
import ReviewHistoryPanel from './ReviewHistoryPanel';
import IngestionWizardRegistryDriven from './IngestionWizardRegistryDriven';
import * as mockDataRegistry from './mockDataRegistry';
import { EvidenceService, AuditEventService } from './contract2/services';
import { ACTIVE_TENANT_ID } from './contract2/data';
import { safeDate } from './contract2/utils';

/**
 * Evidence Vault — Compliance Grade + Deep Link Support
 * Shows: origin, data_mode, ledger_state, retention_ends_at_utc, quarantine status
 * Excludes quarantined & TEST_FIXTURE from LIVE counts
 * Supports query params: ?focusEvidenceId=EV-123&status=SEALED&datasetType=BOM&method=FILE_UPLOAD
 */

export default function EvidenceVaultCompliance({ 
  initialSearch = '', 
  focusRecordId,
  focusDisplayId,
  filterPresets = {},
  initialTab = 'records'
}) {
  const [showQuarantined, setShowQuarantined] = useState(false);
  const [showTestFixtures, setShowTestFixtures] = useState(false);
  const [focusedEvidenceId, setFocusedEvidenceId] = useState(null);
  const [resolvedFocusRecord, setResolvedFocusRecord] = useState(null);
  const [multipleMatches, setMultipleMatches] = useState([]);
  const [fuzzyMatches, setFuzzyMatches] = useState([]);
  const [evidenceNotFound, setEvidenceNotFound] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showIngestionWizard, setShowIngestionWizard] = useState(false);
  const focusedRowRef = useRef(null);
  
  const [filters, setFilters] = useState({
    search: initialSearch,
    status: 'all',
    datasetType: 'all',
    ingestionMethod: '',
    sourceSystem: '',
    dateFrom: '',
    dateTo: '',
    ingestedBy: ''
  });

  // Auto-open wizard if URL param is set
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openWizard') === 'true') {
      setShowIngestionWizard(true);
      // Clean URL
      params.delete('openWizard');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, []);

  // Resolve focus evidence from recordId or displayId (with timeout)
  useEffect(() => {
    const resolveFocus = async () => {
      if (focusRecordId || focusDisplayId) {
        setIsResolving(true);
        
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 8000)
          );
          
          const fetchPromise = (async () => {
            const { demoStore } = await import('./DemoDataStore');
            // Use indexed O(1) lookup
            return focusDisplayId 
              ? demoStore.getEvidenceByDisplayId(focusDisplayId)
              : demoStore.getEvidenceByRecordId(focusRecordId);
          })();
          
          const record = await Promise.race([fetchPromise, timeoutPromise]);
          
          setIsResolving(false);
        
        if (record) {
          // Convert to expected format
          setResolvedFocusRecord({
            id: record.record_id,
            recordId: record.record_id,
            displayId: record.display_id,
            status: record.status,
            sealedStatus: record.status,
            datasetType: record.dataset_type,
            ingestionMethod: record.ingestion_method,
            sourceSystem: record.source_system,
            ingestedBy: record.ingested_by,
            ingestedAtUtc: record.ingested_at_utc,
            sealedAtUtc: record.sealed_at_utc,
            retentionEndsUtc: record.retention_ends_utc,
            payloadHashSha256: record.payload_hash_sha256,
            metadataHashSha256: record.metadata_hash_sha256,
            linkedEntities: record.linked_entities
          });
          setEvidenceNotFound(false);
          setFocusedEvidenceId(focusDisplayId || focusRecordId);
        } else {
          setResolvedFocusRecord(null);
          setEvidenceNotFound(true);
          setFocusedEvidenceId(focusDisplayId || focusRecordId);
        }
        } catch (error) {
          setIsResolving(false);
          
          if (error.message === 'TIMEOUT') {
            toast.error('Evidence lookup timed out', {
              description: 'Still loading...',
              action: {
                label: 'Retry',
                onClick: () => window.location.reload()
              },
              duration: 10000
            });
          }
          
          setEvidenceNotFound(true);
          setFocusedEvidenceId(focusDisplayId || focusRecordId);
        }
      }
    };
    
    resolveFocus();
  }, [focusRecordId, focusDisplayId]);

  // Fetch evidence records with grant-based authz for buyers (with pagination)
  const currentFilters = filters;
  const { data: evidence = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ['demo-evidence-vault', currentFilters.status, currentFilters.datasetType],
    queryFn: async () => {
      const { demoStore } = await import('./DemoDataStore');
      const currentTenant = 'BuyerOrgA'; // Auth context simulation
      const grants = JSON.parse(localStorage.getItem('supplier_grants') || '[]');
      
      // Server-side filtering
      const serverFilters = {};
      if (currentFilters.status !== 'all') serverFilters.status = currentFilters.status;
      if (currentFilters.datasetType !== 'all') serverFilters.dataset_type = currentFilters.datasetType;
      
      const result = demoStore.listEvidence({ page: 1, pageSize: 500, filters: serverFilters });
      const allEvidence = result.data;
      
      // Filter: buyer sees only own evidence + supplier evidence with active grant
      const filtered = allEvidence.filter(ev => {
        if (ev.owner_org_id === currentTenant || !ev.owner_org_id) return true;
        
        const hasGrant = grants.some(g => 
          g.status === 'ACTIVE' &&
          g.evidence_id === ev.record_id &&
          g.buyer_org_id === currentTenant
        );
        
        if (!hasGrant) {
          const accessLog = {
            log_id: `LOG-${Date.now()}`,
            evidence_id: ev.record_id,
            tenant: currentTenant,
            actor: 'buyer_user@example.com',
            action: 'VIEW_ATTEMPT',
            allowed: false,
            reason: 'NO_ACTIVE_GRANT',
            timestamp: new Date().toISOString()
          };
          const logs = JSON.parse(localStorage.getItem('buyer_access_logs') || '[]');
          logs.push(accessLog);
          localStorage.setItem('buyer_access_logs', JSON.stringify(logs));
        }
        
        return hasGrant;
      });
      
      return filtered.map(ev => ({
        ...ev,
        id: ev.record_id,
        displayId: ev.display_id,
        datasetType: ev.dataset_type,
        status: ev.status,
        ingestedAt: ev.ingested_at_utc,
        ingestionMethod: ev.ingestion_method,
        sourceSystem: ev.source_system
      }));
    },
    staleTime: 60000 // Cache for 60 seconds
  });

  const { data: evidenceDrafts = [] } = useQuery({
    queryKey: ['demo-evidence-drafts'],
    queryFn: async () => {
      const { demoStore } = await import('./DemoDataStore');
      return demoStore.listEvidenceDrafts();
    }
  });

  const { data: auditEvents = [] } = useQuery({
    queryKey: ['demo-audit-events'],
    queryFn: async () => {
      const { demoStore } = await import('./DemoDataStore');
      return demoStore.listAuditEvents({ object_type: 'evidence_record' });
    }
  });
  
  const dataMode = 'LIVE';

  // Apply filters - convert evidence to expected format
  const formattedEvidence = evidence.map(e => ({
    id: e.record_id,
    recordId: e.record_id,
    displayId: e.display_id,
    status: e.status,
    sealedStatus: e.status,
    datasetType: e.dataset_type,
    ingestionMethod: e.ingestion_method,
    sourceSystem: e.source_system,
    ingestedBy: e.ingested_by,
    ingestedAtUtc: e.ingested_at_utc,
    payloadHashSha256: e.payload_hash_sha256,
    metadataHashSha256: e.metadata_hash_sha256,
    tenantId: e.tenant_id
  }));
  
  let filteredEvidence = formattedEvidence.filter(ev => {
    if (ev.sealedStatus === 'QUARANTINED' || ev.status === 'QUARANTINED') return false;
    return true;
  });

  // Search filter
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filteredEvidence = filteredEvidence.filter(e =>
      e.displayId?.toLowerCase().includes(search) ||
      e.recordId?.toLowerCase().includes(search) ||
      e.datasetType?.toLowerCase().includes(search) ||
      e.sourceSystem?.toLowerCase().includes(search)
    );
  }

  // Status filter
  if (filters.status !== 'all') {
    filteredEvidence = filteredEvidence.filter(e => e.status === filters.status);
  }

  // Dataset type filter
  if (filters.datasetType !== 'all') {
    filteredEvidence = filteredEvidence.filter(e => e.datasetType === filters.datasetType);
  }

  // Advanced filters
  if (filters.ingestionMethod) {
    filteredEvidence = filteredEvidence.filter(e => e.ingestionMethod === filters.ingestionMethod);
  }

  if (filters.sourceSystem) {
    filteredEvidence = filteredEvidence.filter(e => 
      e.sourceSystem?.toLowerCase().includes(filters.sourceSystem.toLowerCase())
    );
  }

  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom).getTime();
    filteredEvidence = filteredEvidence.filter(e => 
      new Date(e.ingestedAtUtc).getTime() >= fromDate
    );
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo).getTime();
    filteredEvidence = filteredEvidence.filter(e => 
      new Date(e.ingestedAtUtc).getTime() <= toDate
    );
  }

  if (filters.ingestedBy) {
    filteredEvidence = filteredEvidence.filter(e => 
      e.ingestedBy?.toLowerCase().includes(filters.ingestedBy.toLowerCase())
    );
  }

  const validEvidence = filteredEvidence;
  const sealedCount = validEvidence.filter(e => e.sealedStatus === 'SEALED').length;
  const ingestedCount = validEvidence.filter(e => e.status === 'INGESTED').length;
  const quarantinedEvidence = evidence.filter(e => e.sealedStatus === 'QUARANTINED');
  const testFixtureEvidence = evidence.filter(e => e.origin === 'TEST_FIXTURE');

  // Scroll to focused record if resolved
  useEffect(() => {
    if (resolvedFocusRecord && focusedRowRef.current) {
      setTimeout(() => {
        focusedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [resolvedFocusRecord]);

  const clearFocusAndRetry = () => {
    setFocusedEvidenceId(null);
    setResolvedFocusRecord(null);
    setMultipleMatches([]);
    setEvidenceNotFound(false);
    setFilters({
      search: '',
      status: 'all',
      datasetType: 'all',
      ingestionMethod: '',
      sourceSystem: '',
      dateFrom: '',
      dateTo: '',
      ingestedBy: ''
    });
    window.history.replaceState({}, '', window.location.pathname);
  };

  const showAllEvidence = () => {
    setFocusedEvidenceId(null);
    setResolvedFocusRecord(null);
    setEvidenceNotFound(false);
    setFilters({
      search: '',
      status: 'all',
      datasetType: 'all',
      ingestionMethod: '',
      sourceSystem: '',
      dateFrom: '',
      dateTo: '',
      ingestedBy: ''
    });
    window.history.replaceState({}, '', window.location.pathname);
  };





  return (
    <div className="space-y-6">
      <Tabs defaultValue={initialTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {quarantinedEvidence.length > 0 && (
              <Button 
                onClick={() => setShowQuarantined(!showQuarantined)} 
                variant={showQuarantined ? "default" : "outline"}
                size="sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Quarantined ({quarantinedEvidence.length})
              </Button>
            )}
          </div>
        </div>

        <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg p-1">
          <TabsTrigger value="records" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Records
          </TabsTrigger>
          <TabsTrigger value="drafts" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Drafts
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
            Review History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">

      {/* Counts */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-light text-slate-900">{validEvidence.length}</p>
            <p className="text-xs text-slate-600 font-light uppercase tracking-wider mt-1">Filtered Records</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-light text-slate-900">{sealedCount}</p>
            <p className="text-xs text-slate-600 font-light uppercase tracking-wider mt-1">Sealed</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-light text-slate-900">{ingestedCount}</p>
            <p className="text-xs text-slate-600 font-light uppercase tracking-wider mt-1">Ingested</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-light text-slate-900">{quarantinedEvidence.length}</p>
            <p className="text-xs text-slate-600 font-light uppercase tracking-wider mt-1">Quarantined</p>
          </CardContent>
        </Card>
      </div>

      {/* Multiple Matches Panel */}
      {multipleMatches.length > 0 && (
        <Card className="bg-blue-50/80 backdrop-blur-sm border-blue-300 border rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Multiple Matches Found</p>
                <p className="text-xs text-blue-800 mt-1">
                  Found {multipleMatches.length} records matching <span className="font-mono font-semibold">{focusedEvidenceId}</span>. Select one:
                </p>
                <div className="space-y-2 mt-3">
                  {multipleMatches.map((record) => (
                    <Button
                      key={record.id}
                      onClick={() => selectFromMatches(record)}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start border-blue-200 hover:bg-blue-100 text-left gap-2"
                    >
                      <span className="text-xs text-slate-700 font-mono">{record.evidenceId || record.displayId || record.evidence_id}</span>
                      <Badge variant="outline" className="text-xs">{record.datasetType || record.dataset_type}</Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence Not Found Banner */}
      {evidenceNotFound && focusedEvidenceId && multipleMatches.length === 0 && (
        <EvidenceNotFoundBanner
          focusValue={focusedEvidenceId}
          onClearRetry={clearFocusAndRetry}
          onShowAll={showAllEvidence}
        />
      )}

      {/* Evidence Vault with Simplified Filters */}
      <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl shadow-lg rounded-xl">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-light tracking-tight text-slate-900">Evidence Records</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(true)}
                    className="gap-2 border border-slate-300 hover:bg-white/90 rounded-lg"
                  >
                    <Settings className="w-4 h-4" />
                    More Filters
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Date range, ingestion method, source system, ingested by</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimpleEvidenceFilters evidence={evidence} filters={filters} setFilters={setFilters} />
          
          <div className="space-y-3">
            {validEvidence.length === 0 && !resolvedFocusRecord ? (
              <p className="text-sm text-slate-500 py-8 text-center">No evidence matches current filters</p>
            ) : (
              <>
                {/* Show resolved focus record first, even if filtered out */}
                {resolvedFocusRecord && (
                  <div
                    ref={focusedRowRef}
                    className="animate-pulse-highlight border-2 border-amber-300 rounded-lg"
                  >
                    <EvidenceRowDetail evidence={resolvedFocusRecord} autoExpand={true} />
                  </div>
                )}
                {/* Then show filtered results */}
                {validEvidence.map((record) => {
                  // Skip if this is the resolved focus record (already shown above)
                  if (resolvedFocusRecord && (record.id === resolvedFocusRecord.id || record.record_id === resolvedFocusRecord.recordId)) {
                    return null;
                  }
                  const isFocused = focusDisplayId && (record.displayId === focusDisplayId || record.display_id === focusDisplayId);
                  return (
                    <div key={record.id || record.record_id}>
                      <EvidenceRowDetail evidence={record} autoExpand={isFocused} isHighlighted={isFocused} />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Drawer */}
      {showAdvancedFilters && (
        <AdvancedEvidenceFilters
          filters={filters}
          onFilterChange={setFilters}
          onClose={() => setShowAdvancedFilters(false)}
        />
      )}

      {/* Quarantined Evidence View */}
      {showQuarantined && quarantinedEvidence.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-blue-900 font-medium flex items-center gap-2">
                  🧪 Test Fixtures
                  <Badge className="bg-blue-100 text-blue-700">{dataMode} mode</Badge>
                </p>
              </div>
              <p className="text-xs text-blue-700">TEST_FIXTURE origin records visible in {dataMode} mode only</p>
            </div>
            {testFixtureEvidence.map((record) => (
              <div key={record.id} className="bg-white rounded p-3 text-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{record.datasetType || record.dataset_type}</p>
                    <p className="text-xs text-slate-600 font-mono">{record.evidenceId || record.displayId || record.evidence_id}</p>
                  </div>
                  <Badge>{record.status || record.ledgerState || record.ledger_state}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Ingested: {safeDate(record.ingestedAtUtc, 'full')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quarantined Evidence View */}
      {showQuarantined && quarantinedEvidence.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 space-y-3">
            <div>
              <p className="text-red-900 font-medium">⚠️ Quarantined Records</p>
              <p className="text-xs text-red-700">Excluded from valid counts</p>
            </div>
            {quarantinedEvidence.map((record) => (
              <div key={record.recordId} className="bg-white rounded p-3 text-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{record.datasetType}</p>
                    <p className="text-xs text-slate-600 font-mono">{record.displayId}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-800">QUARANTINED</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">Ingested: {safeDate(record.ingestedAtUtc, 'full')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-6">
          <DraftsPanel />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <ReviewHistoryPanel />
        </TabsContent>
      </Tabs>

      {/* Ingestion Wizard Modal */}
      {showIngestionWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <IngestionWizardRegistryDriven
            onComplete={() => setShowIngestionWizard(false)}
            onCancel={() => setShowIngestionWizard(false)}
            mode="production"
          />
        </div>
      )}
    </div>
  );
}