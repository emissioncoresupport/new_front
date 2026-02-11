import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, FlaskConical } from "lucide-react";
import EUDAMEDClinicalModal from './EUDAMEDClinicalModal';

export default function EUDAMEDClinicalStudies() {
  const [showModal, setShowModal] = useState(false);

  const { data: studies = [] } = useQuery({
    queryKey: ['eudamed-clinical'],
    queryFn: () => base44.entities.EUDAMEDClinicalInvestigation.list()
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Clinical Investigations</h2>
          <p className="text-sm text-slate-600">Manage clinical studies, performance studies, and PMCF studies</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-2" />
          Register Study
        </Button>
      </div>

      <div className="grid gap-4">
        {studies.map(study => (
          <Card key={study.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FlaskConical className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold">{study.investigation_title}</h3>
                      <p className="text-xs text-slate-500">Protocol: {study.protocol_number}</p>
                    </div>
                    <Badge className={
                      study.status === 'ongoing' ? 'bg-emerald-500' :
                      study.status === 'planned' ? 'bg-blue-500' :
                      study.status === 'completed' ? 'bg-slate-500' : 'bg-amber-500'
                    }>{study.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{study.primary_objective}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p><strong>Type:</strong> {study.investigation_type}</p>
                    <p><strong>Countries:</strong> {study.participating_countries?.length || 0}</p>
                    <p><strong>Enrollment:</strong> {study.actual_enrollment || 0}/{study.estimated_enrollment || 0}</p>
                    <p><strong>SAEs:</strong> {study.serious_adverse_events || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EUDAMEDClinicalModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}