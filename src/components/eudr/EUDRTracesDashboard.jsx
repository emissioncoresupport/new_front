import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  Send, 
  RefreshCcw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Search
} from "lucide-react";

export default function EUDRTracesDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch all DDS records
  const { data: ddsRecords = [], isLoading: ddsLoading } = useQuery({
    queryKey: ['eudr-dds-traces'],
    queryFn: () => base44.entities.EUDRDDS.list()
  });

  // Fetch TRACES submissions
  const { data: tracesSubmissions = [], isLoading: tracesLoading } = useQuery({
    queryKey: ['eudr-traces-submissions'],
    queryFn: () => base44.entities.EUDRTracesSubmission.list()
  });

  // Sync DDS status with TRACES
  const syncTracesMutation = useMutation({
    mutationFn: async (ddsId) => {
      toast.loading('Syncing with TRACES NT...');
      
      // Simulate API call to TRACES
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock updated status
      const statuses = ['Accepted', 'Under Review', 'Rejected'];
      const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      const dds = ddsRecords.find(d => d.id === ddsId);
      
      await base44.entities.EUDRDDS.update(ddsId, {
        traces_status: newStatus,
        traces_response: `TRACES NT Response: ${newStatus === 'Accepted' ? 'All validations passed' : newStatus === 'Rejected' ? 'Missing geolocation data' : 'Pending competent authority review'}`,
        last_sync_date: new Date().toISOString()
      });

      // Update submission record
      const submission = tracesSubmissions.find(s => s.dds_id === dds.id);
      if (submission) {
        await base44.entities.EUDRTracesSubmission.update(submission.id, {
          status: newStatus === 'Accepted' ? 'Accepted' : newStatus === 'Rejected' ? 'Rejected' : 'Submitted',
          response_message: `TRACES NT ${newStatus} - Updated ${new Date().toLocaleTimeString()}`
        });
      }

      return { ddsId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      toast.dismiss();
      toast.success(`TRACES status updated: ${newStatus}`);
      queryClient.invalidateQueries(['eudr-dds-traces']);
      queryClient.invalidateQueries(['eudr-traces-submissions']);
    },
    onError: () => {
      toast.dismiss();
      toast.error('TRACES sync failed');
    }
  });

  // Resubmit to TRACES
  const resubmitMutation = useMutation({
    mutationFn: async (ddsId) => {
      const dds = ddsRecords.find(d => d.id === ddsId);
      
      toast.loading('Resubmitting to TRACES NT...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await base44.entities.EUDRDDS.update(ddsId, {
        traces_status: 'Pending',
        submission_date: new Date().toISOString(),
        last_sync_date: new Date().toISOString()
      });

      const newRef = `TRACES-NT-${Math.floor(Math.random() * 10000000)}`;
      
      await base44.entities.EUDRTracesSubmission.create({
        dds_id: dds.id,
        traces_reference: newRef,
        submission_date: new Date().toISOString(),
        status: 'Submitted',
        xml_payload: dds.xml_payload,
        response_message: 'Resubmitted successfully'
      });

      return newRef;
    },
    onSuccess: (ref) => {
      toast.dismiss();
      toast.success(`Resubmitted with reference: ${ref}`);
      queryClient.invalidateQueries(['eudr-dds-traces']);
      queryClient.invalidateQueries(['eudr-traces-submissions']);
    },
    onError: () => {
      toast.dismiss();
      toast.error('Resubmission failed');
    }
  });

  const getStatusBadge = (status) => {
    const config = {
      "Not Submitted": { color: "bg-slate-100 text-slate-700", icon: FileText },
      "Pending": { color: "bg-blue-100 text-blue-700", icon: Clock },
      "Accepted": { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
      "Rejected": { color: "bg-rose-100 text-rose-700", icon: XCircle },
      "Under Review": { color: "bg-amber-100 text-amber-700", icon: AlertCircle }
    };
    
    const cfg = config[status] || config["Not Submitted"];
    const Icon = cfg.icon;
    
    return (
      <Badge className={`${cfg.color} gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const filtered = ddsRecords.filter(dds => 
    dds.dds_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dds.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dds.traces_reference?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: ddsRecords.filter(d => d.status === 'Submitted').length,
    pending: ddsRecords.filter(d => d.traces_status === 'Pending').length,
    accepted: ddsRecords.filter(d => d.traces_status === 'Accepted').length,
    rejected: ddsRecords.filter(d => d.traces_status === 'Rejected').length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase mb-1">Total Submissions</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-blue-600 uppercase mb-1">Pending Review</div>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-emerald-600 uppercase mb-1">Accepted</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-rose-600 uppercase mb-1">Rejected</div>
            <div className="text-2xl font-bold text-rose-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by DDS reference, PO number, or TRACES reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#86b027]" />
            TRACES NT Submission Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ddsLoading || tracesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No submissions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(dds => {
                const submission = tracesSubmissions.find(s => s.dds_id === dds.id);
                const syncing = syncTracesMutation.isPending && syncTracesMutation.variables === dds.id;
                const resubmitting = resubmitMutation.isPending && resubmitMutation.variables === dds.id;

                return (
                  <div key={dds.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">{dds.dds_reference}</span>
                          {getStatusBadge(dds.traces_status || 'Not Submitted')}
                          {dds.risk_level === 'High' && (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                              High Risk
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <div className="flex gap-4">
                            <span>PO: {dds.po_number || 'N/A'}</span>
                            <span>• {dds.commodity_description}</span>
                            <span>• {dds.quantity} {dds.unit}</span>
                          </div>
                          {dds.traces_reference && (
                            <div className="flex items-center gap-2 text-xs font-mono text-blue-600">
                              <ExternalLink className="w-3 h-3" />
                              TRACES Ref: {dds.traces_reference}
                            </div>
                          )}
                          {dds.traces_response && (
                            <div className="text-xs text-slate-500 mt-1">
                              📋 {dds.traces_response}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {dds.traces_status && dds.traces_status !== 'Not Submitted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => syncTracesMutation.mutate(dds.id)}
                            disabled={syncing}
                          >
                            {syncing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCcw className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        
                        {dds.traces_status === 'Rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                            onClick={() => resubmitMutation.mutate(dds.id)}
                            disabled={resubmitting}
                          >
                            {resubmitting ? (
                              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Resubmitting</>
                            ) : (
                              <><Send className="w-4 h-4 mr-1" /> Resubmit</>
                            )}
                          </Button>
                        )}

                        {dds.xml_payload && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const blob = new Blob([dds.xml_payload], { type: 'application/xml' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${dds.dds_reference}_TRACES.xml`;
                              a.click();
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    {submission && (
                      <div className="pt-3 border-t text-xs text-slate-400 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span>Submitted: {new Date(submission.submission_date).toLocaleString()}</span>
                          {dds.last_sync_date && (
                            <span>• Last Sync: {new Date(dds.last_sync_date).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}