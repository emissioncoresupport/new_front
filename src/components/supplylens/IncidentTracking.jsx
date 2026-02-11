import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, TrendingDown, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import IncidentModal from './IncidentModal';
import { format } from 'date-fns';
import { toast } from "sonner";

export default function IncidentTracking({ suppliers = [] }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const queryClient = useQueryClient();

  const { data: incidents = [] } = useQuery({
    queryKey: ['supply-chain-incidents'],
    queryFn: () => base44.entities.SupplyChainIncident.list('-incident_date')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SupplyChainIncident.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-chain-incidents'] });
      toast.success('Incident updated');
    }
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'Open').length,
    critical: incidents.filter(i => i.severity === 'Critical').length,
    resolved_30d: incidents.filter(i => 
      i.status === 'Resolved' && 
      new Date(i.resolution_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'Under Investigation':
      case 'Mitigating':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">Total Incidents</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-600 font-medium">Open</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{stats.open}</p>
              </div>
              <XCircle className="w-8 h-8 text-rose-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 font-medium">Critical</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-medium">Resolved (30d)</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved_30d}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Supply Chain Incidents</CardTitle>
            <Button 
              onClick={() => { setSelectedIncident(null); setShowModal(true); }}
              className="bg-[#86b027] hover:bg-[#769c22]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {incidents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map(incident => {
                  const supplier = suppliers.find(s => s.id === incident.supplier_id);
                  return (
                    <TableRow key={incident.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs">{incident.incident_reference}</TableCell>
                      <TableCell className="font-medium">{supplier?.legal_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {incident.incident_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(incident.incident_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(incident.status)}
                          <span className="text-sm">{incident.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setSelectedIncident(incident); setShowModal(true); }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No incidents reported</p>
              <p className="text-sm">Track supply chain disruptions and issues here</p>
            </div>
          )}
        </CardContent>
      </Card>

      <IncidentModal 
        open={showModal}
        onOpenChange={setShowModal}
        incident={selectedIncident}
        suppliers={suppliers}
      />
    </div>
  );
}