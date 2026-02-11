import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Database, Clock, CheckCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function LCASupplierPortal({ supplierId }) {
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submissionData, setSubmissionData] = useState({});
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['lca-data-requests', supplierId],
    queryFn: async () => {
      const all = await base44.entities.LCADataRequest.list();
      return all.filter(r => r.supplier_id === supplierId);
    }
  });

  const { data: myDatasets = [] } = useQuery({
    queryKey: ['my-lca-datasets', supplierId],
    queryFn: async () => {
      const all = await base44.entities.LCACustomDataset.list();
      return all.filter(d => d.supplier_id === supplierId);
    }
  });

  const submitDataMutation = useMutation({
    mutationFn: async ({ requestId, datasetData }) => {
      // Create dataset
      const dataset = await base44.entities.LCACustomDataset.create({
        ...datasetData,
        source_type: 'Supplier Survey',
        supplier_id: supplierId,
        version: '1.0',
        validation_status: 'Pending',
        is_active: true
      });

      // Update request
      return await base44.entities.LCADataRequest.update(requestId, {
        status: 'Submitted',
        submitted_dataset_id: dataset.id,
        submitted_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lca-data-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-lca-datasets'] });
      toast.success('Data submitted successfully');
      setSelectedRequest(null);
      setSubmissionData({});
    }
  });

  const updateDatasetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LCACustomDataset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lca-datasets'] });
      toast.success('Dataset updated');
    }
  });

  const pendingRequests = requests.filter(r => r.status === 'Sent' || r.status === 'In Progress');
  const submittedRequests = requests.filter(r => r.status === 'Submitted' || r.status === 'Validated');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#545454] mb-2">LCA Data Portal</h1>
        <p className="text-slate-500">Manage your LCA data submissions and datasets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-700 font-medium mb-1">Pending Requests</p>
            <p className="text-2xl font-bold text-amber-900">{pendingRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-700 font-medium mb-1">Submitted</p>
            <p className="text-2xl font-bold text-emerald-900">{submittedRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-700 font-medium mb-1">My Datasets</p>
            <p className="text-2xl font-bold text-blue-900">{myDatasets.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">
            <Clock className="w-4 h-4 mr-2" />
            Data Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="submitted">
            <CheckCircle className="w-4 h-4 mr-2" />
            Submitted ({submittedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="datasets">
            <Database className="w-4 h-4 mr-2" />
            My Datasets ({myDatasets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending data requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map(request => (
              <Card key={request.id} className="border-slate-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{request.process_name}</CardTitle>
                    <Badge className={
                      request.priority === 'Critical' ? 'bg-rose-100 text-rose-700 border-0' :
                      request.priority === 'High' ? 'bg-orange-100 text-orange-700 border-0' :
                      'bg-slate-100 text-slate-700 border-0'
                    }>
                      {request.priority} Priority
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">{request.request_description}</p>
                    {request.due_date && (
                      <p className="text-sm text-slate-500">Due: {new Date(request.due_date).toLocaleDateString()}</p>
                    )}
                  </div>

                  {selectedRequest?.id === request.id ? (
                    <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Dataset Name *</Label>
                          <Input
                            value={submissionData.dataset_name || ''}
                            onChange={(e) => setSubmissionData({...submissionData, dataset_name: e.target.value})}
                            placeholder="e.g., Steel A36 Production - 2024"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit *</Label>
                          <Input
                            value={submissionData.unit || 'kg'}
                            onChange={(e) => setSubmissionData({...submissionData, unit: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Climate (kg CO₂e)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={submissionData.emission_factor_climate || ''}
                            onChange={(e) => setSubmissionData({...submissionData, emission_factor_climate: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Water (m³)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={submissionData.emission_factor_water || ''}
                            onChange={(e) => setSubmissionData({...submissionData, emission_factor_water: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Acidification (kg SO₂ eq)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={submissionData.emission_factor_acidification || ''}
                            onChange={(e) => setSubmissionData({...submissionData, emission_factor_acidification: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Geographic Scope</Label>
                          <Input
                            value={submissionData.geographic_scope || ''}
                            onChange={(e) => setSubmissionData({...submissionData, geographic_scope: e.target.value})}
                            placeholder="e.g., Europe, US, CN"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Data Source Type</Label>
                          <Select 
                            value={submissionData.data_source_type || 'Primary'} 
                            onValueChange={(v) => setSubmissionData({...submissionData, data_source_type: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Primary">Primary (Measured)</SelectItem>
                              <SelectItem value="Secondary">Secondary (Database)</SelectItem>
                              <SelectItem value="Tertiary">Tertiary (Estimated)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Measurement Method</Label>
                        <Textarea
                          value={submissionData.measurement_method || ''}
                          onChange={(e) => setSubmissionData({...submissionData, measurement_method: e.target.value})}
                          placeholder="Describe how you measured or obtained this data..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedRequest(null);
                            setSubmissionData({});
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => submitDataMutation.mutate({
                            requestId: request.id,
                            datasetData: {
                              ...submissionData,
                              process_name: request.process_name,
                              activity_type: request.activity_type,
                              temporal_scope: new Date().getFullYear().toString(),
                              temporal_representativeness: 1,
                              geographical_representativeness: 1,
                              technological_representativeness: 1,
                              completeness_score: 1
                            }
                          })}
                          disabled={!submissionData.dataset_name || !submissionData.unit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Submit Data
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setSubmissionData({});
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Data
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-4">
          {submittedRequests.map(request => (
            <Card key={request.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">{request.process_name}</h4>
                  <Badge className={
                    request.status === 'Validated' ? 'bg-emerald-100 text-emerald-700 border-0' :
                    'bg-blue-100 text-blue-700 border-0'
                  }>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">Submitted: {new Date(request.submitted_date).toLocaleDateString()}</p>
                {request.validated_date && (
                  <p className="text-sm text-emerald-600 mt-1">Validated: {new Date(request.validated_date).toLocaleDateString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          {myDatasets.map(dataset => (
            <Card key={dataset.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 mb-1">{dataset.dataset_name}</h4>
                    <p className="text-sm text-slate-600 mb-2">{dataset.process_name}</p>
                    <div className="flex gap-2 mb-3">
                      <Badge className={
                        dataset.validation_status === 'Validated' ? 'bg-emerald-100 text-emerald-700 border-0' :
                        'bg-amber-100 text-amber-700 border-0'
                      }>
                        {dataset.validation_status}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 border-0">
                        {dataset.data_source_type}
                      </Badge>
                      <Badge variant="outline">
                        Quality: {dataset.quality_score || 0}/100
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Climate:</span>
                        <span className="font-bold ml-1">{dataset.emission_factor_climate?.toFixed(3)} kg CO₂e/{dataset.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Water:</span>
                        <span className="font-bold ml-1">{dataset.emission_factor_water?.toFixed(3)} m³/{dataset.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Used:</span>
                        <span className="font-bold ml-1">{dataset.usage_count || 0} times</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}