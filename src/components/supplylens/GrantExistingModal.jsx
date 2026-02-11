import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Search, Share2, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function GrantExistingModal({ request, supplierOrg, onClose, onComplete }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierEvidence, setSupplierEvidence] = useState([]);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  React.useEffect(() => {
    // Load ONLY supplier-owned evidence (server-side authz simulation)
    const stored = localStorage.getItem('supplier_evidence_records') || '[]';
    const records = JSON.parse(stored);
    const filtered = records.filter(r => 
      r.owner_org_id === supplierOrg.supplier_org_id &&
      r.dataset_type === request.dataset_type &&
      r.ledger_state === 'SEALED'
    );
    setSupplierEvidence(filtered);
  }, [supplierOrg, request]);

  const filteredEvidence = supplierEvidence.filter(ev =>
    searchQuery === '' ||
    ev.evidence_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGrant = () => {
    if (!selectedEvidence) {
      toast.error('Please select evidence');
      return;
    }

    const grant = {
      grant_id: `GNT-${Date.now()}`,
      supplier_org_id: supplierOrg.supplier_org_id,
      buyer_org_id: request.buyer_org_id,
      evidence_id: selectedEvidence.evidence_id,
      dataset_type: request.dataset_type,
      scope: request.scope,
      period: request.period,
      status: 'ACTIVE',
      granted_at: new Date().toISOString(),
      granted_by: 'supplier_user@example.com'
    };

    const existing = localStorage.getItem('supplier_grants') || '[]';
    const grants = JSON.parse(existing);
    grants.push(grant);
    localStorage.setItem('supplier_grants', JSON.stringify(grants));

    // Log access event
    const accessLog = {
      log_id: `LOG-${Date.now()}`,
      evidence_id: selectedEvidence.evidence_id,
      tenant: supplierOrg.supplier_org_id,
      actor: 'supplier_user@example.com',
      action: 'GRANT_CREATED',
      allowed: true,
      grant_id: grant.grant_id,
      buyer_org: request.buyer_org_id,
      timestamp: new Date().toISOString()
    };
    
    const logs = localStorage.getItem('supplier_access_logs') || '[]';
    const allLogs = JSON.parse(logs);
    allLogs.push(accessLog);
    localStorage.setItem('supplier_access_logs', JSON.stringify(allLogs));

    // Update request status
    const updatedRequest = { ...request, status: 'SUBMITTED', submitted_at: new Date().toISOString() };
    const stored = localStorage.getItem('supplier_request_packages') || '[]';
    const requests = JSON.parse(stored);
    const updated = requests.map(r => r.request_id === request.request_id ? updatedRequest : r);
    localStorage.setItem('supplier_request_packages', JSON.stringify(updated));

    toast.success('Grant created successfully');
    onComplete(updatedRequest);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl max-h-[80vh] flex flex-col">
        <CardHeader className="border-b border-slate-200/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-light text-slate-900">Grant Existing Evidence</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">
          <Card className="border border-slate-300 bg-slate-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 font-light">
                  <strong>Authorization:</strong> You can only grant access to evidence you own. 
                  Only evidence matching dataset_type "{request.dataset_type}" is shown.
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your evidence..."
              className="pl-10"
            />
          </div>

          {filteredEvidence.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500 font-light">No matching evidence found</p>
              <p className="text-xs text-slate-400 font-light mt-1">
                Evidence must be SEALED and match dataset type "{request.dataset_type}"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvidence.map((ev) => (
                <Card
                  key={ev.evidence_id}
                  className={`cursor-pointer border transition-all ${
                    selectedEvidence?.evidence_id === ev.evidence_id
                      ? 'border-[#86b027] bg-[#86b027]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedEvidence(ev)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-mono font-semibold text-slate-900 mb-1">
                          {ev.evidence_id}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{ev.dataset_type}</Badge>
                          {ev.period && <Badge variant="outline" className="text-xs">{ev.period}</Badge>}
                        </div>
                        <p className="text-xs text-slate-600">
                          {ev.file_name} • {new Date(ev.ingestion_timestamp_utc).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedEvidence?.evidence_id === ev.evidence_id && (
                        <div className="w-5 h-5 rounded-full bg-[#86b027] flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        <div className="border-t border-slate-200 p-4 flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleGrant}
            disabled={!selectedEvidence}
            className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90 text-white"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Create Grant
          </Button>
        </div>
      </Card>
    </div>
  );
}