import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckCircle2, XCircle, AlertCircle, Filter, ExternalLink } from 'lucide-react';
import RecordContextHeader from '@/components/supplylens/RecordContextHeader';
import EvidenceRecordLink from '@/components/supplylens/EvidenceRecordLink';

const DecisionBadge = ({ decision }) => {
  const config = {
    APPROVED: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
    REJECTED: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle },
    SUPERSEDED: { color: 'bg-slate-100 text-slate-800 border-slate-300', icon: AlertCircle }
  };
  
  const { color, icon: Icon } = config[decision] || config.APPROVED;
  
  return (
    <Badge className={`${color} border-2 flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {decision}
    </Badge>
  );
};

const mockDecisions = [
  {
    decision_id: 'DEC-001',
    mapping_session_id: 'MAPSESS-001',
    record_id: 'EV-2026-001',
    decision: 'APPROVED',
    reason_code: 'EXACT_MATCH',
    comment: 'Legal name, VAT, and country code match perfectly. Verified against company registry.',
    decided_by: 'john.doe@example.com',
    decided_at: '2026-01-15T14:30:00Z',
    entity_type: 'Supplier',
    entity_id: 'SUP-123',
    supersedes: null
  },
  {
    decision_id: 'DEC-002',
    mapping_session_id: 'MAPSESS-001',
    record_id: 'EV-2026-001',
    decision: 'REJECTED',
    reason_code: 'REJECT_DUPLICATE',
    comment: 'This SKU already exists in the system under a different supplier. Potential duplicate.',
    decided_by: 'jane.smith@example.com',
    decided_at: '2026-01-15T15:45:00Z',
    entity_type: 'SKU',
    entity_id: null,
    supersedes: null
  },
  {
    decision_id: 'DEC-003',
    mapping_session_id: 'MAPSESS-002',
    record_id: 'EV-2026-002',
    decision: 'APPROVED',
    reason_code: 'FUZZY_MATCH',
    comment: 'Minor variation in company name but VAT and address confirm same entity.',
    decided_by: 'john.doe@example.com',
    decided_at: '2026-01-16T10:15:00Z',
    entity_type: 'Supplier',
    entity_id: 'SUP-456',
    supersedes: null
  },
  {
    decision_id: 'DEC-004',
    mapping_session_id: 'MAPSESS-002',
    record_id: 'EV-2026-002',
    decision: 'SUPERSEDED',
    reason_code: 'EXACT_MATCH',
    comment: 'Supersedes DEC-003. After further verification, confirmed exact match with different entity SUP-789.',
    decided_by: 'jane.smith@example.com',
    decided_at: '2026-01-16T14:20:00Z',
    entity_type: 'Supplier',
    entity_id: 'SUP-789',
    supersedes: 'DEC-003'
  }
];

export default function Contract2DecisionLog() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterRecordId = searchParams.get('record_id');

  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  let filteredDecisions = filterRecordId
    ? mockDecisions.filter(d => d.record_id === filterRecordId)
    : mockDecisions;

  // Apply filters
  if (entityTypeFilter !== 'all') {
    filteredDecisions = filteredDecisions.filter(d => d.entity_type === entityTypeFilter);
  }
  if (decisionFilter !== 'all') {
    filteredDecisions = filteredDecisions.filter(d => d.decision === decisionFilter);
  }
  if (searchQuery) {
    filteredDecisions = filteredDecisions.filter(d => 
      d.decision_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.record_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.comment.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

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
            reconciliationStatus="READY"
          />
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Decision Log</h1>
            <p className="text-sm text-slate-600 mt-1">
              Append-only audit trail of all mapping decisions
              {filterRecordId && ` (Filtered by ${filterRecordId})`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-600" />
              <div className="flex-1 grid grid-cols-3 gap-3">
                <Input
                  placeholder="Search decisions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entity Types</SelectItem>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                    <SelectItem value="SKU">SKU</SelectItem>
                    <SelectItem value="Part">Part</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={decisionFilter} onValueChange={setDecisionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Decision Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Decisions</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="SUPERSEDED">Superseded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guidance Banner */}
        <Card className="bg-red-50 border-2 border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Decision Log Rules (IMMUTABLE)</p>
                <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                  <li><strong>Append-only:</strong> Decisions cannot be deleted, only superseded by new decisions</li>
                  <li><strong>Reason codes mandatory:</strong> Every decision must include a reason (e.g., EXACT_MATCH, FUZZY_MATCH, REJECT_DUPLICATE)</li>
                  <li><strong>Audit trail:</strong> Timestamp, user, and reason captured for regulatory compliance</li>
                  <li><strong>No auto-approve:</strong> All decisions require explicit human action</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decision Log */}
        <Card className="bg-white border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-lg">Decision Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDecisions.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Decisions Recorded</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  All mapping approvals and rejections will be recorded here.
                  This log is append-only and immutable for compliance.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50">
                {filteredDecisions.map((decision) => (
                  <div key={decision.decision_id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {decision.decision_id}
                          </span>
                          <DecisionBadge decision={decision.decision} />
                          <EvidenceRecordLink recordId={decision.record_id} />
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(decision.decided_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Supersedes Warning */}
                      {decision.supersedes && (
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-orange-800">
                            <AlertCircle className="w-4 h-4" />
                            <span className="font-semibold">Supersedes decision {decision.supersedes}</span>
                          </div>
                        </div>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-600 text-xs uppercase tracking-wide">Reason Code</span>
                          <div className="font-mono font-semibold text-slate-900 mt-1">
                            {decision.reason_code}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs uppercase tracking-wide">Decided By</span>
                          <div className="text-slate-900 mt-1">
                            {decision.decided_by}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-600 text-xs uppercase tracking-wide">Entity Type</span>
                          <div className="text-slate-900 mt-1">
                            {decision.entity_type}
                          </div>
                        </div>
                        {decision.entity_id && (
                          <div>
                            <span className="text-slate-600 text-xs uppercase tracking-wide">Entity ID</span>
                            <div className="font-mono text-slate-900 mt-1">
                              {decision.entity_id}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Comment */}
                      <div className="bg-white border-2 border-slate-200 rounded-lg p-4">
                        <div className="text-xs font-semibold text-slate-600 mb-2">Decision Comment:</div>
                        <div className="text-sm text-slate-700 italic">{decision.comment}</div>
                      </div>

                      {/* Links */}
                      <div className="flex items-center gap-3 pt-2">
                        <Link to={createPageUrl(`Contract2MappingSessions/${decision.mapping_session_id}?record_id=${decision.record_id}`)}>
                          <Button variant="ghost" size="sm" className="gap-2 text-[#86b027] hover:text-[#86b027]/80">
                            <ExternalLink className="w-3 h-3" />
                            View Mapping Session
                          </Button>
                        </Link>
                        <Link to={createPageUrl(`EvidenceRecordDetail?id=${decision.record_id}`)}>
                          <Button variant="ghost" size="sm" className="gap-2 text-[#86b027] hover:text-[#86b027]/80">
                            <ExternalLink className="w-3 h-3" />
                            View Evidence
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}