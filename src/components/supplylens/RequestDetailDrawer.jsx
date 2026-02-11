import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Share2, MessageCircle, FileText, AlertCircle, CheckCircle2, ShieldOff, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import RequestBoundUploadModal from './RequestBoundUploadModal';
import GrantExistingModal from './GrantExistingModal';
import { createGDPRExportRequest, createGDPRDeletionRequest } from './GDPRControlsUtility';

export default function RequestDetailDrawer({ request, supplierOrg, onClose, onRequestUpdated }) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [activeGrants, setActiveGrants] = useState([]);

  React.useEffect(() => {
    // Load active grants for this request
    const stored = localStorage.getItem('supplier_grants') || '[]';
    const grants = JSON.parse(stored);
    const requestGrants = grants.filter(g => 
      g.supplier_org_id === supplierOrg.supplier_org_id &&
      g.buyer_org_id === request.buyer_org_id &&
      g.dataset_type === request.dataset_type &&
      g.status === 'ACTIVE'
    );
    setActiveGrants(requestGrants);
  }, [request, supplierOrg]);

  const handleAskClarification = () => {
    const workItem = {
      work_item_id: `WI-CLR-${Date.now()}`,
      type: 'CLARIFICATION_REQUEST',
      status: 'OPEN',
      priority: 'MEDIUM',
      title: `Clarification needed: ${request.dataset_type}`,
      linked_request_id: request.request_id,
      supplier_org_id: supplierOrg.supplier_org_id,
      buyer_org_id: request.buyer_org_id,
      created_at_utc: new Date().toISOString(),
      details: {
        reason: 'SUPPLIER_NEEDS_CLARIFICATION',
        request_title: request.title
      }
    };

    const existing = localStorage.getItem('clarification_work_items') || '[]';
    const items = JSON.parse(existing);
    items.push(workItem);
    localStorage.setItem('clarification_work_items', JSON.stringify(items));

    alert('Clarification request sent to buyer');
  };

  const handleSupersedeGrant = (grantId) => {
    const stored = localStorage.getItem('supplier_grants') || '[]';
    const grants = JSON.parse(stored);
    const updated = grants.map(g => 
      g.grant_id === grantId 
        ? { ...g, status: 'SUPERSEDED', superseded_at: new Date().toISOString(), superseded_by: 'supplier_user@example.com' }
        : g
    );
    localStorage.setItem('supplier_grants', JSON.stringify(updated));
    
    // Log revocation
    const accessLog = {
      log_id: `LOG-${Date.now()}`,
      evidence_id: grants.find(g => g.grant_id === grantId)?.evidence_id,
      tenant: supplierOrg.supplier_org_id,
      actor: 'supplier_user@example.com',
      action: 'GRANT_SUPERSEDED',
      allowed: true,
      grant_id: grantId,
      buyer_org: request.buyer_org_id,
      timestamp: new Date().toISOString()
    };
    
    const logs = localStorage.getItem('supplier_access_logs') || '[]';
    const allLogs = JSON.parse(logs);
    allLogs.push(accessLog);
    localStorage.setItem('supplier_access_logs', JSON.stringify(allLogs));

    setActiveGrants(prev => prev.filter(g => g.grant_id !== grantId));
    alert('Grant superseded successfully');
  };

  const handleGDPRExportRequest = () => {
    const workItem = createGDPRExportRequest(
      request.request_id,
      supplierOrg.supplier_org_id,
      'supplier_user@example.com'
    );
    toast.success('GDPR Export Request submitted', {
      description: `Work item ${workItem.work_item_id} created`
    });
  };

  const handleGDPRDeletionRequest = () => {
    const workItem = createGDPRDeletionRequest(
      request.request_id,
      supplierOrg.supplier_org_id,
      'supplier_user@example.com'
    );
    toast.success('GDPR Deletion Request submitted', {
      description: `Work item ${workItem.work_item_id} created. Tombstone & crypto-shred design.`
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-end justify-end">
      <div className="w-full max-w-2xl h-full bg-white/95 backdrop-blur-xl shadow-2xl border-l border-slate-200 overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-gradient-to-r from-white/90 to-slate-50/80 backdrop-blur-md border-b border-slate-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-light text-slate-900 tracking-tight">Request Detail</h2>
            <p className="text-sm text-slate-600 font-light mt-1">Review requirements and submit evidence</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Request Summary */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/50">
              <CardTitle className="text-base font-light">Request Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Request ID</p>
                  <p className="text-sm font-mono text-slate-900">{request.request_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</p>
                  <Badge className={`${
                    request.status === 'OPEN' ? 'bg-slate-700 text-white' :
                    request.status === 'SUBMITTED' ? 'bg-green-700 text-white' :
                    'bg-slate-500 text-white'
                  }`}>{request.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Requester</p>
                  <p className="text-sm text-slate-900">{request.buyer_org_id}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Due Date</p>
                  <p className="text-sm text-slate-900">{new Date(request.due_date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/50">
              <CardTitle className="text-base font-light">Required Data</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dataset Type</p>
                <Badge variant="outline" className="text-sm">{request.dataset_type}</Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Scope</p>
                <p className="text-sm text-slate-900">{request.scope}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Reporting Period</p>
                <p className="text-sm text-slate-900">{request.period}</p>
              </div>
              {request.required_fields && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Required Fields</p>
                  <div className="flex flex-wrap gap-2">
                    {request.required_fields.map((field, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {request.acceptable_file_types && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Acceptable File Types</p>
                  <p className="text-sm text-slate-600">{request.acceptable_file_types.join(', ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border border-[#86b027]/30 bg-gradient-to-r from-[#86b027]/5 to-white/70 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/50">
              <CardTitle className="text-base font-light">Submit Response</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button
                className="w-full bg-[#86b027] hover:bg-[#86b027]/90 text-white justify-start"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Evidence
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-300"
                onClick={() => setShowGrantModal(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Grant Existing Evidence
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-300"
                onClick={handleAskClarification}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask Clarification
              </Button>
            </CardContent>
          </Card>

          {/* GDPR Controls */}
          <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/50">
              <CardTitle className="text-base font-light">GDPR Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start border-slate-300 hover:bg-blue-50"
                onClick={handleGDPRExportRequest}
              >
                <Download className="w-4 h-4 mr-2" />
                GDPR Export Request (DSAR)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-red-300 hover:bg-red-50 text-red-700"
                onClick={handleGDPRDeletionRequest}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                GDPR Deletion Request
              </Button>
              <p className="text-xs text-slate-500 font-light mt-2">
                Deletion requests create tombstone marks. Base44 does not perform actual deletion; future crypto-shred design implemented.
              </p>
            </CardContent>
          </Card>

           {/* Active Grants */}
           <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/50">
              <CardTitle className="text-base font-light">Active Grants</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {activeGrants.length === 0 ? (
                <div className="text-center py-6">
                  <Share2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 font-light">No active grants for this request</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeGrants.map((grant) => (
                    <div key={grant.grant_id} className="bg-slate-50/50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-mono font-semibold text-slate-900">{grant.grant_id}</p>
                            <Badge className="bg-green-100 text-green-800 text-xs">ACTIVE</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{grant.dataset_type}</Badge>
                            {grant.period && <Badge variant="outline" className="text-xs">{grant.period}</Badge>}
                          </div>
                          <p className="text-xs text-slate-600">
                            Evidence: {grant.evidence_id} • Granted: {new Date(grant.granted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleSupersedeGrant(grant.grant_id)}
                        >
                          <ShieldOff className="w-3 h-3 mr-1" />
                          Supersede
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Authorization Notice */}
          <Card className="border border-slate-200/60 bg-slate-50/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 font-light leading-relaxed">
                  <strong>Access Control:</strong> You can only upload evidence or grant access within this request context. 
                  All uploads are bound to this request_id and cannot be reassigned to other buyers. 
                  Evidence bytes remain in your workspace.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showUploadModal && (
        <RequestBoundUploadModal
          request={request}
          supplierOrg={supplierOrg}
          onClose={() => setShowUploadModal(false)}
          onComplete={(updatedReq) => {
            setShowUploadModal(false);
            onRequestUpdated(updatedReq);
          }}
        />
      )}

      {showGrantModal && (
        <GrantExistingModal
          request={request}
          supplierOrg={supplierOrg}
          onClose={() => setShowGrantModal(false)}
          onComplete={(updatedReq) => {
            setShowGrantModal(false);
            onRequestUpdated(updatedReq);
          }}
        />
      )}
    </div>
  );
}