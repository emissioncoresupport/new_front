import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Send, CheckCircle, Clock, AlertCircle, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import LCADataRequestModal from './LCADataRequestModal';

export default function LCASupplierCollaboration() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['lca-data-requests'],
    queryFn: () => base44.entities.LCADataRequest.list('-created_date')
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: datasets = [] } = useQuery({
    queryKey: ['lca-custom-datasets'],
    queryFn: () => base44.entities.LCACustomDataset.list()
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (request) => {
      const supplier = suppliers.find(s => s.id === request.supplier_id);
      if (!supplier?.email) {
        throw new Error('Supplier email not found');
      }

      await base44.integrations.Core.SendEmail({
        to: supplier.email,
        subject: `Reminder: LCA Data Request - ${request.process_name}`,
        body: `Dear ${supplier.legal_name},

This is a friendly reminder about the LCA data request for ${request.process_name}.

Request Details:
- Process: ${request.process_name}
- Due Date: ${request.due_date || 'Not specified'}
- Priority: ${request.priority}

${request.request_description || ''}

Please submit your data at your earliest convenience through the supplier portal.

Best regards`
      });

      return await base44.entities.LCADataRequest.update(request.id, {
        communication_thread: [
          ...(request.communication_thread || []),
          {
            timestamp: new Date().toISOString(),
            sender: 'System',
            message: 'Reminder email sent'
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-data-requests'] });
      toast.success('Reminder sent');
    }
  });

  const validateDatasetMutation = useMutation({
    mutationFn: async ({ requestId, datasetId, approved }) => {
      return await base44.entities.LCADataRequest.update(requestId, {
        status: approved ? 'Validated' : 'Rejected',
        validated_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-data-requests'] });
      toast.success('Dataset validation updated');
    }
  });

  const filteredRequests = requests.filter(r => {
    const supplier = suppliers.find(s => s.id === r.supplier_id);
    return r.process_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           supplier?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedByStatus = {
    'Sent': filteredRequests.filter(r => r.status === 'Sent'),
    'In Progress': filteredRequests.filter(r => r.status === 'In Progress'),
    'Submitted': filteredRequests.filter(r => r.status === 'Submitted'),
    'Validated': filteredRequests.filter(r => r.status === 'Validated')
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Sent' || r.status === 'In Progress').length,
    submitted: requests.filter(r => r.status === 'Submitted').length,
    validated: requests.filter(r => r.status === 'Validated').length
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Supplier Collaboration Portal</h2>
          <p className="text-slate-500">Request and manage primary data from your suppliers</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedRequest(null);
            setShowRequestModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Data Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-700 font-medium mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-purple-700 font-medium mb-1">Submitted</p>
            <p className="text-2xl font-bold text-purple-900">{stats.submitted}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-700 font-medium mb-1">Validated</p>
            <p className="text-2xl font-bold text-emerald-900">{stats.validated}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by process or supplier name..."
          className="pl-9"
        />
      </div>

      {/* Requests by Status */}
      <Tabs defaultValue="Sent">
        <TabsList>
          {Object.entries(groupedByStatus).map(([status, items]) => (
            <TabsTrigger key={status} value={status}>
              {status} ({items.length})
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedByStatus).map(([status, items]) => (
          <TabsContent key={status} value={status} className="space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No {status.toLowerCase()} requests</p>
              </div>
            ) : (
              items.map(request => {
                const supplier = suppliers.find(s => s.id === request.supplier_id);
                const dataset = datasets.find(d => d.id === request.submitted_dataset_id);
                const daysOverdue = request.due_date 
                  ? Math.floor((new Date() - new Date(request.due_date)) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <Card key={request.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-900">{request.process_name}</h4>
                            <Badge className={
                              request.priority === 'Critical' ? 'bg-rose-100 text-rose-700 border-0' :
                              request.priority === 'High' ? 'bg-orange-100 text-orange-700 border-0' :
                              'bg-slate-100 text-slate-700 border-0'
                            }>
                              {request.priority}
                            </Badge>
                            {daysOverdue > 0 && request.status !== 'Validated' && (
                              <Badge className="bg-rose-100 text-rose-700 border-0">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {daysOverdue} days overdue
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">{supplier?.legal_name || 'Unknown Supplier'}</span>
                            {supplier?.email && <span className="text-slate-400 ml-2">• {supplier.email}</span>}
                          </p>

                          {request.request_description && (
                            <p className="text-sm text-slate-500 mb-3">{request.request_description}</p>
                          )}

                          <div className="flex gap-3 text-xs text-slate-500">
                            <span>Created: {new Date(request.created_date).toLocaleDateString()}</span>
                            {request.due_date && <span>• Due: {new Date(request.due_date).toLocaleDateString()}</span>}
                            {request.submitted_date && <span>• Submitted: {new Date(request.submitted_date).toLocaleDateString()}</span>}
                          </div>

                          {dataset && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <p className="text-sm font-medium text-emerald-900 mb-1">Submitted Dataset: {dataset.dataset_name}</p>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-emerald-700">Climate:</span>
                                  <span className="font-bold ml-1">{dataset.emission_factor_climate?.toFixed(3)} kg CO₂e/{dataset.unit}</span>
                                </div>
                                <div>
                                  <span className="text-emerald-700">Quality:</span>
                                  <span className="font-bold ml-1">{dataset.quality_score || 0}/100</span>
                                </div>
                                <div>
                                  <span className="text-emerald-700">Source:</span>
                                  <span className="font-bold ml-1">{dataset.data_source_type}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {request.status === 'Sent' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReminderMutation.mutate(request)}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Remind
                            </Button>
                          )}
                          {request.status === 'Submitted' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => validateDatasetMutation.mutate({ requestId: request.id, datasetId: request.submitted_dataset_id, approved: true })}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Validate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => validateDatasetMutation.mutate({ requestId: request.id, datasetId: request.submitted_dataset_id, approved: false })}
                                className="text-rose-600"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>

      <LCADataRequestModal
        request={selectedRequest}
        isOpen={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
}