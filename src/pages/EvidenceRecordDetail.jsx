import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Database, FileText, Activity, Sparkles, Target, Plus, ListChecks, Clock, ExternalLink, GripVertical, X } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function EvidenceRecordDetail() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const recordId = searchParams.get('id') || searchParams.get('record_id');
  const [showWorkItemModal, setShowWorkItemModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [newWorkItem, setNewWorkItem] = useState({
    type: '',
    reason: '',
    priority: '',
    entity_id: ''
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dialogRef = useRef(null);

  // Query guard: only fetch if recordId is valid, never return undefined
  const { data: record = null, isLoading } = useQuery({
    queryKey: ['evidenceRecord', recordId],
    queryFn: async () => {
      if (!recordId) return null;
      try {
        const records = await base44.entities.Evidence.filter({ evidence_id: recordId });
        return records?.[0] ?? null;
      } catch (error) {
        console.error('[EvidenceRecordDetail] Query error:', error);
        return null;
      }
    },
    enabled: !!recordId,
    staleTime: 30000,
    retry: 1
  });

  // Drag handler effect - must be declared BEFORE any early returns
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Guard checks AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Loading evidence record...</div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Evidence record not found</div>
      </div>
    );
  }

  const handleDragStart = (e) => {
    if (e.target.closest('button, input, select, textarea, [role="combobox"]')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Mock data for Contract 2
  const mockWorkItems = [
    { id: 'WI-001', type: 'REVIEW', status: 'OPEN', priority: 'HIGH', owner: 'admin@example.com', created: '2026-02-01' },
    { id: 'WI-002', type: 'EXTRACTION', status: 'DONE', priority: 'MEDIUM', owner: 'AI Assistant', created: '2026-02-02' }
  ];

  const mockActivityTimeline = [
    { type: 'draft_created', timestamp: '2026-02-01T10:00:00Z', user: 'admin@example.com' },
    { type: 'evidence_sealed', timestamp: record?.ingestion_timestamp_utc, user: 'System' },
    { type: 'work_item_created', timestamp: '2026-02-01T10:30:00Z', user: 'admin@example.com', work_item_id: 'WI-001' },
    { type: 'extraction_executed', timestamp: '2026-02-02T11:00:00Z', user: 'AI Assistant' },
    { type: 'mapping_suggested', timestamp: '2026-02-02T11:15:00Z', user: 'AI Assistant', mapping_id: 'MAP-001' },
    { type: 'human_decision', timestamp: '2026-02-02T14:00:00Z', user: 'admin@example.com', decision_id: 'DEC-001' }
  ];

  const mockExtractionSummary = {
    extracted_fields_count: 12,
    avg_confidence: 0.87,
    last_extraction_run: '2026-02-02T11:00:00Z'
  };

  const mockExtractedFields = [
    { field_name: 'supplier_name', value: 'Acme Corp', confidence: 0.95, status: 'OK' },
    { field_name: 'invoice_number', value: 'INV-2026-001', confidence: 0.92, status: 'OK' },
    { field_name: 'total_amount', value: '15000', confidence: 0.65, status: 'LOW_CONFIDENCE' },
    { field_name: 'delivery_date', value: null, confidence: 0, status: 'MISSING' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header - Tesla Minimalist */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to={createPageUrl('EvidenceVault')}>
              <Button variant="ghost" size="sm" className="hover:bg-white/50 backdrop-blur-sm gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
                Back to Vault
              </Button>
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-[0.15em] font-medium mb-2">
              <Database className="w-3.5 h-3.5" />
              SupplyLens
            </div>
            <h1 className="text-3xl font-light text-slate-900 tracking-tight">Evidence Record</h1>
            <p className="text-slate-600 font-light mt-1">Immutable system of record • Contract 2 Reconciliation</p>
          </div>
        </div>
      </div>

      {/* Main Content - Unified Dashboard */}
      <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Record Header Card */}
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg p-8">
            <div className="grid grid-cols-4 gap-6">
              {/* ID Section */}
              <div className="col-span-1">
                <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Display ID</p>
                <p className="text-sm font-mono text-slate-900 break-all">{record.evidence_id}</p>
              </div>
              
              {/* Status */}
              <div className="col-span-1">
                <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Status</p>
                <Badge className={`${record.ledger_state === 'SEALED' ? 'bg-slate-900 text-white' : record.ledger_state === 'INGESTED' ? 'bg-slate-700 text-white' : 'bg-slate-600 text-white'}`}>
                  {record.ledger_state}
                </Badge>
              </div>

              {/* Dataset Type */}
              <div className="col-span-1">
                <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Dataset Type</p>
                <p className="text-sm text-slate-900 font-medium">{record.dataset_type}</p>
              </div>

              {/* Data Mode */}
              <div className="col-span-1">
                <p className="text-xs text-slate-500 uppercase tracking-[0.15em] font-semibold mb-2">Data Mode</p>
                <Badge variant="outline">{record.data_mode || 'LIVE'}</Badge>
              </div>
            </div>
          </div>

          {/* Next Action Banner */}
          {(() => {
            const hasEntityLink = record.linked_entity_id || record.canonical_payload?.entity_id;
            const state = record.ledger_state;
            
            let action = null;
            let actionText = '';
            let actionColor = '';
            
            if (state === 'DRAFT') {
              actionText = 'Next: Validate then Seal';
              actionColor = 'bg-blue-50 border-blue-200 text-blue-900';
              action = 'seal';
            } else if (state === 'SEALED' && !hasEntityLink) {
              actionText = 'Next: Create Mapping Work Item';
              actionColor = 'bg-amber-50 border-amber-200 text-amber-900';
              action = 'map';
            } else if (state === 'QUARANTINED') {
              actionText = 'Next: Resolve Quarantine';
              actionColor = 'bg-red-50 border-red-200 text-red-900';
              action = 'resolve';
            } else if (hasEntityLink) {
              actionText = 'Next: View Entity Coverage';
              actionColor = 'bg-green-50 border-green-200 text-green-900';
              action = 'view_coverage';
            }
            
            if (!actionText) return null;
            
            return (
              <div className={`border rounded-lg p-4 ${actionColor}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm font-medium">{actionText}</p>
                </div>
              </div>
            );
          })()}

          {/* Metadata & Actions Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Metadata */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-[0.15em]">Metadata</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 backdrop-blur-sm border border-slate-200/40 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">Ingestion Method</p>
                  <p className="text-sm text-slate-900 font-medium">{record.ingestion_method}</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm border border-slate-200/40 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">Source System</p>
                  <p className="text-sm text-slate-900 font-medium">{record.source_system || 'N/A'}</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm border border-slate-200/40 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">Ingested At</p>
                  <p className="text-sm text-slate-900">{new Date(record.ingestion_timestamp_utc).toLocaleString()}</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm border border-slate-200/40 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">Created By</p>
                  <p className="text-sm text-slate-900">{record.createdBy || 'System'}</p>
                </div>
              </div>
            </div>

            {/* Right: Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-[0.15em]">Actions</h3>
              <Dialog open={showWorkItemModal} onOpenChange={setShowWorkItemModal}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="w-4 h-4" />
                    Create Work Item
                  </Button>
                </DialogTrigger>
              <DialogContent ref={dialogRef} className="bg-gradient-to-br from-white/90 to-slate-50/80 backdrop-blur-xl border-2 border-slate-200/60 shadow-2xl max-w-lg p-0 flex flex-col fixed" style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                left: '50%',
                top: '50%',
                cursor: isDragging ? 'grabbing' : 'auto'
              }}>
                <div onMouseDown={handleDragStart} className="sticky top-0 border-b border-slate-200/50 bg-gradient-to-br from-white/50 to-transparent backdrop-blur-md py-4 px-6 flex items-center justify-between cursor-move hover:bg-white/60 transition-colors flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    <DialogTitle className="text-sm font-semibold text-slate-900">Create Work Item</DialogTitle>
                  </div>
                  <button onClick={() => setShowWorkItemModal(false)} className="p-1.5 hover:bg-slate-200/50 rounded-full transition-colors">
                  </button>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <Select value={newWorkItem.type} onValueChange={(v) => setNewWorkItem({...newWorkItem, type: v})}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="EXTRACTION">Extraction</SelectItem>
                      <SelectItem value="MAPPING">Mapping</SelectItem>
                      <SelectItem value="CONFLICT">Conflict</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={newWorkItem.reason} onChange={(e) => setNewWorkItem({...newWorkItem, reason: e.target.value})} placeholder="Reason Code" className="text-xs" />
                  <Select value={newWorkItem.priority} onValueChange={(v) => setNewWorkItem({...newWorkItem, priority: v})}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="w-full text-xs" onClick={() => {
                    console.log('Creating work item:', newWorkItem);
                    setShowWorkItemModal(false);
                  }}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white/60 backdrop-blur-xl border border-slate-200/60 rounded-lg overflow-hidden">
          <Tabs defaultValue="receipt" className="w-full">
            <TabsList className="w-full justify-start border-b border-slate-200/60 bg-transparent">
              <TabsTrigger value="receipt">Receipt</TabsTrigger>
              <TabsTrigger value="payload">Canonical Payload</TabsTrigger>
              <TabsTrigger value="pointers">Evidence Pointers</TabsTrigger>
              <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="receipt" className="p-6" style={{display: 'contents'}}>
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 uppercase tracking-[0.15em]">Immutable Receipt</h3>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-slate-200/60">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                    {JSON.stringify({
                      evidence_id: record.evidence_id,
                      ledger_state: record.ledger_state,
                      ingestion_timestamp_utc: record.ingestion_timestamp_utc,
                      dataset_type: record.dataset_type,
                      scope: record.scope,
                      binding: record.binding_context,
                      provenance: record.provenance
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payload" className="p-6" style={{display: 'contents'}}>
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 uppercase tracking-[0.15em]">Canonical Payload (Read-Only)</h3>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-slate-200/60 max-h-96 overflow-y-auto custom-scrollbar">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                    {JSON.stringify(record.canonical_payload, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pointers" className="p-6" style={{display: 'contents'}}>
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 uppercase tracking-[0.15em]">Evidence Pointers</h3>
                <p className="text-sm text-slate-600">File attachments, row/page pointers, and source references</p>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-slate-200/60">
                  <div className="text-sm text-slate-700">
                    {record.file_attachments?.length > 0 ? (
                      <div className="space-y-2">
                        {record.file_attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span>{file.file_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500">No file attachments</div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="reconciliation" className="p-6" style={{display: 'contents'}}>
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-900 uppercase tracking-[0.15em]">Reconciliation (Contract 2)</h3>

                {/* A) Work Items for this Evidence */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-slate-900">Work Items</h4>
                    <Dialog open={showWorkItemModal} onOpenChange={setShowWorkItemModal}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                          <Plus className="w-4 h-4" />
                          Create Work Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Work Item</DialogTitle>
                        </DialogHeader>
                        <div className="overflow-y-auto max-h-[calc(90vh-12rem)] space-y-4 p-6">
                          <div>
                            <Label>Type</Label>
                            <Select value={newWorkItem.type} onValueChange={(v) => setNewWorkItem({...newWorkItem, type: v})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="REVIEW">Review</SelectItem>
                                <SelectItem value="EXTRACTION">Extraction</SelectItem>
                                <SelectItem value="MAPPING">Mapping</SelectItem>
                                <SelectItem value="CONFLICT">Conflict</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Reason Code (required)</Label>
                            <Input
                              value={newWorkItem.reason}
                              onChange={(e) => setNewWorkItem({...newWorkItem, reason: e.target.value})}
                              placeholder="e.g. DATA_GAP, MISSING_EVIDENCE"
                            />
                          </div>
                          <div>
                            <Label>Priority</Label>
                            <Select value={newWorkItem.priority} onValueChange={(v) => setNewWorkItem({...newWorkItem, priority: v})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LOW">Low</SelectItem>
                                <SelectItem value="MEDIUM">Medium</SelectItem>
                                <SelectItem value="HIGH">High</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Evidence ID (locked)</Label>
                            <Input value={recordId} disabled />
                          </div>
                          <div>
                            <Label>Entity ID (optional)</Label>
                            <Input
                              value={newWorkItem.entity_id}
                              onChange={(e) => setNewWorkItem({...newWorkItem, entity_id: e.target.value})}
                              placeholder="e.g. supplier_id, sku_id"
                            />
                          </div>
                          <Button className="w-full" onClick={() => {
                            console.log('Creating work item:', newWorkItem);
                            setShowWorkItemModal(false);
                          }}>
                            Save Work Item
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="space-y-3">
                    {mockWorkItems.map((item) => (
                      <div key={item.id} className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-slate-900">{item.id}</span>
                            <Badge variant="outline">{item.type}</Badge>
                            <Badge className={
                              item.status === 'OPEN' ? 'bg-slate-700 text-white' :
                              item.status === 'IN_PROGRESS' ? 'bg-slate-600 text-white' :
                              'bg-slate-800 text-white'
                            }>{item.status}</Badge>
                            <Badge className={
                              item.priority === 'CRITICAL' ? 'bg-slate-900 text-white' :
                              item.priority === 'HIGH' ? 'bg-slate-800 text-white' :
                              'bg-slate-600 text-white'
                            }>{item.priority}</Badge>
                          </div>
                          <div className="text-xs text-slate-600">
                            Owner: {item.owner} • Created: {item.created}
                          </div>
                        </div>
                      </div>
                    ))}
                    {mockWorkItems.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No work items yet</p>
                    )}
                  </div>
                </div>

                {/* B) Activity Timeline */}
                <div>
                  <h4 className="text-base font-medium text-slate-900 mb-4">Activity Timeline (Append-Only)</h4>
                  <div className="space-y-3">
                    {mockActivityTimeline.map((event, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 border-white ${
                            event.type === 'evidence_sealed' ? 'bg-slate-900' :
                            event.type === 'human_decision' ? 'bg-slate-800' :
                            event.type === 'mapping_suggested' ? 'bg-slate-700' :
                            event.type === 'extraction_executed' ? 'bg-slate-600' :
                            'bg-slate-500'
                          }`}></div>
                          {idx < mockActivityTimeline.length - 1 && <div className="w-0.5 h-12 bg-slate-200"></div>}
                        </div>
                        <div className="pb-4">
                          <div className="text-sm font-semibold text-slate-900">
                            {event.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </div>
                          <div className="text-xs text-slate-600">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">By: {event.user}</div>
                          {event.type === 'human_decision' && (
                            <button
                              onClick={() => console.log('Open decision:', event.decision_id)}
                              className="text-xs text-slate-700 hover:text-slate-900 hover:underline mt-1 transition-colors"
                            >
                              View Decision →
                            </button>
                          )}
                          {event.type === 'mapping_suggested' && (
                            <button
                              onClick={() => setShowMappingModal(true)}
                              className="text-xs text-slate-700 hover:text-slate-900 hover:underline mt-1 transition-colors"
                            >
                              View Mapping Suggestions →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* C) Extraction Summary */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-medium text-slate-900">Extraction Summary</h4>
                    <Dialog open={showFieldsModal} onOpenChange={setShowFieldsModal}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2">
                          <ExternalLink className="w-4 h-4" />
                          View Extracted Fields
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Extracted Fields</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {mockExtractedFields.map((field, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-slate-900">{field.field_name}</p>
                                  <p className="text-sm text-slate-700 mt-1">{field.value || '(null)'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge className={
                                    field.status === 'OK' ? 'bg-green-100 text-green-800 text-xs' :
                                    field.status === 'LOW_CONFIDENCE' ? 'bg-yellow-100 text-yellow-800 text-xs' :
                                    'bg-red-100 text-red-800 text-xs'
                                  }>{field.status}</Badge>
                                  <span className="text-xs text-slate-600">
                                    Confidence: {(field.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/60">
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-600 mb-1">Extracted Fields</div>
                        <div className="text-2xl font-semibold text-slate-900">{mockExtractionSummary.extracted_fields_count}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/60">
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-600 mb-1">Avg Confidence</div>
                        <div className="text-2xl font-semibold text-slate-900">{(mockExtractionSummary.avg_confidence * 100).toFixed(0)}%</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border border-slate-200/60">
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-600 mb-1">Last Extraction</div>
                        <div className="text-sm text-slate-900">
                          {mockExtractionSummary.last_extraction_run ? 
                            new Date(mockExtractionSummary.last_extraction_run).toLocaleDateString() : 
                            'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Mapping Modal */}
                <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Mapping Suggestions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-slate-900">Supplier: "Acme Corp" → supplier_12345</p>
                        <p className="text-xs text-slate-600 mt-1">Confidence: 92%</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">Approve</Button>
                          <Button size="sm" variant="outline">Reject</Button>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-slate-900">SKU: "Product XYZ" → sku_67890</p>
                        <p className="text-xs text-slate-600 mt-1">Confidence: 85%</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">Approve</Button>
                          <Button size="sm" variant="outline">Reject</Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="p-6" style={{display: 'contents'}}>
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-slate-900 uppercase tracking-[0.15em]">Activity Timeline (Append-Only)</h3>
                <p className="text-sm text-slate-600">Chronological log of all events related to this evidence record</p>
                
                {/* Enhanced Timeline */}
                <div className="space-y-3">
                  {mockActivityTimeline.map((event, idx) => {
                    const getEventColor = () => {
                      if (event.type === 'evidence_sealed') return 'bg-slate-900';
                      if (event.type === 'human_decision') return 'bg-slate-800';
                      if (event.type === 'mapping_suggested') return 'bg-slate-700';
                      if (event.type === 'extraction_executed') return 'bg-slate-600';
                      if (event.type === 'work_item_created') return 'bg-slate-700';
                      return 'bg-slate-500';
                    };

                    const getEventLink = () => {
                      if (event.type === 'human_decision') {
                        return createPageUrl(`Contract2DecisionLog?decision_id=${event.decision_id}`);
                      }
                      if (event.type === 'mapping_suggested') {
                        return createPageUrl(`Contract2MappingSessions?mapping_id=${event.mapping_id}`);
                      }
                      if (event.type === 'work_item_created') {
                        return createPageUrl(`SupplyLens?work_item_id=${event.work_item_id}`);
                      }
                      if (event.type === 'extraction_executed') {
                        return createPageUrl(`Contract2ExtractionJobs`);
                      }
                      return null;
                    };

                    const eventLink = getEventLink();

                    return (
                      <div key={idx} className="flex gap-4 bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4 hover:border-slate-300/80 hover:shadow-md transition-all">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full border border-white shadow-sm ${getEventColor()}`}></div>
                          {idx < mockActivityTimeline.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-2"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {eventLink ? (
                                <Link to={eventLink}>
                                  <div className="text-sm font-semibold text-slate-900 hover:text-slate-600 cursor-pointer flex items-center gap-2 transition-colors">
                                    {event.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    <ExternalLink className="w-3 h-3" />
                                  </div>
                                </Link>
                              ) : (
                                <div className="text-sm font-semibold text-slate-900">
                                  {event.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1 text-xs text-slate-600">
                                  <Clock className="w-3 h-3" />
                                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}
                                </div>
                                <div className="text-xs text-slate-500">
                                  By: {event.user}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {event.work_item_id && (
                                <Badge variant="outline" className="text-xs font-mono">{event.work_item_id}</Badge>
                              )}
                              {event.decision_id && (
                                <Badge variant="outline" className="text-xs font-mono">{event.decision_id}</Badge>
                              )}
                              {event.mapping_id && (
                                <Badge variant="outline" className="text-xs font-mono">{event.mapping_id}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Related Objects */}
                <div className="mt-8 pt-6 border-t-2 border-slate-200/60">
                  <h4 className="text-base font-medium text-slate-900 mb-4">Related Objects</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Extraction Jobs Panel */}
                    <Link to={createPageUrl(`Contract2ExtractionJobs?record_id=${record.evidence_id}`)}>
                      <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4 hover:border-slate-300/80 hover:shadow-lg transition-all cursor-pointer">
                        <div className="text-sm font-semibold text-slate-900 mb-2">Extraction Jobs</div>
                        <div className="text-2xl font-bold text-slate-700">{record.extraction_job_ids?.length || 0}</div>
                        <div className="text-xs text-slate-600 mt-2">Click to view</div>
                      </div>
                    </Link>

                    {/* Mapping Sessions Panel */}
                    <Link to={createPageUrl(`Contract2MappingSessions?record_id=${record.evidence_id}`)}>
                      <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4 hover:border-slate-300/80 hover:shadow-lg transition-all cursor-pointer">
                        <div className="text-sm font-semibold text-slate-900 mb-2">Mapping Sessions</div>
                        <div className="text-2xl font-bold text-slate-700">{record.mapping_session_ids?.length || 0}</div>
                        <div className="text-xs text-slate-600 mt-2">Click to view</div>
                      </div>
                    </Link>

                    {/* Decisions Panel */}
                    <Link to={createPageUrl(`Contract2DecisionLog?record_id=${record.evidence_id}`)}>
                      <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4 hover:border-slate-300/80 hover:shadow-lg transition-all cursor-pointer">
                        <div className="text-sm font-semibold text-slate-900 mb-2">Decisions</div>
                        <div className="text-2xl font-bold text-slate-700">{record.decision_ids?.length || 0}</div>
                        <div className="text-xs text-slate-600 mt-2">Click to view</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }