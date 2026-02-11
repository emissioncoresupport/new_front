import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Circle, ArrowRight, User, Calendar, AlertCircle } from 'lucide-react';

/**
 * EVIDENCE STATE TIMELINE
 * 
 * Backend-derived state transition visualization.
 * Shows actor, role, timestamp, reason for each transition.
 * Read-only, deterministic, audit-grade.
 */

export default function EvidenceStateTimeline({ evidenceId, events }) {
  if (!events || events.length === 0) {
    return (
      <Card className="p-6 bg-white border border-slate-200">
        <div className="flex items-center gap-2 text-slate-600">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">No state transitions recorded yet.</p>
        </div>
      </Card>
    );
  }

  const getStateColor = (state) => {
    const colors = {
      RAW: 'bg-slate-200 text-slate-800',
      CLASSIFIED: 'bg-blue-200 text-blue-800',
      STRUCTURED: 'bg-green-200 text-green-800',
      REJECTED: 'bg-red-200 text-red-800'
    };
    return colors[state] || 'bg-slate-200 text-slate-800';
  };

  return (
    <Card className="p-6 bg-white border border-slate-200">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">State Timeline</h3>
        <p className="text-xs text-slate-600 mt-1">Backend-derived state transitions (UTC)</p>
      </div>

      <div className="space-y-4">
        {events.map((event, idx) => (
          <div key={event.event_id || idx} className="relative">
            {idx < events.length - 1 && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200" />
            )}
            
            <div className="flex items-start gap-4">
              <div className="relative">
                <Circle className="w-8 h-8 text-slate-400 fill-white" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getStateColor(event.previous_state)}>{event.previous_state || 'null'}</Badge>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <Badge className={getStateColor(event.new_state)}>{event.new_state || 'BLOCKED'}</Badge>
                  <Badge className="bg-slate-800 text-white text-xs">{event.event_type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-3 h-3" />
                    <span>{event.actor_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Badge variant="outline" className="text-xs">{event.actor_role}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 col-span-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(event.timestamp).toISOString()}</span>
                  </div>
                </div>

                {event.event_type === 'EvidenceStateTransitionBlocked' && event.payload && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <p className="text-red-900 font-medium">Blocked: {event.payload.blocked_reason}</p>
                    <p className="text-red-800 mt-1">{event.payload.blocked_reason_detail}</p>
                  </div>
                )}

                {event.payload && event.payload.rejection_reason && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <p className="text-slate-900 font-medium">Reason:</p>
                    <p className="text-slate-700 mt-1">{event.payload.rejection_reason}</p>
                  </div>
                )}

                {event.payload && event.payload.notes && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <p className="text-slate-700">{event.payload.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="text-blue-900 font-medium">🔍 Deterministic Replay</p>
        <p className="text-blue-800 mt-1">This timeline is rebuilt from immutable events. Same events = same state.</p>
      </div>
    </Card>
  );
}