import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Send, AlertCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  submitClassificationCommand,
  submitStructuringCommand,
  submitRejectionCommand,
  generateCommandId,
  logCommandFailure
} from './services/BackendCommandService';
import BackendResponseDisplay from './BackendResponseDisplay';

/**
 * INTENT-ONLY EVIDENCE ACTION PANEL
 * 
 * Base44 submits INTENT REQUESTS only.
 * Backend is sole authority for state mutations.
 * UI renders backend response (ACCEPTED/REJECTED).
 * 
 * NO optimistic updates.
 * NO state assumptions.
 * NO enforcement in Base44.
 */

export default function EvidenceIntentPanel({ evidence, onIntentSubmitted }) {
  const [intentType, setIntentType] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState(null);

  // Classification intent form
  const [classificationIntent, setClassificationIntent] = useState({
    evidence_type: '',
    claimed_scope: '',
    claimed_frameworks: [],
    confidence: 'medium',
    notes: ''
  });

  // Structuring intent form
  const [structuringIntent, setStructuringIntent] = useState({
    schema_type: '',
    schema_version: '1.0',
    extracted_fields: {},
    extraction_source: 'human',
    notes: ''
  });

  // Rejection intent form
  const [rejectionIntent, setRejectionIntent] = useState({
    rejection_reason: '',
    rejection_category: 'other'
  });

  const resetForms = () => {
    setIntentType(null);
    setResponse(null);
    setClassificationIntent({
      evidence_type: '',
      claimed_scope: '',
      claimed_frameworks: [],
      confidence: 'medium',
      notes: ''
    });
    setStructuringIntent({
      schema_type: '',
      schema_version: '1.0',
      extracted_fields: {},
      extraction_source: 'human',
      notes: ''
    });
    setRejectionIntent({
      rejection_reason: '',
      rejection_category: 'other'
    });
  };

  const handleSubmitIntent = async () => {
    setSubmitting(true);
    setResponse(null);

    try {
      const user = await base44.auth.me();
      const command_id = generateCommandId();

      let result = null;

      if (intentType === 'classify') {
        const commandPayload = {
          command_id,
          tenant_id: evidence.tenant_id,
          evidence_id: evidence.id,
          actor_id: user.email,
          actor_role: user.role,
          declared_intent: 'User requests classification of evidence',
          issued_at: new Date().toISOString(),
          payload: {
            evidence_type: classificationIntent.evidence_type,
            claimed_scope: classificationIntent.claimed_scope,
            claimed_frameworks: classificationIntent.claimed_frameworks,
            classifier_role: user.role,
            confidence: classificationIntent.confidence,
            notes: classificationIntent.notes
          }
        };

        result = await submitClassificationCommand(commandPayload);
      } else if (intentType === 'structure') {
        const commandPayload = {
          command_id,
          tenant_id: evidence.tenant_id,
          evidence_id: evidence.id,
          actor_id: user.email,
          actor_role: user.role,
          declared_intent: 'User requests structuring approval',
          issued_at: new Date().toISOString(),
          payload: {
            schema_type: structuringIntent.schema_type,
            schema_version: structuringIntent.schema_version,
            extracted_fields: structuringIntent.extracted_fields,
            extraction_source: structuringIntent.extraction_source,
            approver_role: user.role
          }
        };

        result = await submitStructuringCommand(commandPayload);
      } else if (intentType === 'reject') {
        const commandPayload = {
          command_id,
          tenant_id: evidence.tenant_id,
          evidence_id: evidence.id,
          actor_id: user.email,
          actor_role: user.role,
          declared_intent: 'User requests evidence rejection',
          issued_at: new Date().toISOString(),
          payload: {
            rejection_reason: rejectionIntent.rejection_reason,
            rejection_category: rejectionIntent.rejection_category,
            rejected_by_role: user.role
          }
        };

        result = await submitRejectionCommand(commandPayload);
      }

      setResponse(result);

      // Log failures for audit
      if (result.status === 'REJECTED' || result.status === 'ERROR') {
        await logCommandFailure(intentType, result.error_code, result.error_message);
      }

      // Notify parent on success only
      if (result.status === 'ACCEPTED' && onIntentSubmitted) {
        onIntentSubmitted();
      }

    } catch (error) {
      const errorResponse = {
        status: 'ERROR',
        error_code: 'UNEXPECTED_ERROR',
        error_message: error.message
      };
      setResponse(errorResponse);
      await logCommandFailure(intentType, 'UNEXPECTED_ERROR', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderIntentButtons = () => {
    if (intentType) return null;

    return (
      <div className="space-y-3">
        <Button
          onClick={() => setIntentType('classify')}
          disabled={evidence.state !== 'RAW'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Request Classification
        </Button>
        {evidence.state !== 'RAW' && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-900 font-medium">Backend Enforcement Required</p>
              <p className="text-yellow-800">Classification only allowed for RAW evidence. Current state: {evidence.state}</p>
              <a href="/developer-console" className="text-yellow-700 underline flex items-center gap-1 mt-1">
                See DCE-2026-V2-002 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <Button
          onClick={() => setIntentType('structure')}
          disabled={evidence.state !== 'CLASSIFIED'}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Request Structuring
        </Button>
        {evidence.state !== 'CLASSIFIED' && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-900 font-medium">Backend Enforcement Required</p>
              <p className="text-yellow-800">Structuring only allowed for CLASSIFIED evidence. Current state: {evidence.state}</p>
              <a href="/developer-console" className="text-yellow-700 underline flex items-center gap-1 mt-1">
                See DCE-2026-V2-002 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        <Button
          onClick={() => setIntentType('reject')}
          disabled={evidence.state === 'REJECTED'}
          variant="destructive"
          className="w-full"
        >
          Request Rejection
        </Button>
        {evidence.state === 'REJECTED' && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-900 font-medium">Already Rejected</p>
              <p className="text-yellow-800">Evidence is in final REJECTED state. No further transitions allowed.</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClassificationForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Evidence Type *</Label>
        <Select value={classificationIntent.evidence_type} onValueChange={(val) => setClassificationIntent({...classificationIntent, evidence_type: val})}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="certificate">Certificate</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="declaration">Declaration</SelectItem>
            <SelectItem value="test_report">Test Report</SelectItem>
            <SelectItem value="audit_report">Audit Report</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Claimed Scope *</Label>
        <Select value={classificationIntent.claimed_scope} onValueChange={(val) => setClassificationIntent({...classificationIntent, claimed_scope: val})}>
          <SelectTrigger>
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="supplier_identity">Supplier Identity</SelectItem>
            <SelectItem value="facility">Facility</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="shipment">Shipment</SelectItem>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="batch">Batch</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Frameworks</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {['CBAM', 'CSRD', 'EUDR', 'PFAS', 'PPWR', 'EUDAMED'].map(fw => (
            <Badge
              key={fw}
              className={`cursor-pointer ${classificationIntent.claimed_frameworks.includes(fw) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
              onClick={() => {
                const frameworks = classificationIntent.claimed_frameworks.includes(fw)
                  ? classificationIntent.claimed_frameworks.filter(f => f !== fw)
                  : [...classificationIntent.claimed_frameworks, fw];
                setClassificationIntent({...classificationIntent, claimed_frameworks: frameworks});
              }}
            >
              {fw}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Confidence</Label>
        <Select value={classificationIntent.confidence} onValueChange={(val) => setClassificationIntent({...classificationIntent, confidence: val})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes (Optional)</Label>
        <Textarea
          value={classificationIntent.notes}
          onChange={(e) => setClassificationIntent({...classificationIntent, notes: e.target.value})}
          placeholder="Additional classification notes"
        />
      </div>
    </div>
  );

  const renderStructuringForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Schema Type *</Label>
        <Select value={structuringIntent.schema_type} onValueChange={(val) => setStructuringIntent({...structuringIntent, schema_type: val})}>
          <SelectTrigger>
            <SelectValue placeholder="Select schema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="supplier_identity">Supplier Identity</SelectItem>
            <SelectItem value="facility">Facility</SelectItem>
            <SelectItem value="product">Product</SelectItem>
            <SelectItem value="shipment">Shipment</SelectItem>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="batch">Batch</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Extraction Source</Label>
        <Select value={structuringIntent.extraction_source} onValueChange={(val) => setStructuringIntent({...structuringIntent, extraction_source: val})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="human">Human</SelectItem>
            <SelectItem value="ai_suggestion">AI Suggestion (Requires Approval)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Extracted Fields (JSON)</Label>
        <Textarea
          value={JSON.stringify(structuringIntent.extracted_fields, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setStructuringIntent({...structuringIntent, extracted_fields: parsed});
            } catch {}
          }}
          placeholder='{"field_name": "value"}'
          className="font-mono text-xs"
          rows={6}
        />
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="text-blue-900 font-medium">Backend Approval Required</p>
        <p className="text-blue-800 mt-1">If extraction_source is AI, backend requires human approver_id. See DCE-2026-V2-004.</p>
      </div>
    </div>
  );

  const renderRejectionForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Rejection Category *</Label>
        <Select value={rejectionIntent.rejection_category} onValueChange={(val) => setRejectionIntent({...rejectionIntent, rejection_category: val})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="invalid_file">Invalid File</SelectItem>
            <SelectItem value="fraudulent">Fraudulent</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
            <SelectItem value="out_of_scope">Out of Scope</SelectItem>
            <SelectItem value="data_quality">Data Quality</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Rejection Reason *</Label>
        <Textarea
          value={rejectionIntent.rejection_reason}
          onChange={(e) => setRejectionIntent({...rejectionIntent, rejection_reason: e.target.value})}
          placeholder="Provide detailed reason for rejection"
          rows={4}
        />
      </div>

      <div className="p-3 bg-red-50 border border-red-200 rounded text-xs">
        <p className="text-red-900 font-medium">Rejection is Final</p>
        <p className="text-red-800 mt-1">Once rejected, Evidence cannot transition to any other state.</p>
      </div>
    </div>
  );

  return (
    <Card className="p-6 bg-white border border-slate-200">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Evidence Intent Actions</h3>
        <p className="text-xs text-slate-600 mt-1">Submit intent requests to backend. Backend enforces all state transitions.</p>
      </div>

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="text-xs">
            <p className="text-amber-900 font-medium">Intent-Only Mode</p>
            <p className="text-amber-800">Base44 submits requests. Backend decides outcomes. No optimistic updates.</p>
          </div>
        </div>
      </div>

      {!intentType && renderIntentButtons()}

      {intentType === 'classify' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-900">Classification Intent Request</h4>
            <Button variant="ghost" size="sm" onClick={resetForms}>Cancel</Button>
          </div>
          {renderClassificationForm()}
          <Button
            onClick={handleSubmitIntent}
            disabled={submitting || !classificationIntent.evidence_type || !classificationIntent.claimed_scope}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" /> Submit Classification Request</>}
          </Button>
        </div>
      )}

      {intentType === 'structure' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-900">Structuring Intent Request</h4>
            <Button variant="ghost" size="sm" onClick={resetForms}>Cancel</Button>
          </div>
          {renderStructuringForm()}
          <Button
            onClick={handleSubmitIntent}
            disabled={submitting || !structuringIntent.schema_type}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" /> Submit Structuring Request</>}
          </Button>
        </div>
      )}

      {intentType === 'reject' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-900">Rejection Intent Request</h4>
            <Button variant="ghost" size="sm" onClick={resetForms}>Cancel</Button>
          </div>
          {renderRejectionForm()}
          <Button
            onClick={handleSubmitIntent}
            disabled={submitting || !rejectionIntent.rejection_reason}
            variant="destructive"
            className="w-full"
          >
            {submitting ? 'Submitting...' : <><Send className="w-4 h-4 mr-2" /> Submit Rejection Request</>}
          </Button>
        </div>
      )}

      {response && (
        <div className="mt-4">
          <BackendResponseDisplay response={response} onDismiss={() => setResponse(null)} />
        </div>
      )}
    </Card>
  );
}