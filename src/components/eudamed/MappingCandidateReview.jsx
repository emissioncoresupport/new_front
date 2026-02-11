import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, X, Building2, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import SupplyLensMappingService from './services/SupplyLensMappingService';
import ActorModal from './ActorModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function MappingCandidateReview({ type = 'suppliers' }) {
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [showActorModal, setShowActorModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [linkToExisting, setLinkToExisting] = useState(null);
  const queryClient = useQueryClient();

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['mapping-candidates', type],
    queryFn: () => SupplyLensMappingService.getMappingCandidates('suggested')
  });

  const { data: existingActors = [] } = useQuery({
    queryKey: ['economic-operators'],
    queryFn: () => base44.entities.EconomicOperator.list()
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ mappingId, action }) => {
      return await SupplyLensMappingService.confirmSupplierMapping(mappingId, action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mapping-candidates']);
      queryClient.invalidateQueries(['economic-operators']);
      toast.success('Mapping confirmed');
      setSelectedMapping(null);
      setShowActorModal(false);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ mappingId, reason }) => {
      return await SupplyLensMappingService.rejectSupplierMapping(mappingId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mapping-candidates']);
      toast.success('Mapping rejected');
      setShowRejectModal(null);
      setRejectReason('');
    }
  });

  const handleCreateNew = (mapping) => {
    setSelectedMapping(mapping);
    setShowActorModal(true);
  };

  const handleLinkExisting = (mapping, actorId) => {
    confirmMutation.mutate({
      mappingId: mapping.mapping.id,
      action: { existing_actor_id: actorId }
    });
  };

  if (isLoading) return <div>Loading candidates...</div>;

  return (
    <div className="space-y-4">
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {candidates.length} Suppliers Detected - Review & Map
          </CardTitle>
          <p className="text-sm text-slate-600">
            SupplyLens sync found these suppliers. Review each to determine if they need EUDAMED actor registration.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {candidates.map(({ mapping, supplier }) => (
            <Card key={mapping.id} className="border-l-4 border-l-blue-300">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg">{supplier.legal_name}</h4>
                    <p className="text-sm text-slate-600">{supplier.city}, {supplier.country}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-blue-500">
                        Suggested: {mapping.suggested_actor_type}
                      </Badge>
                      <Badge variant="outline">
                        Confidence: {(mapping.confidence_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {mapping.reasoning?.map((r, i) => (
                        <p key={i}>• {r}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      size="sm"
                      onClick={() => handleCreateNew(mapping)}
                      className="bg-[#86b027]"
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      Create Actor
                    </Button>
                    
                    {existingActors.length > 0 && (
                      <Dialog>
                        <Button size="sm" variant="outline" onClick={() => setLinkToExisting(mapping.mapping.id)}>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          Link to Existing
                        </Button>
                        {linkToExisting === mapping.mapping.id && (
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link to Existing Actor</DialogTitle>
                            </DialogHeader>
                            <Select onValueChange={(actorId) => handleLinkExisting(mapping, actorId)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select actor" />
                              </SelectTrigger>
                              <SelectContent>
                                {existingActors.map(actor => (
                                  <SelectItem key={actor.id} value={actor.id}>
                                    {actor.legal_name} ({actor.operator_type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </DialogContent>
                        )}
                      </Dialog>
                    )}

                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRejectModal(mapping)}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {candidates.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
              <p>All mappings reviewed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Actor Modal */}
      {showActorModal && selectedMapping && (
        <ActorModal
          open={showActorModal}
          onOpenChange={setShowActorModal}
          actor={null}
          prefilledData={{
            legal_name: selectedMapping.supplier.legal_name,
            trade_name: selectedMapping.supplier.trade_name,
            country: selectedMapping.supplier.country,
            vat_number: selectedMapping.supplier.vat_number,
            address: selectedMapping.supplier.address,
            city: selectedMapping.supplier.city,
            postal_code: selectedMapping.supplier.postal_code,
            primary_contact_email: selectedMapping.supplier.primary_contact_email,
            primary_contact_phone: selectedMapping.supplier.primary_contact_phone,
            website: selectedMapping.supplier.website,
            operator_type: selectedMapping.mapping.suggested_actor_type
          }}
          onSave={(actorData) => {
            confirmMutation.mutate({
              mappingId: selectedMapping.mapping.id,
              action: {
                create_new_actor: true,
                actor_data: actorData
              }
            });
          }}
        />
      )}

      {/* Reject Modal */}
      <Dialog open={!!showRejectModal} onOpenChange={() => setShowRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Why is this supplier not an EUDAMED economic operator?
            </p>
            <Textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="E.g., Component supplier only, no manufacturing role..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(null)}>Cancel</Button>
              <Button 
                onClick={() => rejectMutation.mutate({ 
                  mappingId: showRejectModal.mapping.id, 
                  reason: rejectReason 
                })}
                disabled={!rejectReason}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}