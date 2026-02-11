import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EvidenceOverview from '@/components/supplylens/EvidenceOverview';
import EvidenceStateTimeline from '@/components/supplylens/EvidenceStateTimeline';
import EvidenceIntentPanel from '@/components/supplylens/EvidenceIntentPanel';
import { getEvidenceState, getEvidenceHistory } from '@/components/supplylens/services/BackendCommandService';

/**
 * EVIDENCE DETAIL PAGE - INTENT-ONLY MODE
 * 
 * Read-only Evidence view with intent action panel.
 * All mutations go through backend command API.
 * No optimistic updates.
 * Backend truth only.
 */

export default function EvidenceDetail() {
  const [searchParams] = useSearchParams();
  const evidenceId = searchParams.get('id');

  const [evidence, setEvidence] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvidence = async () => {
    try {
      // PRIMARY: Load Evidence state from backend projection
      const backendState = await getEvidenceState(evidenceId);
      
      if (backendState.success) {
        // Backend authoritative
        setEvidence(backendState.data);
      } else {
        // FALLBACK ONLY: Load from Base44 entities (not authoritative)
        console.warn('Backend projection unavailable, using Base44 fallback');
        const evidenceList = await base44.entities.Evidence.filter({ id: evidenceId });
        if (evidenceList.length > 0) {
          setEvidence(evidenceList[0]);
        }
      }

      // PRIMARY: Load event history from backend
      const backendHistory = await getEvidenceHistory(evidenceId);
      
      if (backendHistory.success) {
        // Backend authoritative
        setEvents(backendHistory.events);
      } else {
        // FALLBACK ONLY: Load from Base44 audit logs (not authoritative)
        console.warn('Backend history unavailable, using Base44 fallback');
        const auditLogs = await base44.entities.AuditLogEntry.filter(
          { entity_id: evidenceId },
          '-action_timestamp'
        );

        const mockEvents = auditLogs.map(log => ({
          event_id: log.id,
          event_type: log.action,
          actor_id: log.actor_id,
          actor_role: log.actor_role,
          previous_state: null,
          new_state: null,
          timestamp: log.action_timestamp,
          payload: log.details
        }));

        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Error loading evidence:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (evidenceId) {
      loadEvidence();
    }
  }, [evidenceId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvidence();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-600">Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600">Evidence not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-[#86b027]/10 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('SupplyLens')}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Evidence
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-slate-900 uppercase tracking-widest">Evidence Detail</h1>
              <p className="text-xs text-slate-600 mt-1">Read-Only View | Intent-Only Actions</p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Backend Truth Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded">
          <p className="text-sm text-amber-900 font-medium">⚠️ Intent-Only Mode Active</p>
          <p className="text-xs text-amber-800 mt-1">
            Base44 submits intent requests only. Backend enforces all state transitions and mutations.
            This page displays backend truth with no optimistic updates.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Overview */}
          <div className="lg:col-span-1">
            <EvidenceOverview evidence={evidence} />
          </div>

          {/* Middle Column: Timeline */}
          <div className="lg:col-span-1">
            <EvidenceStateTimeline evidenceId={evidenceId} events={events} />
          </div>

          {/* Right Column: Intent Actions */}
          <div className="lg:col-span-1">
            <EvidenceIntentPanel
              evidence={evidence}
              onIntentSubmitted={handleRefresh}
            />
          </div>
        </div>

        {/* Developer Console Link */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-900 font-medium">🔧 Backend Enforcement Status</p>
          <p className="text-xs text-blue-800 mt-1">
            All blocked actions reference Developer Console entries. Backend implementation required for state mutations.
          </p>
          <Link to={createPageUrl('DeveloperConsole')} className="text-xs text-blue-700 underline mt-2 inline-block">
            View Developer Console →
          </Link>
        </div>
      </div>
    </div>
  );
}