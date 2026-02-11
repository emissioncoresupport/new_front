import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, Lock, Search, Calendar, AlertTriangle, ExternalLink,
  Filter, X, Database, AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const CONTRACT1_ALLOWED_STATES = ['INGESTED', 'SEALED', 'REJECTED', 'FAILED', 'SUPERSEDED'];
const LEGACY_STATE_MAP = {
  'RAW': 'INGESTED',
  'CLASSIFIED': 'REJECTED',
  'STRUCTURED': 'REJECTED'
};

/**
 * CONTRACT 1 — Evidence Vault (Browse-Only)
 * 
 * Filterable table view of sealed evidence
 * No modifications allowed — read-only by design
 * Click to view receipt details and audit trail
 */

export default function EvidenceVault() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [datasetTypeFilter, setDatasetTypeFilter] = useState('all');
  const [sourceSystemFilter, setSourceSystemFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const { data: evidenceRecords = [], isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list('-sealed_at_utc')
  });

  const { data: auditEvents = [] } = useQuery({
    queryKey: ['evidence-audit'],
    queryFn: () => base44.entities.EvidenceAuditEvent.list('-timestamp_utc')
  });

  // Contract 1: Normalize states and validate sealing
  const normalizeState = (evidence) => {
    const originalState = evidence.state;
    let _displayState = originalState;
    let _isViolation = false;
    let _validationStatus = 'VALID';

    // Check for legacy states
    if (LEGACY_STATE_MAP[originalState]) {
      _displayState = LEGACY_STATE_MAP[originalState];
      _isViolation = true;
      _validationStatus = 'LEGACY';
    } else if (!CONTRACT1_ALLOWED_STATES.includes(originalState)) {
      _displayState = 'REJECTED';
      _isViolation = true;
      _validationStatus = 'INVALID';
    }

    // If SEALED, verify sealed_at_utc and hashes exist
    if (_displayState === 'SEALED') {
      const hasSealedAt = !!evidence.sealed_at_utc;
      const hasPayloadHash = !!evidence.payload_hash_sha256;
      const hasMetadataHash = !!evidence.metadata_hash_sha256;
      
      if (!hasSealedAt || !hasPayloadHash || !hasMetadataHash) {
        _validationStatus = 'INVALID';
        _isViolation = true;
      }
    }

    return { 
      ...evidence, 
      _displayState, 
      _isViolation, 
      _originalState: originalState,
      _validationStatus
    };
  };

  const validEvidence = evidenceRecords.map(normalizeState).filter(e => e._displayState !== 'FAILED');

  // Apply filters
  const filteredEvidence = validEvidence.filter(e => {
    const matchesSearch = !searchQuery || 
      e.evidence_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.file_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesState = stateFilter === 'all' || e.state === stateFilter;
    const matchesDatasetType = datasetTypeFilter === 'all' || e.dataset_type === datasetTypeFilter;
    const matchesSourceSystem = sourceSystemFilter === 'all' || e.source_system === sourceSystemFilter;
    const matchesIntent = intentFilter === 'all' || e.declared_intent === intentFilter;

    return matchesSearch && matchesState && matchesDatasetType && matchesSourceSystem && matchesIntent;
  });

  const uniqueDatasetTypes = [...new Set(validEvidence.map(e => e.dataset_type).filter(Boolean))];
  const uniqueSourceSystems = [...new Set(validEvidence.map(e => e.source_system).filter(Boolean))];
  const uniqueIntents = [...new Set(validEvidence.map(e => e.declared_intent).filter(Boolean))];

  const getStateColor = (state, isViolation = false) => {
    if (isViolation) {
      return 'bg-red-100 text-red-700 border-red-300';
    }
    const colors = {
      'INGESTED': 'bg-slate-100 text-slate-700 border-slate-300',
      'SEALED': 'bg-green-100 text-green-700 border-green-300',
      'SUPERSEDED': 'bg-amber-100 text-amber-700 border-amber-300',
      'REJECTED': 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[state] || 'bg-slate-100 text-slate-700';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStateFilter('all');
    setDatasetTypeFilter('all');
    setSourceSystemFilter('all');
    setIntentFilter('all');
  };

  const activeFilterCount = [stateFilter, datasetTypeFilter, sourceSystemFilter, intentFilter].filter(f => f !== 'all').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading evidence vault...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="outline" className="text-xs">{activeFilterCount} active</Badge>
              )}
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="INGESTED">INGESTED</SelectItem>
                <SelectItem value="SEALED">SEALED</SelectItem>
                <SelectItem value="CLASSIFIED">CLASSIFIED</SelectItem>
                <SelectItem value="STRUCTURED">STRUCTURED</SelectItem>
                <SelectItem value="SUPERSEDED">SUPERSEDED</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
              </SelectContent>
            </Select>

            <Select value={datasetTypeFilter} onValueChange={setDatasetTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dataset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueDatasetTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceSystemFilter} onValueChange={setSourceSystemFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {uniqueSourceSystems.map(sys => (
                  <SelectItem key={sys} value={sys}>{sys}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Declared Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intents</SelectItem>
                {uniqueIntents.map(intent => (
                  <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input 
              placeholder="Search by Evidence ID or filename..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/40 backdrop-blur-sm border-white/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Counter */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Database className="w-4 h-4" />
          <span className="font-medium">{filteredEvidence.length}</span> 
          <span className="font-light">records</span>
        </div>
      </div>

      {/* Evidence Table */}
      {filteredEvidence.length === 0 ? (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-light">No evidence found</p>
            <p className="text-sm text-slate-400 mt-2">Try adjusting your filters or upload new evidence</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl border border-white/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/40 backdrop-blur-md border-b border-white/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Evidence ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Dataset Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Source System</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Intent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">State</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Sealed At (UTC)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Hash (Short)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 tracking-wide">Validation</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {filteredEvidence.map((evidence) => (
                  <tr 
                    key={evidence.id} 
                    className="hover:bg-white/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvidence(evidence)}
                  >
                    <td className="px-6 py-4 text-sm">
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-slate-900">{evidence.evidence_id ? evidence.evidence_id.substring(0, 16) : 'N/A'}...</p>
                        <p className="text-xs text-slate-500">{evidence.file_name || 'API Payload'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs font-normal">{evidence.dataset_type}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs font-normal">{evidence.source_system}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{evidence.declared_intent}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <Badge className={`${getStateColor(evidence._displayState, evidence._isViolation)} border text-xs`}>
                          {evidence._isViolation && <AlertCircle className="w-3 h-3 mr-1 inline" />}
                          {evidence._displayState}
                        </Badge>
                        {evidence._isViolation && (
                          <p className="text-xs text-red-600 font-medium">Contract violation</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {evidence.sealed_at_utc ? new Date(evidence.sealed_at_utc).toLocaleString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {evidence._displayState === 'SEALED' && !evidence.payload_hash_sha256 ? (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-600 font-medium">MISSING</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span className="font-mono text-xs text-slate-600">
                            {evidence.payload_hash_sha256 ? evidence.payload_hash_sha256.substring(0, 12) : 'N/A'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`text-xs font-medium ${
                        evidence._validationStatus === 'VALID' ? 'bg-green-100 text-green-700 border-green-300' :
                        evidence._validationStatus === 'LEGACY' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                        'bg-red-100 text-red-700 border-red-300'
                      } border`}>
                        {evidence._validationStatus}
                      </Badge>
                      {evidence._validationStatus === 'INVALID' && evidence._displayState === 'SEALED' && (
                        <p className="text-xs text-red-600 font-medium mt-1">Sealed but missing hashes</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvidence(evidence);
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Evidence Details Modal */}
      {selectedEvidence && (
        <Dialog open={!!selectedEvidence} onOpenChange={() => setSelectedEvidence(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-light">Evidence Details (Read-Only)</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Immutability Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium">Read-Only Evidence</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This evidence is sealed and cannot be edited, replaced, or deleted per Contract 1 guarantees.
                  </p>
                </div>
              </div>

              {/* Receipt Information */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-slate-50">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-slate-500">Evidence ID</p>
                    <p className="font-mono text-xs text-slate-900 break-all">{selectedEvidence.evidence_id}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-50">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-slate-500">Dataset ID</p>
                    <p className="font-mono text-xs text-slate-900">{selectedEvidence.dataset_id || 'N/A'}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-500">Payload Hash (SHA-256)</p>
                  </div>
                  <p className="font-mono text-xs text-slate-900 break-all">
                    {selectedEvidence.payload_hash_sha256 ? selectedEvidence.payload_hash_sha256 : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500" />
                    <p className="text-xs text-slate-500">Metadata Hash (SHA-256)</p>
                  </div>
                  <p className="font-mono text-xs text-slate-900 break-all">
                    {selectedEvidence.metadata_hash_sha256 ? selectedEvidence.metadata_hash_sha256 : 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-slate-50">
                   <CardContent className="p-4 space-y-2">
                     <p className="text-xs text-slate-500">State</p>
                     <Badge className={getStateColor(selectedEvidence._displayState, selectedEvidence._isViolation)}>
                       {selectedEvidence._isViolation && <AlertCircle className="w-3 h-3 mr-1 inline" />}
                       {selectedEvidence._displayState}
                     </Badge>
                     {selectedEvidence._isViolation && (
                       <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                         Contract 1 violation: Original state was {selectedEvidence._originalState}
                       </div>
                     )}
                   </CardContent>
                 </Card>

                <Card className="bg-slate-50">
                  <CardContent className="p-4 space-y-1">
                    <p className="text-xs text-slate-500">Sealed At (UTC)</p>
                    <p className="text-sm text-slate-900">
                      {selectedEvidence.sealed_at_utc ? new Date(selectedEvidence.sealed_at_utc).toLocaleString() : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-slate-50">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs text-slate-500 font-medium">Ingestion Declaration</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Method:</span>
                      <Badge variant="outline" className="ml-2">{selectedEvidence.ingestion_method}</Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Dataset Type:</span>
                      <Badge variant="outline" className="ml-2">{selectedEvidence.dataset_type}</Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Source:</span>
                      <Badge variant="outline" className="ml-2">{selectedEvidence.source_system}</Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Scope:</span>
                      <Badge variant="outline" className="ml-2">{selectedEvidence.declared_scope}</Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Intent:</span>
                      <span className="ml-2 text-slate-700">{selectedEvidence.declared_intent}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Retention:</span>
                      <Badge variant="outline" className="ml-2">{selectedEvidence.retention_policy}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Intended Consumers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEvidence.intended_consumers?.map(module => (
                        <Badge key={module} className="bg-[#86b027]/10 text-[#86b027] border-[#86b027]/30">
                          {module}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Trail Link */}
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-900 font-medium">Audit Trail</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {auditEvents.filter(e => e.evidence_id === selectedEvidence.evidence_id).length} events logged
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast.info('Audit trail viewer coming in Contract 2+');
                      }}
                    >
                      View Events
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}