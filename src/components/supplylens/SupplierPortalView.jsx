import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import RequestDetailDrawer from './RequestDetailDrawer';

export default function SupplierPortalView() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [currentSupplierOrg, setCurrentSupplierOrg] = useState(null);

  React.useEffect(() => {
    // Simulate auth context - get current supplier org
    const authContext = localStorage.getItem('supplier_auth_context') || '{"supplier_org_id":"SupplierCorp","supplier_org_name":"SupplierCorp Inc"}';
    const ctx = JSON.parse(authContext);
    setCurrentSupplierOrg(ctx);

    // Load requests - FILTER by supplier_org_id (server-side authz simulation)
    const stored = localStorage.getItem('supplier_request_packages') || '[]';
    const allRequests = JSON.parse(stored);
    const filteredRequests = allRequests.filter(r => r.supplier_org_id === ctx.supplier_org_id);
    setRequests(filteredRequests.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
  }, []);

  const getDueDateStatus = (dueDateStr) => {
    const dueDate = new Date(dueDateStr);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return { type: 'overdue', label: `${Math.abs(daysUntilDue)}d overdue`, color: 'red' };
    if (daysUntilDue <= 7) return { type: 'urgent', label: `${daysUntilDue}d left`, color: 'amber' };
    return { type: 'normal', label: dueDate.toLocaleDateString(), color: 'slate' };
  };

  if (!currentSupplierOrg) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-500 font-light">Supplier authentication required</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Logged in as</p>
              <p className="text-sm font-semibold text-slate-900">{currentSupplierOrg.supplier_org_name}</p>
            </div>
            <Badge variant="outline" className="text-xs">{currentSupplierOrg.supplier_org_id}</Badge>
          </div>
        </CardContent>
      </Card>

      {requests.length === 0 ? (
        <Card className="border border-slate-200/60 bg-white/70 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 font-light">No pending data requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const dueStatus = getDueDateStatus(req.due_date);
            
            return (
              <Card key={req.request_id} className={`border cursor-pointer hover:shadow-lg transition-all ${
                dueStatus.type === 'overdue' ? 'border-red-200 bg-red-50/30' :
                dueStatus.type === 'urgent' ? 'border-amber-200 bg-amber-50/30' :
                'border-slate-200 bg-white/70'
              } backdrop-blur-xl`}
              onClick={() => setSelectedRequest(req)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-900">{req.title || 'Data Request'}</p>
                        {dueStatus.type === 'overdue' && <AlertCircle className="w-4 h-4 text-red-600" />}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{req.dataset_type}</Badge>
                        <Badge variant="outline" className="text-xs">Period: {req.period}</Badge>
                        <Badge className={`text-xs ${
                          req.status === 'OPEN' ? 'bg-slate-700 text-white' :
                          req.status === 'SUBMITTED' ? 'bg-green-700 text-white' :
                          'bg-slate-500 text-white'
                        }`}>{req.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={dueStatus.color === 'red' ? 'text-red-600 font-semibold' : 
                                         dueStatus.color === 'amber' ? 'text-amber-600 font-semibold' : ''}>
                            {dueStatus.label}
                          </span>
                        </div>
                        <span>Requester: {req.buyer_org_id}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedRequest && (
        <RequestDetailDrawer
          request={selectedRequest}
          supplierOrg={currentSupplierOrg}
          onClose={() => setSelectedRequest(null)}
          onRequestUpdated={(updatedReq) => {
            setRequests(prev => prev.map(r => r.request_id === updatedReq.request_id ? updatedReq : r));
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}