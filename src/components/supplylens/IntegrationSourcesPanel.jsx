import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Key, Link as LinkIcon, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationSourcesPanel() {
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({
    source_name: '',
    source_type: 'API_PUSH',
    api_endpoint: '',
    webhook_secret: '',
    connector_id: '',
    idempotency_window_hours: 24,
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: sources = [] } = useQuery({
    queryKey: ['integration-sources'],
    queryFn: () => base44.entities.IntegrationSource.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IntegrationSource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['integration-sources']);
      setShowModal(false);
      resetForm();
      toast.success('Integration source created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IntegrationSource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['integration-sources']);
      setShowModal(false);
      setEditingSource(null);
      resetForm();
      toast.success('Integration source updated');
    }
  });

  const resetForm = () => {
    setFormData({
      source_name: '',
      source_type: 'API_PUSH',
      api_endpoint: '',
      webhook_secret: '',
      connector_id: '',
      idempotency_window_hours: 24,
      notes: ''
    });
    setEditingSource(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditModal = (source) => {
    setEditingSource(source);
    setFormData({
      source_name: source.source_name,
      source_type: source.source_type,
      api_endpoint: source.api_endpoint || '',
      webhook_secret: source.webhook_secret || '',
      connector_id: source.connector_id || '',
      idempotency_window_hours: source.idempotency_window_hours || 24,
      notes: source.notes || ''
    });
    setShowModal(true);
  };

  const generateWebhookSecret = () => {
    const secret = `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setFormData(prev => ({ ...prev, webhook_secret: secret }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Integration Sources</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage external systems that push evidence into SupplyLens
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[#86b027] hover:bg-[#75991f]">
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => (
          <Card key={source.id} className="glassmorphic-panel border-slate-200/50 hover:shadow-lg transition-all cursor-pointer" onClick={() => openEditModal(source)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">
                  {source.source_name}
                </CardTitle>
                {source.status === 'active' ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {source.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">{source.source_type}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {source.api_endpoint && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <LinkIcon className="w-3 h-3" />
                  <span className="truncate">{source.api_endpoint}</span>
                </div>
              )}
              <div className="text-xs text-slate-500">
                {source.usage_count || 0} evidence records ingested
              </div>
              {source.last_sync_date && (
                <div className="text-xs text-slate-500">
                  Last sync: {new Date(source.last_sync_date).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {sources.length === 0 && (
          <Card className="col-span-full border-dashed border-2 border-slate-300 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-600 font-medium mb-2">No integration sources yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Add your first integration source to enable automated evidence ingestion
              </p>
              <Button onClick={() => setShowModal(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Integration Source
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Integration Source' : 'Add Integration Source'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Source Name *</Label>
              <Input
                value={formData.source_name}
                onChange={(e) => setFormData(prev => ({ ...prev, source_name: e.target.value }))}
                placeholder="e.g. SAP Production API"
                required
              />
            </div>

            <div>
              <Label>Source Type *</Label>
              <Select value={formData.source_type} onValueChange={(value) => setFormData(prev => ({ ...prev, source_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="API_PUSH">API Push</SelectItem>
                  <SelectItem value="ERP_API">ERP API</SelectItem>
                  <SelectItem value="TMS_API">TMS API</SelectItem>
                  <SelectItem value="CUSTOMS_API">Customs API</SelectItem>
                  <SelectItem value="SUPPLIER_PORTAL">Supplier Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.source_type === 'API_PUSH' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-800">API Endpoint</Label>
                  {editingSource && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(`https://api.supplylens.app/v1/evidence/ingest/${editingSource.id}`, 'Endpoint')}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
                <code className="text-xs bg-slate-800 text-slate-100 p-2 rounded block overflow-x-auto">
                  POST https://api.supplylens.app/v1/evidence/ingest/{editingSource ? editingSource.id : '{source_id}'}
                </code>
                <p className="text-xs text-slate-600">
                  External systems POST evidence payloads to this endpoint with webhook signature verification
                </p>
              </div>
            )}

            {(formData.source_type === 'ERP_API' || formData.source_type === 'TMS_API') && (
              <>
                <div>
                  <Label>API Endpoint</Label>
                  <Input
                    value={formData.api_endpoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, api_endpoint: e.target.value }))}
                    placeholder="https://erp.company.com/api/v1"
                  />
                </div>

                <div>
                  <Label>Connector ID (optional)</Label>
                  <Input
                    value={formData.connector_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, connector_id: e.target.value }))}
                    placeholder="Reference to ERPConnection record"
                  />
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Webhook Secret</Label>
                <Button type="button" variant="outline" size="sm" onClick={generateWebhookSecret}>
                  <Key className="w-3 h-3 mr-1" />
                  Generate
                </Button>
              </div>
              <Input
                value={formData.webhook_secret}
                onChange={(e) => setFormData(prev => ({ ...prev, webhook_secret: e.target.value }))}
                placeholder="whsec_..."
                type="password"
              />
              <p className="text-xs text-slate-500 mt-1">
                Used to verify webhook signatures (HMAC SHA-256)
              </p>
            </div>

            <div>
              <Label>Idempotency Window (hours)</Label>
              <Input
                type="number"
                value={formData.idempotency_window_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, idempotency_window_hours: parseInt(e.target.value) || 24 }))}
                min="1"
                max="168"
              />
              <p className="text-xs text-slate-500 mt-1">
                How long to enforce idempotency for duplicate external_reference_id (1-168 hours)
              </p>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes about this integration..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => {
                setShowModal(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#86b027] hover:bg-[#75991f]">
                {editingSource ? 'Update' : 'Create'} Source
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}