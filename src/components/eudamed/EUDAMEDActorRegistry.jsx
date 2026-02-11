import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, Upload } from "lucide-react";
import { toast } from "sonner";
import EUDAMEDActorModal from './EUDAMEDActorModal';
import EUDAMEDBulkImporter from './EUDAMEDBulkImporter';
import EUDAMEDMasterOrchestrator from './services/EUDAMEDMasterOrchestrator';

export default function EUDAMEDActorRegistry() {
  const [showModal, setShowModal] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: actors = [] } = useQuery({
    queryKey: ['eudamed-actors'],
    queryFn: () => base44.entities.EconomicOperator.list()
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Economic Operator Registry</h2>
          <p className="text-sm text-slate-600">Register manufacturers, authorized representatives, importers, and distributors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#769c22]">
            <Plus className="w-4 h-4 mr-2" />
            Register Actor
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {actors.map(actor => (
          <Card key={actor.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{actor.legal_name}</h3>
                    <p className="text-sm text-slate-600">{actor.city}, {actor.country}</p>
                    {actor.srn && (
                      <p className="text-xs text-blue-600 mt-1 font-mono">SRN: {actor.srn}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Badge>{actor.operator_type}</Badge>
                      <Badge className={
                        actor.status === 'exported' ? 'bg-emerald-500' :
                        actor.status === 'ready' ? 'bg-blue-500' :
                        actor.status === 'validated' ? 'bg-amber-500' : 'bg-slate-500'
                      }>{actor.status}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EUDAMEDActorModal open={showModal} onOpenChange={setShowModal} />
      <EUDAMEDBulkImporter open={bulkImportOpen} onOpenChange={setBulkImportOpen} type="actors" />
    </div>
  );
}