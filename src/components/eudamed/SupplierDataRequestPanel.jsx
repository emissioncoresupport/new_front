import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Send, FileText, CheckCircle2, Clock, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import SupplierDataRequestService from './services/SupplierDataRequestService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SupplierDataRequestPanel({ deviceModelId }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [viewSubmission, setViewSubmission] = useState(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: dataRequests = [] } = useQuery({
    queryKey: ['data-requests', deviceModelId],
    queryFn: () => SupplierDataRequestService.getDeviceDataRequests(deviceModelId)
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      return await SupplierDataRequestService.bulkCreateRequests(
        selectedSuppliers,
        deviceModelId,
        { custom_message: customMessage }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['data-requests']);
      toast.success(`Requests sent to ${selectedSuppliers.length} suppliers`);
      setShowCreateModal(false);
      setSelectedSuppliers([]);
      setCustomMessage('');
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'review_pending': return 'bg-amber-500';
      case 'rejected': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Supplier Data Requests</h3>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#02a1e8]">
          <Send className="w-4 h-4 mr-2" />
          Request Data
        </Button>
      </div>

      <div className="grid gap-3">
        {dataRequests.map(request => {
          const supplier = suppliers.find(s => s.id === request.supplier_id);
          return (
            <Card key={request.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold">{supplier?.legal_name || 'Unknown Supplier'}</h4>
                    <p className="text-xs text-slate-600">{supplier?.country}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Deadline: {new Date(request.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setViewSubmission(request)}>
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {dataRequests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No data requests yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Request Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Data from Suppliers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Suppliers</label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded p-2">
                {suppliers.map(supplier => (
                  <label key={supplier.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplier.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSuppliers([...selectedSuppliers, supplier.id]);
                        } else {
                          setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id));
                        }
                      }}
                    />
                    <span className="text-sm">{supplier.legal_name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Custom Message (Optional)</label>
              <Textarea 
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add any additional context for suppliers..."
                rows={4}
              />
            </div>

            <div className="p-3 bg-blue-50 rounded text-xs text-blue-700">
              <p className="font-medium mb-1">Suppliers will be asked to provide:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Component UDI-PI (if applicable)</li>
                <li>Manufacturing site address</li>
                <li>Material declaration (RoHS, REACH)</li>
                <li>ISO/CE certificates</li>
                <li>Test reports</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button 
                onClick={() => createRequestMutation.mutate()}
                disabled={selectedSuppliers.length === 0 || createRequestMutation.isPending}
                className="bg-[#02a1e8]"
              >
                Send Requests ({selectedSuppliers.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}