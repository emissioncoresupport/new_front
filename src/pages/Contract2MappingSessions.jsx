import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Network, AlertCircle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import RecordContextHeader from '@/components/supplylens/RecordContextHeader';
import EvidenceRecordLink from '@/components/supplylens/EvidenceRecordLink';

const StatusBadge = ({ status }) => {
  const config = {
    PENDING_MATCH: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    IN_REVIEW: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: AlertCircle },
    RESOLVED: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
    REJECTED: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle }
  };
  
  const { color, icon: Icon } = config[status] || config.PENDING_MATCH;
  
  return (
    <Badge className={`${color} border-2 flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};

const mockSessions = [
  {
    id: 'sess-001',
    mapping_session_id: 'MAPSESS-001',
    extraction_result_id: 'EXRES-001',
    record_id: 'EV-2026-001',
    status: 'PENDING_MATCH',
    ai_suggestions: 3,
    human_decisions: 0,
    created_at: '2026-01-15T12:00:00Z'
  },
  {
    id: 'sess-002',
    mapping_session_id: 'MAPSESS-002',
    extraction_result_id: 'EXRES-002',
    record_id: 'EV-2026-002',
    status: 'IN_REVIEW',
    ai_suggestions: 5,
    human_decisions: 2,
    created_at: '2026-01-16T09:30:00Z'
  },
  {
    id: 'sess-003',
    mapping_session_id: 'MAPSESS-003',
    extraction_result_id: 'EXRES-003',
    record_id: 'EV-2026-003',
    status: 'RESOLVED',
    ai_suggestions: 4,
    human_decisions: 4,
    created_at: '2026-01-17T14:20:00Z'
  }
];

export default function Contract2MappingSessions() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterRecordId = searchParams.get('record_id');

  const filteredSessions = filterRecordId 
    ? mockSessions.filter(session => session.record_id === filterRecordId)
    : mockSessions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        {filterRecordId && (
          <RecordContextHeader
            recordId={filterRecordId}
            evidenceType="SUPPLIER_MASTER"
            ingestionMethod="FILE_UPLOAD"
            binding={{ target_id: 'SUP-001' }}
            sealedAt={new Date().toISOString()}
            reconciliationStatus="READY_WITH_GAPS"
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Mapping Sessions</h1>
            <p className="text-sm text-slate-600 mt-1">
              AI-suggested entity mappings requiring human approval
              {filterRecordId && ` (Filtered by ${filterRecordId})`}
            </p>
          </div>
        </div>

        {/* Guidance Banner */}
        <Card className="bg-orange-50 border-2 border-orange-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Mapping Rules (CRITICAL)</p>
                <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                  <li><strong>NO AUTO-APPROVE:</strong> AI provides suggestions only. Human must approve all mappings</li>
                  <li>Every decision requires a reason code (e.g., "EXACT_MATCH", "FUZZY_MATCH", "REJECT_DUPLICATE")</li>
                  <li>Decisions are append-only - no deletion, only superseding</li>
                  <li>PENDING_MATCH status must be visible until human approves/rejects</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="bg-white border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-lg">Mapping Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSessions.length === 0 ? (
              <div className="p-12 text-center">
                <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Mapping Sessions</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Mapping sessions connect extracted data to master entities.
                  AI suggests matches, but <strong>human approval is mandatory</strong>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Session ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Evidence Record</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">AI Suggestions</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Human Decisions</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Created At</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {filteredSessions.map((session) => (
                      <tr key={session.mapping_session_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                          {session.mapping_session_id}
                        </td>
                        <td className="px-4 py-3">
                          <EvidenceRecordLink recordId={session.record_id} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={session.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            {session.ai_suggestions}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${session.human_decisions > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                            {session.human_decisions}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={createPageUrl(`EvidenceRecordDetail?id=${session.record_id}`)}>
                              <Button variant="ghost" size="sm" className="text-slate-600 text-xs">
                                View Evidence
                              </Button>
                            </Link>
                            <Link to={createPageUrl(`Contract2MappingSessions/${session.id}?record_id=${session.record_id}`)}>
                              <Button size="sm" className="bg-[#86b027] hover:bg-[#86b027]/90 text-white text-xs">
                                Review Suggestions
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}