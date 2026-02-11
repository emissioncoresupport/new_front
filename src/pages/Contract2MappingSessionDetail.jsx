import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';
import RecordContextHeader from '@/components/supplylens/RecordContextHeader';
import EvidenceRecordLink from '@/components/supplylens/EvidenceRecordLink';

const mockSuggestions = [
  {
    suggestion_id: 'SUG-001',
    entity_type: 'Supplier',
    matched_entity_id: 'SUP-123',
    matched_entity_name: 'ABC Manufacturing Ltd.',
    similarity_score: 95,
    rationale: 'Exact match on legal name, VAT number, and country code. High confidence match.',
    evidence_links: ['Legal name: ABC Manufacturing Ltd.', 'VAT: GB123456789', 'Country: GB'],
    rank: 1
  },
  {
    suggestion_id: 'SUG-002',
    entity_type: 'Supplier',
    matched_entity_id: 'SUP-456',
    matched_entity_name: 'ABC Manufacturing Limited',
    similarity_score: 78,
    rationale: 'Fuzzy match on legal name variation. Same country, but VAT number not verified.',
    evidence_links: ['Legal name: ABC Manufacturing Limited (variant)', 'Country: GB'],
    rank: 2
  }
];

export default function Contract2MappingSessionDetail() {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const recordId = searchParams.get('record_id');

  const [decision, setDecision] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  const handleSaveDecision = () => {
    if (!decision || !reasonCode || !comment.trim()) {
      alert('All fields are mandatory: Decision, Reason Code, and Comment');
      return;
    }
    alert(`Decision saved: ${decision} - ${reasonCode}\n\nThis creates an immutable Decision record.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Navigation */}
        <Link to={createPageUrl(`Contract2MappingSessions${recordId ? `?record_id=${recordId}` : ''}`)}>
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Mapping Sessions
          </Button>
        </Link>

        {recordId && (
          <RecordContextHeader
            recordId={recordId}
            evidenceType="SUPPLIER_MASTER"
            ingestionMethod="FILE_UPLOAD"
            binding={{ target_id: 'SUP-001' }}
            sealedAt={new Date().toISOString()}
            reconciliationStatus="READY_WITH_GAPS"
          />
        )}

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mapping Session: MAPSESS-{id}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review AI-suggested matches and make audit-grade decisions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: AI Suggestions */}
          <div className="space-y-4">
            <Card className="bg-white border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-lg">AI Suggested Matches</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {mockSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.suggestion_id}
                    className="p-4 border-2 border-slate-200 rounded-lg bg-slate-50 hover:border-[#86b027] transition-colors"
                  >
                    {/* Rank and Score */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-purple-100 text-purple-800 border-2 border-purple-300">
                        Rank #{suggestion.rank}
                      </Badge>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#86b027]">{suggestion.similarity_score}%</div>
                        <div className="text-xs text-slate-600">Similarity</div>
                      </div>
                    </div>

                    {/* Entity Info */}
                    <div className="space-y-2 mb-3">
                      <div className="text-sm text-slate-600">Entity Type: <span className="font-semibold text-slate-900">{suggestion.entity_type}</span></div>
                      <div className="text-sm text-slate-600">Matched Entity:</div>
                      <div className="font-semibold text-slate-900">{suggestion.matched_entity_name}</div>
                      <div className="font-mono text-xs text-slate-600">{suggestion.matched_entity_id}</div>
                    </div>

                    {/* Rationale */}
                    <div className="mb-3 p-3 bg-white rounded border border-slate-200">
                      <div className="text-xs font-semibold text-slate-600 mb-1">AI Rationale:</div>
                      <div className="text-sm text-slate-700">{suggestion.rationale}</div>
                    </div>

                    {/* Evidence Links */}
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-2">Evidence:</div>
                      <ul className="space-y-1">
                        {suggestion.evidence_links.map((link, idx) => (
                          <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-[#86b027] mt-1">•</span>
                            <span>{link}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Human Decision Form */}
          <div className="space-y-4">
            <Card className="bg-white border-2 border-[#86b027] shadow-[0_2px_8px_rgba(0,0,0,0.08)] sticky top-6">
              <CardHeader className="border-b border-slate-200 bg-[#86b027]/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
                  <CardTitle className="text-lg">Human Decision Form</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Decision */}
                <div>
                  <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                    Decision <span className="text-red-600">*</span>
                  </Label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select decision..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPT_MATCH">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Accept Match
                        </div>
                      </SelectItem>
                      <SelectItem value="REJECT">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          Reject
                        </div>
                      </SelectItem>
                      <SelectItem value="CREATE_NEW_ENTITY">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          Create New Entity
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason Code */}
                <div>
                  <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                    Reason Code <span className="text-red-600">*</span>
                  </Label>
                  <Select value={reasonCode} onValueChange={setReasonCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason code..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXACT_MATCH">EXACT_MATCH</SelectItem>
                      <SelectItem value="FUZZY_MATCH">FUZZY_MATCH</SelectItem>
                      <SelectItem value="REJECT_DUPLICATE">REJECT_DUPLICATE</SelectItem>
                      <SelectItem value="REJECT_INSUFFICIENT_EVIDENCE">REJECT_INSUFFICIENT_EVIDENCE</SelectItem>
                      <SelectItem value="NEEDS_MORE_INFO">NEEDS_MORE_INFO</SelectItem>
                      <SelectItem value="DATA_QUALITY_ISSUE">DATA_QUALITY_ISSUE</SelectItem>
                      <SelectItem value="MANUAL_VERIFICATION_REQUIRED">MANUAL_VERIFICATION_REQUIRED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Comment */}
                <div>
                  <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                    Comment <span className="text-red-600">*</span>
                  </Label>
                  <Textarea
                    placeholder="Explain your decision rationale..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    This comment will be part of the immutable audit trail.
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveDecision}
                  className="w-full bg-[#86b027] hover:bg-[#86b027]/90 text-white"
                  size="lg"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Save Decision (Immutable)
                </Button>

                {/* Warning */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700 space-y-1">
                      <p className="font-semibold text-slate-900">Append-Only Decision</p>
                      <p>
                        Once saved, this decision cannot be deleted. If you need to change it,
                        you must create a new decision that supersedes this one.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}