import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Webhook, Globe, Key, Copy, CheckCircle, XCircle, Activity,
  Plus, Settings, Trash2, RefreshCw, Code, Server, Zap, Shield
} from "lucide-react";
import { toast } from "sonner";

export default function APIWebhookManager() {
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const queryClient = useQueryClient();

  // Mock data - in production these would be actual entities
  const [webhooks, setWebhooks] = useState([
    {
      id: '1',
      name: 'SAP Real-time Supplier Updates',
      url: 'https://app.base44.com/webhooks/suppliers/abc123xyz',
      event_type: 'supplier_update',
      status: 'active',
      last_trigger: new Date('2025-01-05T14:32:00'),
      trigger_count: 247,
      secret: 'whsec_abc123...'
    },
    {
      id: '2',
      name: 'WMS Logistics Data Push',
      url: 'https://app.base44.com/webhooks/logistics/def456uvw',
      event_type: 'logistics_data',
      status: 'active',
      last_trigger: new Date('2025-01-06T09:15:00'),
      trigger_count: 1432,
      secret: 'whsec_def456...'
    }
  ]);

  const [apiKeys, setApiKeys] = useState([
    {
      id: '1',
      name: 'Production API Key',
      key: 'sk_prod_abc123...',
      created: new Date('2024-12-01'),
      last_used: new Date('2025-01-06T10:00:00'),
      permissions: ['read', 'write'],
      status: 'active'
    }
  ]);

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    event_type: 'supplier_update',
    description: ''
  });

  const generateWebhookURL = () => {
    const randomId = Math.random().toString(36).substring(2, 15);
    return `https://app.base44.com/webhooks/${newWebhook.event_type}/${randomId}`;
  };

  const generateSecret = () => {
    return `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  };

  const handleCreateWebhook = () => {
    const webhook = {
      id: Date.now().toString(),
      ...newWebhook,
      url: generateWebhookURL(),
      secret: generateSecret(),
      status: 'active',
      trigger_count: 0,
      last_trigger: null
    };
    setWebhooks([...webhooks, webhook]);
    setShowWebhookModal(false);
    setNewWebhook({ name: '', event_type: 'supplier_update', description: '' });
    toast.success("Webhook endpoint created");
  };

  const handleGenerateAPIKey = () => {
    const apiKey = {
      id: Date.now().toString(),
      name: 'New API Key',
      key: `sk_prod_${Math.random().toString(36).substring(2, 25)}`,
      created: new Date(),
      last_used: null,
      permissions: ['read', 'write'],
      status: 'active'
    };
    setApiKeys([...apiKeys, apiKey]);
    toast.success("API Key generated");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDeleteWebhook = (id) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    toast.success("Webhook deleted");
  };

  const handleRevokeAPIKey = (id) => {
    setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' } : k));
    toast.success("API Key revoked");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">API & Webhook Manager</h2>
          <p className="text-slate-500">Configure real-time data injection from external systems</p>
        </div>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks ({webhooks.length})
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="w-4 h-4" />
            API Keys ({apiKeys.filter(k => k.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="documentation" className="gap-2">
            <Code className="w-4 h-4" />
            API Docs
          </TabsTrigger>
        </TabsList>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-[#545454]">Incoming Webhooks</h3>
              <p className="text-sm text-slate-500">Receive real-time data from external systems</p>
            </div>
            <Button 
              onClick={() => setShowWebhookModal(true)}
              className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Webhook
            </Button>
          </div>

          <div className="grid gap-4">
            {webhooks.map(webhook => (
              <Card key={webhook.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-[#02a1e8]" />
                        {webhook.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Event: <Badge variant="outline" className="ml-1">{webhook.event_type}</Badge>
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={webhook.status === 'active' ? 'default' : 'secondary'}
                      className={webhook.status === 'active' ? 'bg-[#86b027]' : ''}
                    >
                      {webhook.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Webhook URL */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={webhook.url} 
                        readOnly 
                        className="font-mono text-xs bg-slate-50"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(webhook.url)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Signing Secret */}
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Signing Secret</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password"
                        value={webhook.secret} 
                        readOnly 
                        className="font-mono text-xs bg-slate-50"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(webhook.secret)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">Total Triggers</p>
                      <p className="text-lg font-bold text-[#545454]">{webhook.trigger_count.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">Last Trigger</p>
                      <p className="text-sm font-medium text-[#545454]">
                        {webhook.last_trigger ? webhook.last_trigger.toLocaleString('en-US', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) : 'Never'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedWebhook(webhook)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                    <Button size="sm" variant="ghost" className="text-slate-500">
                      <Activity className="w-4 h-4 mr-2" />
                      View Logs
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-rose-500 hover:text-rose-700 ml-auto"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-[#545454]">API Keys</h3>
              <p className="text-sm text-slate-500">Manage authentication for outbound API calls</p>
            </div>
            <Button 
              onClick={handleGenerateAPIKey}
              className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Key
            </Button>
          </div>

          <div className="grid gap-4">
            {apiKeys.map(key => (
              <Card key={key.id} className={`border-slate-200 shadow-sm ${key.status === 'revoked' ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#02a1e8]" />
                        {key.name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex gap-2">
                        {key.permissions.map(p => (
                          <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                        ))}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={key.status === 'active' ? 'default' : 'secondary'}
                      className={key.status === 'active' ? 'bg-[#86b027]' : 'bg-slate-400'}
                    >
                      {key.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">API Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="password"
                        value={key.key} 
                        readOnly 
                        className="font-mono text-xs bg-slate-50"
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(key.key)}
                        disabled={key.status === 'revoked'}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="text-sm font-medium text-[#545454]">
                        {key.created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">Last Used</p>
                      <p className="text-sm font-medium text-[#545454]">
                        {key.last_used ? key.last_used.toLocaleString('en-US', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) : 'Never'}
                      </p>
                    </div>
                  </div>

                  {key.status === 'active' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="ghost">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Permissions
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-rose-500 hover:text-rose-700 ml-auto"
                        onClick={() => handleRevokeAPIKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* API Documentation Tab */}
        <TabsContent value="documentation" className="mt-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#02a1e8]" />
                REST API Documentation
              </CardTitle>
              <CardDescription>Integration guide for external systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base URL */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Base URL</h4>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm">
                  https://api.base44.com/v1
                </div>
              </div>

              {/* Authentication */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Authentication</h4>
                <p className="text-sm text-slate-600 mb-2">Include your API key in the request header:</p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </div>
              </div>

              {/* Endpoints */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Available Endpoints</h4>
                <div className="space-y-3">
                  <EndpointCard 
                    method="POST"
                    endpoint="/suppliers"
                    description="Create a new supplier"
                    example={`{
  "legal_name": "Acme Corp",
  "country": "USA",
  "tier": "tier_1",
  "vat_number": "US123456789"
}`}
                  />
                  <EndpointCard 
                    method="PUT"
                    endpoint="/suppliers/{id}"
                    description="Update existing supplier"
                    example={`{
  "risk_score": 75,
  "status": "active"
}`}
                  />
                  <EndpointCard 
                    method="POST"
                    endpoint="/logistics/shipments"
                    description="Push logistics data"
                    example={`{
  "shipment_id": "SH-2025-001",
  "origin": "Shanghai",
  "destination": "Rotterdam",
  "co2e_kg": 245.5
}`}
                  />
                  <EndpointCard 
                    method="POST"
                    endpoint="/skus"
                    description="Create SKU records"
                    example={`{
  "sku_code": "PROD-001",
  "description": "Steel component",
  "category": "Raw Materials"
}`}
                  />
                </div>
              </div>

              {/* Webhook Signature Verification */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Webhook Signature Verification</h4>
                <p className="text-sm text-slate-600 mb-2">Verify webhook authenticity using HMAC SHA256:</p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}`}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Webhook Modal */}
      <Dialog open={showWebhookModal} onOpenChange={setShowWebhookModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Webhook Endpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Webhook Name *</Label>
              <Input 
                placeholder="e.g. SAP Real-time Updates"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Event Type *</Label>
              <Select 
                value={newWebhook.event_type} 
                onValueChange={(v) => setNewWebhook({...newWebhook, event_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier_update">Supplier Updates</SelectItem>
                  <SelectItem value="logistics_data">Logistics Data</SelectItem>
                  <SelectItem value="sku_sync">SKU Synchronization</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="energy_data">Energy/Emissions Data</SelectItem>
                  <SelectItem value="compliance_doc">Compliance Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="What will this webhook be used for?"
                value={newWebhook.description}
                onChange={(e) => setNewWebhook({...newWebhook, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowWebhookModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWebhook}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
              disabled={!newWebhook.name}
            >
              Create Webhook
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Component
function EndpointCard({ method, endpoint, description, example }) {
  const methodColors = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-rose-100 text-rose-700'
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge className={methodColors[method]}>{method}</Badge>
        <code className="text-sm font-mono text-[#02a1e8]">{endpoint}</code>
      </div>
      <p className="text-sm text-slate-600 mb-3">{description}</p>
      <details className="text-xs">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
          View Example Payload
        </summary>
        <pre className="mt-2 bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
          {example}
        </pre>
      </details>
    </div>
  );
}