import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, AlertCircle, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import RecordContextHeader from '@/components/supplylens/RecordContextHeader';
import EvidenceRecordLink from '@/components/supplylens/EvidenceRecordLink';

const StatusBadge = ({ status }) => {
  const config = {
    NOT_READY: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle },
    READY_WITH_GAPS: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
    READY: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle2 },
    PENDING_MATCH: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Clock }
  };
  
  const { color, icon: Icon } = config[status] || config.NOT_READY;
  
  return (
    <Badge className={`${color} border-2 flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};

const mockJobs = [
  {
    extraction_job_id: 'EXJOB-001',
    record_id: 'EV-2026-001',
    extraction_result_id: 'EXRES-001',
    status: 'READY',
    extracted_fields: 15,
    confidence_avg: 0.95,
    created_at: '2026-01-15T11:00:00Z'
  },
  {
    extraction_job_id: 'EXJOB-002',
    record_id: 'EV-2026-002',
    extraction_result_id: 'EXRES-002',
    status: 'READY_WITH_GAPS',
    extracted_fields: 12,
    confidence_avg: 0.78,
    created_at: '2026-01-16T15:00:00Z'
  }
];

export default function Contract2ExtractionJobs() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterRecordId = searchParams.get('record_id');

  const filteredJobs = filterRecordId 
    ? mockJobs.filter(job => job.record_id === filterRecordId)
    : mockJobs;

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
            <h1 className="text-3xl font-bold text-slate-900">Extraction Jobs</h1>
            <p className="text-sm text-slate-600 mt-1">
              AI-powered field extraction from evidence records
              {filterRecordId && ` (Filtered by ${filterRecordId})`}
            </p>
          </div>
          <Button className="gap-2 bg-[#86b027] hover:bg-[#86b027]/90">
            <PlayCircle className="w-4 h-4" />
            New Extraction
          </Button>
        </div>

        {/* Guidance Banner */}
        <Card className="bg-blue-50 border-2 border-blue-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Extraction Rules</p>
                <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                  <li>AI extracts structured data from evidence payloads</li>
                  <li>Each extraction is versioned and auditable</li>
                  <li>Low-confidence fields (&lt;70%) marked as READY_WITH_GAPS</li>
                  <li>Human review required before mapping decisions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs List */}
        <Card className="bg-white border-2 border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-lg">Extraction Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredJobs.length === 0 ? (
              <div className="p-12 text-center">
                <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Extraction Jobs</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Create extraction jobs to pull structured data from evidence records.
                  All extractions are deterministic and fully auditable.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50">
                {filteredJobs.map((job) => (
                  <div key={job.extraction_job_id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {job.extraction_job_id}
                          </span>
                          <StatusBadge status={job.status} />
                          <EvidenceRecordLink recordId={job.record_id} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{job.extracted_fields} fields extracted</span>
                          <span>•</span>
                          <span>Avg confidence: {(job.confidence_avg * 100).toFixed(0)}%</span>
                          <span>•</span>
                          <span>Created: {new Date(job.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={createPageUrl(`EvidenceRecordDetail?id=${job.record_id}`)}>
                          <Button variant="ghost" size="sm" className="text-slate-600">
                            ← Evidence
                          </Button>
                        </Link>
                        <Link to={createPageUrl(`Contract2ExtractionJobs/${job.id}?record_id=${job.record_id}`)}>
                          <Button variant="ghost" size="sm">
                            View Results →
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