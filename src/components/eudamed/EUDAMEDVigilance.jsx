import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, AlertTriangle } from "lucide-react";
import EUDAMEDIncidentModal from './EUDAMEDIncidentModal';

export default function EUDAMEDVigilance() {
  const [showModal, setShowModal] = useState(false);

  const { data: incidents = [] } = useQuery({
    queryKey: ['eudamed-incidents'],
    queryFn: () => base44.entities.EUDAMEDIncident.list('-incident_date')
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Vigilance & Post-Market Safety</h2>
          <p className="text-sm text-slate-600">Report and track serious incidents and field safety corrective actions</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" />
          Report Incident
        </Button>
      </div>

      <div className="grid gap-4">
        {incidents.map(incident => (
          <Card key={incident.id} className="border-l-4 border-rose-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold">{incident.incident_type}</h3>
                      <p className="text-xs text-slate-500">Ref: {incident.report_reference}</p>
                    </div>
                    <Badge className={
                      incident.status === 'open' ? 'bg-rose-500' :
                      incident.status === 'under_investigation' ? 'bg-amber-500' : 'bg-slate-500'
                    }>{incident.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{incident.description}</p>
                  <div className="text-xs text-slate-600">
                    <p><strong>Date:</strong> {new Date(incident.incident_date).toLocaleDateString()}</p>
                    <p><strong>Country:</strong> {incident.country_of_incident}</p>
                    <p><strong>Outcome:</strong> {incident.patient_outcome}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EUDAMEDIncidentModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}