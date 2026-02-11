import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, FileText, Share2, Upload } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function SupplierInboxView() {
  const [requests, setRequests] = React.useState([]);

  React.useEffect(() => {
    const stored = localStorage.getItem('supplier_requests') || '[]';
    const reqs = JSON.parse(stored).filter(r => r.status === 'OPEN').sort((a, b) => 
      new Date(a.due_date) - new Date(b.due_date)
    );
    setRequests(reqs);
  }, []);

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-500 font-light">No pending data requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const dueDate = new Date(req.due_date);
        const now = new Date();
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDue < 0;
        const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

        return (
          <div key={req.work_item_id} className={`border rounded-lg p-4 ${
            isOverdue ? 'bg-red-50/50 border-red-200' : 
            isDueSoon ? 'bg-amber-50/50 border-amber-200' : 
            'bg-white border-slate-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-900">{req.title || 'Data Request'}</p>
                  {isOverdue && <AlertCircle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{req.dataset_type}</Badge>
                  {req.escalation_level > 0 && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      Escalation L{req.escalation_level}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due: {dueDate.toLocaleDateString()}
                    {isOverdue && <span className="text-red-600 font-semibold ml-1">({Math.abs(daysUntilDue)}d overdue)</span>}
                    {isDueSoon && <span className="text-amber-600 font-semibold ml-1">({daysUntilDue}d left)</span>}
                  </div>
                  {req.last_reminded_at && (
                    <span>Last reminded: {new Date(req.last_reminded_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 hover:bg-white"
                  onClick={() => {
                    window.location.href = createPageUrl('EvidenceVault') + '?tab=drafts&openWizard=true';
                  }}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Upload New
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#86b027] bg-[#86b027]/10 hover:bg-[#86b027]/20 text-[#86b027]"
                  onClick={() => {
                    alert('Grant existing evidence:\n\nSelect an existing sealed evidence record and grant access to this buyer for the requested dataset scope.');
                  }}
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  Grant Existing
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}