import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Send, CheckCircle, XCircle, Plus, Link as LinkIcon, Copy } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function CollaborationRequests() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    title: '',
    originating_module: 'SUPPLYLENS',
    message_to_supplier: '',
    due_date_utc: ''
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['collaborationRequests'],
    queryFn: () => base44.entities.CollaborationRequest.list('-created_date', 100)
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['supplierDirectory'],
    queryFn: () => base44.entities.SupplierDirectory.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const tenant_id = user.email.split('@')[1] || 'default';
      return base44.entities.CollaborationRequest.create({
        ...data,
        tenant_id,
        status: 'DRAFT'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['collaborationRequests']);
      setShowCreate(false);
      setFormData({
        supplier_id: '',
        title: '',
        originating_module: 'SUPPLYLENS',
        message_to_supplier: '',
        due_date_utc: ''
      });
      toast.success('Request created');
    }
  });

  const generateLinkMutation = useMutation({
    mutationFn: (request) => base44.functions.invoke('generateSupplierSecureLink', {
      request_id: request.id,
      supplier_id: request.supplier_id
    }),
    onSuccess: (response) => {
      if (response.data?.secure_link) {
        navigator.clipboard.writeText(response.data.secure_link);
        toast.success('Secure link copied to clipboard');
      }
    }
  });

  const getStatusBadge = (status) => {
    const config = {
      DRAFT: { color: 'bg-slate-100 text-slate-700', icon: Clock },
      SENT: { color: 'bg-blue-100 text-blue-700', icon: Send },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      SUBMITTED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      CLOSED: { color: 'bg-slate-100 text-slate-500', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircle }
    };
    const { color, icon: Icon } = config[status] || config.DRAFT;
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-slate-900 tracking-tight">Collaboration Requests</h1>
              <p className="text-sm text-slate-600 mt-1">{requests.length} total requests</p>
            </div>
            <Button onClick={() => setShowCreate(!showCreate)} className="bg-[#86b027] hover:bg-[#86b027]/90">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {showCreate && (
          <Card className="glassmorphic-panel border-slate-200/60 mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-light">Create Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">Supplier</label>
                <Select value={formData.supplier_id} onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">Title</label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Q1 2026 CBAM Data Request"
                />
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">Module</label>
                <Select value={formData.originating_module} onValueChange={(v) => setFormData({ ...formData, originating_module: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLYLENS">SupplyLens</SelectItem>
                    <SelectItem value="CBAM">CBAM</SelectItem>
                    <SelectItem value="PCF_LCA">PCF/LCA</SelectItem>
                    <SelectItem value="EUDR">EUDR</SelectItem>
                    <SelectItem value="PPWR">PPWR</SelectItem>
                    <SelectItem value="CSRD">CSRD</SelectItem>
                    <SelectItem value="PFAS">PFAS</SelectItem>
                    <SelectItem value="EUDAMED">EUDAMED</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-600 mb-2 block">Message to Supplier</label>
                <Textarea 
                  value={formData.message_to_supplier}
                  onChange={(e) => setFormData({ ...formData, message_to_supplier: e.target.value })}
                  placeholder="Brief explanation of what's needed..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.supplier_id || !formData.title}>
                  Create Request
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="glassmorphic-panel rounded-xl border border-slate-200/60 p-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="font-medium text-slate-900">{request.title}</div>
                  <div className="flex items-center gap-4 text-sm">
                    {getStatusBadge(request.status)}
                    <Badge variant="outline">{request.originating_module}</Badge>
                    {request.due_date_utc && (
                      <span className="text-xs text-slate-600">
                        Due: {new Date(request.due_date_utc).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{request.message_to_supplier}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateLinkMutation.mutate(request)}
                    disabled={generateLinkMutation.isPending}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}