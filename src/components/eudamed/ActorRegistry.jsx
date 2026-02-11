import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, Upload, Search, Shield, CheckCircle2, AlertCircle, ExternalLink, Eye, ArrowUp, Database, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import ActorModal from './ActorModal';
import ValidationEngine from './services/ValidationEngine';
import IngestionPipeline from './services/IngestionPipeline';
import ProvenanceTracker from './services/ProvenanceTracker';
import EUDAMEDBulkImporter from './EUDAMEDBulkImporter';
import SupplyLensSyncPanel from './SupplyLensSyncPanel';
import MappingCandidateReview from './MappingCandidateReview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ActorRegistry() {
  const [showModal, setShowModal] = useState(false);
  const [selectedActor, setSelectedActor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [provenanceView, setProvenanceView] = useState(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedValidation, setExpandedValidation] = useState({});
  const queryClient = useQueryClient();

  const { data: actors = [] } = useQuery({
    queryKey: ['economic-operators'],
    queryFn: () => base44.entities.EconomicOperator.list()
  });

  const { data: validationRuns = [] } = useQuery({
    queryKey: ['validation-runs'],
    queryFn: () => base44.entities.ValidationRun.list()
  });

  const { data: validationIssues = [] } = useQuery({
    queryKey: ['validation-issues'],
    queryFn: () => base44.entities.ValidationIssue.list()
  });

  // SupplyLens Sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Syncing SupplyLens suppliers to EUDAMED actors...');
      await IngestionPipeline.syncSupplyLensToEUDAMED();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['economic-operators']);
      toast.dismiss();
      toast.success('SupplyLens sync completed');
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  // Promote state
  const promoteMutation = useMutation({
    mutationFn: async ({ id, targetState }) => {
      return await ValidationEngine.promoteEntityState('EconomicOperator', id, targetState);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['economic-operators']);
      queryClient.invalidateQueries(['validation-runs']);
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // View provenance
  const viewProvenance = async (actor) => {
    const summary = await ProvenanceTracker.getEntityProvenanceSummary(actor.id, 'EconomicOperator');
    setProvenanceView({ actor, summary });
  };

  // Edit actor
  const handleEdit = (actor) => {
    setSelectedActor(actor);
    setShowModal(true);
  };

  // Delete actor
  const deleteMutation = useMutation({
    mutationFn: async (actorId) => {
      await base44.entities.EconomicOperator.delete(actorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['economic-operators']);
      toast.success('Actor deleted');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    }
  });

  const filtered = actors.filter(a => 
    a.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.srn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLatestValidation = (actorId) => {
    return validationRuns
      .filter(v => v.entity_id === actorId && v.entity_type === 'EconomicOperator')
      .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))[0];
  };

  const getValidationIssues = (validationRunId) => {
    return validationIssues.filter(i => i.validation_run_id === validationRunId);
  };

  const toggleValidationExpanded = (actorId) => {
    setExpandedValidation(prev => ({
      ...prev,
      [actorId]: !prev[actorId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* SupplyLens Sync Status */}
      <SupplyLensSyncPanel type="actors" />

      {/* Mapping Candidate Review */}
      <MappingCandidateReview type="suppliers" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Economic Operator Registry</h2>
          <p className="text-sm text-slate-600">Actor module - Manufacturers, authorized reps, importers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <Database className="w-4 h-4 mr-2" />
            {syncMutation.isPending ? 'Syncing...' : 'Sync SupplyLens'}
          </Button>
          <Button onClick={() => { setSelectedActor(null); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#769c22]">
            <Plus className="w-4 h-4 mr-2" />
            Register Actor
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, SRN, or trade name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filtered.map(actor => {
          const validation = getLatestValidation(actor.id);
          const issues = validation ? getValidationIssues(validation.id) : [];
          const isExpanded = expandedValidation[actor.id];
          const canPromoteToValidated = actor.status === 'draft';
          const canPromoteToReady = actor.status === 'validated';
          
          return (
            <Card key={actor.id} className="border-l-4" style={{
              borderLeftColor: actor.status === 'exported' ? '#86b027' : 
                              actor.status === 'ready' ? '#02a1e8' :
                              actor.status === 'validated' ? '#f59e0b' : '#94a3b8'
            }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{actor.legal_name}</h3>
                          {actor.trade_name && <p className="text-sm text-slate-600">{actor.trade_name}</p>}
                          <p className="text-xs text-slate-500 mt-1">{actor.city}, {actor.country}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            actor.status === 'exported' ? 'bg-emerald-500' :
                            actor.status === 'ready' ? 'bg-blue-500' :
                            actor.status === 'validated' ? 'bg-amber-500' : 'bg-slate-500'
                          }>{actor.status}</Badge>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleEdit(actor)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => setDeleteConfirm(actor)}
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                        <p><strong>Type:</strong> {actor.operator_type}</p>
                        {actor.vat_number && <p><strong>VAT:</strong> {actor.vat_number}</p>}
                        {actor.eori_number && <p><strong>EORI:</strong> {actor.eori_number}</p>}
                        {actor.srn && <p className="text-blue-600 font-mono col-span-3"><strong>SRN:</strong> {actor.srn}</p>}
                      </div>

                      {validation && (
                        <Collapsible open={isExpanded} onOpenChange={() => toggleValidationExpanded(actor.id)}>
                          <div className="mt-3">
                            <CollapsibleTrigger className="w-full">
                              <div className="p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {validation.outcome === 'pass' ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-rose-600" />
                                    )}
                                    <span className="text-xs font-medium">Validation: {validation.outcome}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-xs text-slate-500">
                                      {validation.critical_issues > 0 && (
                                        <span className="text-rose-600 font-bold">{validation.critical_issues} critical</span>
                                      )}
                                      {validation.warnings > 0 && (
                                        <span className="text-amber-600 ml-2">{validation.warnings} warnings</span>
                                      )}
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="mt-2 p-3 bg-white rounded-lg border space-y-2">
                                {issues.length === 0 ? (
                                  <p className="text-xs text-slate-500">No validation issues</p>
                                ) : (
                                  issues.map((issue, idx) => (
                                    <div key={idx} className="p-2 bg-slate-50 rounded border-l-2" style={{
                                      borderLeftColor: issue.severity === 'critical' ? '#ef4444' : 
                                                      issue.severity === 'major' ? '#f59e0b' : '#94a3b8'
                                    }}>
                                      <div className="flex items-start gap-2">
                                        <Badge variant="outline" className={
                                          issue.severity === 'critical' ? 'border-rose-500 text-rose-700' :
                                          issue.severity === 'major' ? 'border-amber-500 text-amber-700' : 'border-slate-400'
                                        }>{issue.severity}</Badge>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-slate-900">{issue.message}</p>
                                          <p className="text-xs text-slate-600 mt-1">Field: <code className="bg-white px-1 rounded">{issue.field_path}</code></p>
                                          {issue.suggested_fix && (
                                            <p className="text-xs text-blue-600 mt-1">💡 {issue.suggested_fix}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => viewProvenance(actor)}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Provenance
                        </Button>
                        
                        {canPromoteToValidated && (
                          <Button 
                            size="sm"
                            onClick={() => promoteMutation.mutate({ id: actor.id, targetState: 'validated' })}
                            className="bg-amber-500 hover:bg-amber-600"
                          >
                            <ArrowUp className="w-3 h-3 mr-1" /> Validate
                          </Button>
                        )}
                        
                        {canPromoteToReady && (
                          <Button 
                            size="sm"
                            onClick={() => promoteMutation.mutate({ id: actor.id, targetState: 'ready' })}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            <Shield className="w-3 h-3 mr-1" /> Mark Ready
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No economic operators found</p>
              <Button onClick={() => setShowModal(true)} className="mt-4 bg-[#86b027]">
                <Plus className="w-4 h-4 mr-2" /> Register First Actor
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ActorModal 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setSelectedActor(null);
        }}
        actor={selectedActor}
      />

      <EUDAMEDBulkImporter 
        open={bulkImportOpen} 
        onOpenChange={setBulkImportOpen}
        type="actors"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Economic Operator?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.legal_name}</strong>? This action cannot be undone and will remove all associated data including provenance records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Provenance Dialog */}
      <Dialog open={!!provenanceView} onOpenChange={() => setProvenanceView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Field Provenance - {provenanceView?.actor?.legal_name}</DialogTitle>
          </DialogHeader>
          {provenanceView && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Total Fields</p>
                  <p className="text-2xl font-bold">{provenanceView.summary.totalFields}</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-700 mb-1">AI Proposed</p>
                  <p className="text-2xl font-bold text-amber-600">{provenanceView.summary.aiProposed}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-700 mb-1">AI Approved</p>
                  <p className="text-2xl font-bold text-emerald-600">{provenanceView.summary.aiApproved}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">By Source</h4>
                <div className="space-y-2">
                  {Object.entries(provenanceView.summary.bySource).map(([source, count]) => (
                    <div key={source} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-sm">{source}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">By Extraction Method</h4>
                <div className="space-y-2">
                  {Object.entries(provenanceView.summary.byExtractionMethod).map(([method, count]) => (
                    <div key={method} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-sm">{method}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}