import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, Play } from 'lucide-react';

/**
 * Contract-1 Evidence Sealing Test Checklist
 * 
 * Comprehensive test matrix for all ingestion methods.
 * Pass/Fail items for manual QA and automated regression testing.
 */

const TEST_MATRIX = {
  MANUAL_ENTRY: [
    { id: 'me_1', test: 'Step 1: Create draft with MANUAL_ENTRY method', expected: 'Draft ID returned, stored in session' },
    { id: 'me_2', test: 'Step 1: Validation blocks if entry_notes < 20 chars', expected: 'Error shown, cannot proceed' },
    { id: 'me_3', test: 'Step 1: Validation blocks if contains_personal_data=true but no pii_confirmation', expected: 'Error shown, cannot proceed' },
    { id: 'me_4', test: 'Step 2: Manual JSON form rendered, no file uploader shown', expected: 'JSON textarea visible' },
    { id: 'me_5', test: 'Step 2: Invalid JSON blocks next step', expected: 'JSON validation error shown' },
    { id: 'me_6', test: 'Step 2: Valid JSON accepts and computes canonical hash server-side', expected: 'Payload accepted, hash computed' },
    { id: 'me_7', test: 'Step 3: Review shows trust_level=LOW, review_status=NOT_REVIEWED', expected: 'Warning banner visible' },
    { id: 'me_8', test: 'Step 3: Seal creates evidence with immutable ledger_state=SEALED', expected: 'Receipt shows SEALED' },
    { id: 'me_9', test: 'Evidence cannot be sealed twice (immutability)', expected: 'IMMUTABILITY_CONFLICT error' },
    { id: 'me_10', test: 'Session storage cleared after successful seal', expected: 'draft_id removed from storage' }
  ],
  FILE_UPLOAD: [
    { id: 'fu_1', test: 'Step 1: Create draft with FILE_UPLOAD method', expected: 'Draft ID returned' },
    { id: 'fu_2', test: 'Step 2: File uploader rendered, accepts CSV/PDF/Excel', expected: 'File selector visible' },
    { id: 'fu_3', test: 'Step 2: Blocks next if no file uploaded', expected: 'Validation error shown' },
    { id: 'fu_4', test: 'Step 2: File upload computes SHA-256 server-side', expected: 'Hash returned in response' },
    { id: 'fu_5', test: 'Step 3: Review shows file metadata and hash', expected: 'Filename, size, SHA-256 visible' },
    { id: 'fu_6', test: 'Step 3: Seal creates evidence with payload_type=BYTES', expected: 'Receipt confirms BYTES' },
    { id: 'fu_7', test: 'Timeout handling: 15s timeout shows retry option', expected: 'Timeout banner + retry button' },
    { id: 'fu_8', test: 'Double-submit prevention: clicking Seal twice ignored', expected: 'Second click no-op' }
  ],
  API_PUSH: [
    { id: 'ap_1', test: 'Step 1: Create draft with API_PUSH method', expected: 'Draft ID returned' },
    { id: 'ap_2', test: 'Step 1: external_reference_id validation required', expected: 'Blocks if empty' },
    { id: 'ap_3', test: 'Step 2: Digest form rendered (no file uploader)', expected: 'Digest input visible' },
    { id: 'ap_4', test: 'Step 2: Validates SHA-256 format (64 hex chars)', expected: 'Invalid digest rejected' },
    { id: 'ap_5', test: 'Step 3: Review shows payload_digest_sha256 only (no bytes stored)', expected: 'Digest displayed' },
    { id: 'ap_6', test: 'Step 3: Review shows NOT_REVIEWED warning', expected: 'Blue warning banner visible' },
    { id: 'ap_7', test: 'Step 3: Seal creates evidence with payload_type=DIGEST_ONLY', expected: 'Receipt confirms DIGEST_ONLY' },
    { id: 'ap_8', test: 'Idempotency: same external_reference_id + digest = duplicate detection', expected: 'Duplicate error or success' }
  ],
  ERP_EXPORT: [
    { id: 'ee_1', test: 'Step 1: Create draft with ERP_EXPORT method', expected: 'Draft ID returned' },
    { id: 'ee_2', test: 'Step 1: source_system forced to ERP vendor (SAP/Oracle/etc)', expected: 'ERP dropdown shown' },
    { id: 'ee_3', test: 'Step 1: snapshot_at_utc and export_job_id required', expected: 'Validation blocks if missing' },
    { id: 'ee_4', test: 'Step 2: File uploader rendered (export file)', expected: 'Upload labeled "Export File"' },
    { id: 'ee_5', test: 'Step 2: File upload required, validates presence', expected: 'Error if no file' },
    { id: 'ee_6', test: 'Step 3: Review shows export_job_id and snapshot timestamp', expected: 'Metadata visible' },
    { id: 'ee_7', test: 'Step 3: Seal creates evidence with server-side hash', expected: 'Hash in receipt' }
  ],
  ERP_API: [
    { id: 'ea_1', test: 'Step 1: Create draft with ERP_API method', expected: 'Draft ID returned' },
    { id: 'ea_2', test: 'Step 1: connector_reference and snapshot_at_utc required', expected: 'Validation enforced' },
    { id: 'ea_3', test: 'Step 2: API reference form rendered', expected: 'Connector input visible' },
    { id: 'ea_4', test: 'Step 2: Payload can be JSON or file stream', expected: 'Both options supported' },
    { id: 'ea_5', test: 'Step 3: Review shows api_event_reference', expected: 'Event ref displayed' },
    { id: 'ea_6', test: 'Step 3: Seal creates evidence with connector provenance', expected: 'Connector in metadata' }
  ],
  SIMULATION_MODE: [
    { id: 'sim_1', test: 'Simulation banner shown when simulationMode=true', expected: 'Yellow watermark visible' },
    { id: 'sim_2', test: 'Correlation IDs prefixed with SIM- in simulation', expected: 'SIM-* format' },
    { id: 'sim_3', test: 'Simulation does NOT call production seal endpoint', expected: 'Mock endpoint used' },
    { id: 'sim_4', test: 'Simulation evidence NOT stored in production ledger', expected: 'No DB write' },
    { id: 'sim_5', test: 'Simulation mode toast shows "UI Validation Mode"', expected: 'Toast clarifies mode' }
  ],
  ERROR_HANDLING: [
    { id: 'err_1', test: '422 Validation errors show field-level messages', expected: 'List of field errors' },
    { id: 'err_2', test: 'DRAFT_NOT_FOUND shows "create new draft" action', expected: 'Button to restart' },
    { id: 'err_3', test: 'System errors show correlation ID labeled "Reference ID"', expected: 'No "Kernel" text' },
    { id: 'err_4', test: 'Timeout errors show retry option after 15s', expected: 'Retry button visible' },
    { id: 'err_5', test: 'Network errors show user-friendly message', expected: 'No backend jargon' }
  ],
  STATE_MANAGEMENT: [
    { id: 'state_1', test: 'draft_id persisted in sessionStorage on creation', expected: 'Storage key set' },
    { id: 'state_2', test: 'draft_id restored on page refresh/re-render', expected: 'Wizard resumes' },
    { id: 'state_3', test: 'Step number persisted and restored', expected: 'Current step maintained' },
    { id: 'state_4', test: 'Session storage cleared after successful seal', expected: 'Keys removed' },
    { id: 'state_5', test: 'Step 2/3 blocked if draft_id undefined', expected: 'Error banner shown' }
  ]
};

export default function Contract1TestChecklist({ onClose }) {
  const [results, setResults] = useState({});

  const toggleResult = (testId, status) => {
    setResults(prev => ({
      ...prev,
      [testId]: prev[testId] === status ? null : status
    }));
  };

  const getCategorySummary = (category) => {
    const tests = TEST_MATRIX[category];
    const passed = tests.filter(t => results[t.id] === 'pass').length;
    const failed = tests.filter(t => results[t.id] === 'fail').length;
    const pending = tests.length - passed - failed;
    return { passed, failed, pending, total: tests.length };
  };

  const getOverallSummary = () => {
    let passed = 0, failed = 0, total = 0;
    Object.values(TEST_MATRIX).forEach(tests => {
      total += tests.length;
      tests.forEach(t => {
        if (results[t.id] === 'pass') passed++;
        if (results[t.id] === 'fail') failed++;
      });
    });
    return { passed, failed, pending: total - passed - failed, total };
  };

  const overall = getOverallSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contract-1 Test Checklist</h2>
          <p className="text-sm text-slate-600 mt-1">Comprehensive validation for all ingestion methods</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )}
      </div>

      {/* Overall Summary */}
      <Card className="bg-gradient-to-r from-slate-50 to-white border-slate-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Overall Progress</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {overall.passed} / {overall.total}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  {overall.passed} Passed
                </Badge>
              </div>
              <div className="text-center">
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  {overall.failed} Failed
                </Badge>
              </div>
              <div className="text-center">
                <Badge className="bg-slate-100 text-slate-800 border-slate-300">
                  {overall.pending} Pending
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Categories */}
      {Object.entries(TEST_MATRIX).map(([category, tests]) => {
        const summary = getCategorySummary(category);
        return (
          <Card key={category} className="border-slate-200">
            <CardHeader className="bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.replace(/_/g, ' ')}</CardTitle>
                <div className="flex gap-2">
                  <Badge className="bg-green-100 text-green-800 text-xs">{summary.passed}✓</Badge>
                  <Badge className="bg-red-100 text-red-800 text-xs">{summary.failed}✗</Badge>
                  <Badge className="bg-slate-100 text-slate-800 text-xs">{summary.pending}○</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    results[test.id] === 'pass'
                      ? 'bg-green-50/50 border-green-500'
                      : results[test.id] === 'fail'
                      ? 'bg-red-50/50 border-red-500'
                      : 'bg-slate-50/50 border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{test.test}</p>
                      <p className="text-xs text-slate-600 mt-1">Expected: {test.expected}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={results[test.id] === 'pass' ? 'default' : 'outline'}
                        onClick={() => toggleResult(test.id, 'pass')}
                        className={results[test.id] === 'pass' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={results[test.id] === 'fail' ? 'default' : 'outline'}
                        onClick={() => toggleResult(test.id, 'fail')}
                        className={results[test.id] === 'fail' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Export Results */}
      <Card className="bg-blue-50/30 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Export Test Results</p>
              <p className="text-xs text-blue-700 mt-1">Copy results to clipboard for audit reporting</p>
            </div>
            <Button
              onClick={() => {
                const report = Object.entries(results)
                  .map(([id, status]) => `${id}: ${status || 'pending'}`)
                  .join('\n');
                navigator.clipboard.writeText(report);
                alert('Test results copied to clipboard');
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Copy Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}