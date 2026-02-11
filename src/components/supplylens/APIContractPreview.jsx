import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_CONTRACTS = {
  createDraft: {
    endpoint: '/api/evidence/draft/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    request: {
      dataset_type: 'SUPPLIER_MASTER_V1',
      ingestion_method: 'MANUAL_ENTRY',
      binding: {
        declared_scope: 'SUPPLIER',
        linked_entities: [{ type: 'SUPPLIER', id: 'SUP-001' }]
      },
      payload: {
        legal_name: 'Acme Corp',
        country_code: 'DE',
        primary_contact_email: 'contact@acme.de'
      }
    },
    response: {
      draft_id: 'draft_1738876543_abc123',
      tenant_id: 'tenant_xxx',
      validation_status: 'PENDING',
      created_at_utc: '2026-02-07T10:30:00Z'
    }
  },
  validateDraft: {
    endpoint: '/api/evidence/draft/{draft_id}/validate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    request: {},
    response: {
      valid: true,
      errors: [],
      validation_status: 'PASS',
      validated_at_utc: '2026-02-07T10:31:00Z'
    }
  },
  sealDraft: {
    endpoint: '/api/evidence/draft/{draft_id}/seal',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    request: {},
    response: {
      record_id: 'rec_ev_1738876600',
      display_id: 'EV-0007',
      tenant_id: 'tenant_xxx',
      status: 'SEALED',
      sealed_at_utc: '2026-02-07T10:32:00Z',
      payload_hash_sha256: 'a1b2c3d4e5f67890...',
      metadata_hash_sha256: 'b2c3d4e5f67890ab...',
      hash_scope: 'FULL',
      retention_ends_utc: '2033-02-07T10:32:00Z',
      created_by: 'user@example.com',
      ingested_by: 'user@example.com'
    }
  },
  listEvidence: {
    endpoint: '/api/evidence/records',
    method: 'GET',
    headers: {
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    queryParams: {
      status: 'SEALED',
      dataset_type: 'SUPPLIER_MASTER_V1',
      limit: 50
    },
    response: {
      records: [
        {
          record_id: 'rec_ev_001',
          display_id: 'EV-0001',
          status: 'SEALED',
          dataset_type: 'SUPPLIER_MASTER_V1',
          ingested_at_utc: '2026-01-15T08:00:00Z'
        }
      ],
      total: 1
    }
  },
  listWorkItems: {
    endpoint: '/api/work-items',
    method: 'GET',
    headers: {
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    queryParams: {
      status: 'OPEN',
      type: 'CONFLICT',
      limit: 20
    },
    response: {
      items: [
        {
          work_item_id: 'WI-0004',
          type: 'CONFLICT',
          status: 'OPEN',
          priority: 'MEDIUM',
          title: 'Resolve supplier country code conflict',
          linked_entity: { type: 'SUPPLIER', id: 'SUP-001' },
          candidates: [
            { value: 'TR', evidenceId: 'rec_ev_001', trustRank: 9 },
            { value: 'TUR', evidenceId: 'rec_ev_005', trustRank: 6 }
          ],
          sla_due_utc: '2026-02-09T12:00:00Z'
        }
      ],
      total: 1
    }
  },
  resolveWorkItem: {
    endpoint: '/api/work-items/{work_item_id}/resolve',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    request: {
      outcome: 'APPROVED',
      reason_code: 'EVIDENCE_PRIORITY',
      comment: 'Verified against ERP source',
      selected_value: 'TR',
      selected_evidence_id: 'rec_ev_001'
    },
    response: {
      decision_id: 'D-0003',
      work_item_id: 'WI-0004',
      status: 'RESOLVED',
      resolved_at_utc: '2026-02-07T11:00:00Z'
    }
  },
  createFollowUp: {
    endpoint: '/api/work-items/{work_item_id}/follow-up',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    request: {
      type: 'REVIEW',
      title: 'Secondary verification required',
      priority: 'MEDIUM'
    },
    response: {
      work_item_id: 'WI-0011',
      parent_work_item_id: 'WI-0004',
      status: 'OPEN',
      created_at_utc: '2026-02-07T11:05:00Z'
    }
  },
  approveMappingSuggestion: {
    endpoint: '/api/mapping/suggestions/{suggestion_id}/approve',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': 'tenant_xxx',
      'Authorization': 'Bearer {token}'
    },
    request: {
      comment: 'AI suggestion verified against master data'
    },
    response: {
      suggestion_id: 'MS-0001',
      status: 'APPROVED',
      decision_id: 'D-0004',
      reviewed_by: 'user@example.com',
      reviewed_at_utc: '2026-02-07T11:10:00Z'
    }
  }
};

export default function APIContractPreview() {
  const [mode, setMode] = useState('mock');
  const [selectedEndpoint, setSelectedEndpoint] = useState('createDraft');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const currentContract = API_CONTRACTS[selectedEndpoint];

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">API Integration Mode</h3>
          <p className="text-xs text-slate-600 mt-1">Preview API contracts for backend integration</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={mode === 'mock' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setMode('mock')}>
            Mock Mode
          </Badge>
          <Badge variant={mode === 'api' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setMode('api')}>
            API Mode
          </Badge>
        </div>
      </div>



      {/* Endpoint Selector */}
      <Card className="border-2 border-slate-300 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-sm font-semibold text-slate-900">API Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(API_CONTRACTS).map((key) => (
              <Button
                key={key}
                variant={selectedEndpoint === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEndpoint(key)}
                className="justify-start text-xs"
              >
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contract Details */}
      <Card className="border-2 border-slate-300 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Code className="w-4 h-4" />
              {selectedEndpoint}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {currentContract.method}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Endpoint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Endpoint</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(currentContract.endpoint)}
                className="h-6 gap-1"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <code className="text-sm font-mono text-slate-900 bg-slate-50 p-3 rounded border border-slate-200 block">
              {currentContract.endpoint}
            </code>
          </div>

          {/* Headers */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Required Headers</p>
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <pre className="text-xs font-mono text-slate-700">
                {JSON.stringify(currentContract.headers, null, 2)}
              </pre>
            </div>
          </div>

          {/* Request/Response Tabs */}
          <Tabs defaultValue="request">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>
            
            <TabsContent value="request" className="mt-4">
              {currentContract.queryParams ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Query Parameters</p>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(JSON.stringify(currentContract.queryParams, null, 2))}
                        className="absolute top-2 right-2 h-6 gap-1"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <pre className="text-xs font-mono text-slate-700">
                        {JSON.stringify(currentContract.queryParams, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600">Request Body</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(JSON.stringify(currentContract.request, null, 2))}
                      className="h-6 gap-1"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 max-h-96 overflow-y-auto">
                    <pre className="text-xs font-mono text-slate-700">
                      {JSON.stringify(currentContract.request, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="response" className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600">Response Body</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(JSON.stringify(currentContract.response, null, 2))}
                  className="h-6 gap-1"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200 max-h-96 overflow-y-auto">
                <pre className="text-xs font-mono text-slate-700">
                  {JSON.stringify(currentContract.response, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>

          {/* Tenant Context Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold">Tenant Context Required</p>
              <p className="mt-1">All API calls must include X-Tenant-ID header for data isolation. Token must have appropriate scope permissions.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}