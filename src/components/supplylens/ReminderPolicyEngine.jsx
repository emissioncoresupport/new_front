import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReminderPolicyEngine({ open, onClose }) {
  const [processing, setProcessing] = React.useState(false);
  const [results, setResults] = React.useState(null);

  const runReminderPolicy = () => {
    setProcessing(true);
    
    // Load supplier requests
    const stored = localStorage.getItem('supplier_requests') || '[]';
    const requests = JSON.parse(stored);
    
    const now = new Date();
    const events = [];
    const updatedRequests = [];
    
    requests.forEach(req => {
      if (req.status === 'RESOLVED') {
        updatedRequests.push(req);
        return;
      }
      
      const dueDate = new Date(req.due_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      // Check for existing grant (de-duplication)
      const allGrants = Object.keys(localStorage)
        .filter(k => k.startsWith('grants_'))
        .flatMap(k => JSON.parse(localStorage.getItem(k)));
      
      const matchingGrant = allGrants.find(g => 
        g.status === 'ACTIVE' && 
        g.datasets.some(ds => ds === req.dataset_type)
      );
      
      if (matchingGrant) {
        // Auto-resolve
        req.status = 'RESOLVED';
        req.resolved_at = now.toISOString();
        req.resolution_reason = 'ALREADY_GRANTED';
        req.grant_id = matchingGrant.grant_id;
        events.push({
          type: 'REQUEST_AUTO_RESOLVED',
          request_id: req.work_item_id,
          reason: 'ALREADY_GRANTED',
          grant_id: matchingGrant.grant_id,
          timestamp: now.toISOString()
        });
        updatedRequests.push(req);
        return;
      }
      
      // Reminder policy: T-14, T-7, T-2, T+1 (overdue)
      const escalationLevel = req.escalation_level || 0;
      const lastReminded = req.last_reminded_at ? new Date(req.last_reminded_at) : null;
      const daysSinceLastReminder = lastReminded ? Math.ceil((now - lastReminded) / (1000 * 60 * 60 * 24)) : 999;
      
      let shouldRemind = false;
      let reminderType = null;
      
      if (daysUntilDue === 14 && daysSinceLastReminder > 1) {
        shouldRemind = true;
        reminderType = 'T-14';
      } else if (daysUntilDue === 7 && daysSinceLastReminder > 1) {
        shouldRemind = true;
        reminderType = 'T-7';
      } else if (daysUntilDue === 2 && daysSinceLastReminder > 1) {
        shouldRemind = true;
        reminderType = 'T-2';
      } else if (daysUntilDue === -1 && escalationLevel === 0) {
        shouldRemind = true;
        reminderType = 'T+1_OVERDUE';
        req.escalation_level = 1;
      }
      
      if (shouldRemind) {
        req.last_reminded_at = now.toISOString();
        events.push({
          type: 'REMINDER_SENT',
          request_id: req.work_item_id,
          reminder_type: reminderType,
          supplier: req.supplier_name,
          dataset: req.dataset_type,
          due_date: req.due_date,
          timestamp: now.toISOString()
        });
        
        // Escalation creates Work Item
        if (reminderType === 'T+1_OVERDUE') {
          const escalationWorkItem = {
            work_item_id: `WI-ESC-${Date.now()}`,
            type: 'ESCALATION',
            status: 'OPEN',
            priority: 'HIGH',
            title: `Escalation: ${req.supplier_name} - ${req.dataset_type} overdue`,
            linked_request_id: req.work_item_id,
            supplier_id: req.supplier_id,
            supplier_name: req.supplier_name,
            created_at_utc: now.toISOString(),
            owner: 'representative@example.com',
            details: {
              reason: 'SUPPLIER_NON_RESPONSE',
              original_due_date: req.due_date,
              escalation_level: 1
            }
          };
          
          const workItems = localStorage.getItem('escalation_work_items') || '[]';
          const items = JSON.parse(workItems);
          items.push(escalationWorkItem);
          localStorage.setItem('escalation_work_items', JSON.stringify(items));
          
          events.push({
            type: 'ESCALATION_TRIGGERED',
            request_id: req.work_item_id,
            work_item_id: escalationWorkItem.work_item_id,
            escalation_level: 1,
            timestamp: now.toISOString()
          });
        }
      }
      
      updatedRequests.push(req);
    });
    
    // Save updates
    localStorage.setItem('supplier_requests', JSON.stringify(updatedRequests));
    
    // Save audit events
    const existingEvents = localStorage.getItem('reminder_audit_events') || '[]';
    const allEvents = [...JSON.parse(existingEvents), ...events];
    localStorage.setItem('reminder_audit_events', JSON.stringify(allEvents));
    
    setResults({
      processed: requests.length,
      reminders_sent: events.filter(e => e.type === 'REMINDER_SENT').length,
      auto_resolved: events.filter(e => e.type === 'REQUEST_AUTO_RESOLVED').length,
      escalations: events.filter(e => e.type === 'ESCALATION_TRIGGERED').length,
      events
    });
    
    setProcessing(false);
    toast.success(`Policy run complete: ${events.length} events`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl">
        <CardHeader className="border-b border-slate-200/50">
          <CardTitle className="text-lg font-light text-slate-900">Reminder Policy Engine</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-700 font-light">
              Deterministic reminder schedules: <strong>T-14, T-7, T-2, T+1</strong> (overdue escalation).
              De-duplicates against existing Grants. All actions logged.
            </p>
          </div>

          <Button
            onClick={runReminderPolicy}
            disabled={processing}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Bell className="w-4 h-4 mr-2" />
            {processing ? 'Processing...' : 'Run Reminder Policy'}
          </Button>

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-light text-slate-900">{results.processed}</p>
                  <p className="text-xs text-slate-600 mt-1">Processed</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-light text-blue-600">{results.reminders_sent}</p>
                  <p className="text-xs text-slate-600 mt-1">Reminders</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-light text-green-600">{results.auto_resolved}</p>
                  <p className="text-xs text-slate-600 mt-1">Auto-Resolved</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                  <p className="text-2xl font-light text-red-600">{results.escalations}</p>
                  <p className="text-xs text-slate-600 mt-1">Escalations</p>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {results.events.map((evt, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        evt.type === 'REMINDER_SENT' ? 'bg-blue-100 text-blue-800' :
                        evt.type === 'REQUEST_AUTO_RESOLVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      } style={{ fontSize: '10px' }}>
                        {evt.type}
                      </Badge>
                      <span className="font-mono text-slate-700">{evt.request_id}</span>
                    </div>
                    <p className="text-slate-600">
                      {evt.type === 'REMINDER_SENT' && `${evt.reminder_type} reminder to ${evt.supplier} for ${evt.dataset}`}
                      {evt.type === 'REQUEST_AUTO_RESOLVED' && `Auto-resolved: Grant ${evt.grant_id} already exists`}
                      {evt.type === 'ESCALATION_TRIGGERED' && `Escalation Work Item created: ${evt.work_item_id}`}
                    </p>
                    <p className="text-slate-500 mt-1">{new Date(evt.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}