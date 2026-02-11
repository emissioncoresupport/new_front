import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, FileText, Tag, AlertTriangle, Shield } from 'lucide-react';

export default function EvidenceClassificationPanel({ evidence, onClassified, onCancel }) {
  const [evidenceType, setEvidenceType] = useState('');
  const [claimedScope, setClaimedScope] = useState('');
  const [frameworks, setFrameworks] = useState([]);
  const [confidence, setConfidence] = useState('medium');
  const [notes, setNotes] = useState('');
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      const user = await base44.auth.me();
      setUserRole(user?.role);
    };
    checkRole();
  }, []);

  const handleFrameworkToggle = (framework) => {
    setFrameworks(prev => 
      prev.includes(framework) 
        ? prev.filter(f => f !== framework)
        : [...prev, framework]
    );
  };

  const handleClassify = async () => {
    if (!evidenceType || !claimedScope || frameworks.length === 0) {
      setError('Evidence type, scope, and at least one framework are required');
      return;
    }

    setClassifying(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('classifyEvidence', {
        evidence_id: evidence.evidence_id,
        evidence_type: evidenceType,
        claimed_scope: claimedScope,
        claimed_frameworks: frameworks,
        confidence,
        notes
      });

      if (!res.data.success) {
        throw new Error(res.data.error);
      }

      onClassified?.(res.data);
    } catch (err) {
      setError(err.message || 'Classification failed');
      setClassifying(false);
    }
  };

  const allowed_roles = ['admin', 'legal', 'compliance', 'procurement', 'auditor'];
  const is_authorized = allowed_roles.includes(userRole);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Permission Check */}
      {!is_authorized && (
        <Card className="border border-red-200/50 bg-red-50/50 p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Permission Denied</p>
              <p className="text-xs text-red-700 mt-1">
                Your role ({userRole}) cannot classify Evidence. 
                Allowed roles: {allowed_roles.join(', ')}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Evidence State Check */}
      {evidence.state !== 'RAW' && (
        <Card className="border border-yellow-200/50 bg-yellow-50/50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Already Classified</p>
              <p className="text-xs text-yellow-700 mt-1">
                Evidence is in state '{evidence.state}'. Only RAW Evidence can be classified.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Classification Form - Only show if authorized and RAW */}
      {is_authorized && evidence.state === 'RAW' && (
        <>
          <Card className="border border-slate-200/40 bg-white/60 backdrop-blur-sm p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-200/40 pb-3">
              <Tag className="w-4 h-4 text-slate-600" />
              <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest">Classification Schema</h3>
            </div>

            {/* Evidence Type */}
            <div>
              <label className="text-sm font-medium text-slate-900">Evidence Type *</label>
              <Select value={evidenceType} onValueChange={setEvidenceType}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="declaration">Supplier Declaration</SelectItem>
                  <SelectItem value="erp_snapshot">ERP Snapshot</SelectItem>
                  <SelectItem value="test_report">Test Report</SelectItem>
                  <SelectItem value="audit_report">Audit Report</SelectItem>
                  <SelectItem value="email">Email Correspondence</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Claimed Scope */}
            <div>
              <label className="text-sm font-medium text-slate-900">Claimed Scope *</label>
              <Select value={claimedScope} onValueChange={setClaimedScope}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="What does this Evidence describe?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier_identity">Supplier Identity</SelectItem>
                  <SelectItem value="facility">Manufacturing Facility</SelectItem>
                  <SelectItem value="product">Product / SKU</SelectItem>
                  <SelectItem value="shipment">Shipment / Logistics</SelectItem>
                  <SelectItem value="material">Raw Material</SelectItem>
                  <SelectItem value="batch">Production Batch</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Claimed Frameworks */}
            <div>
              <label className="text-sm font-medium text-slate-900">Claimed Frameworks *</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['CBAM', 'CSRD', 'EUDR', 'PFAS', 'PPWR', 'EUDAMED'].map(fw => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => handleFrameworkToggle(fw)}
                    className={`p-2 rounded-lg border text-xs font-medium transition ${
                      frameworks.includes(fw)
                        ? 'border-[#86b027] bg-[#86b027]/10 text-[#86b027]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleFrameworkToggle('none')}
                  className={`p-2 rounded-lg border text-xs font-medium transition ${
                    frameworks.includes('none')
                      ? 'border-slate-400 bg-slate-100 text-slate-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  None
                </button>
              </div>
            </div>

            {/* Confidence */}
            <div>
              <label className="text-sm font-medium text-slate-900">Confidence Level</label>
              <Select value={confidence} onValueChange={setConfidence}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Confidence</SelectItem>
                  <SelectItem value="medium">Medium Confidence</SelectItem>
                  <SelectItem value="low">Low Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-900">Classification Notes (Optional)</label>
              <Textarea
                placeholder="Add context about this classification decision..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 h-20 text-sm"
              />
            </div>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border border-red-200/50 bg-red-50/50 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 rounded-lg"
              disabled={classifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClassify}
              disabled={classifying || !evidenceType || !claimedScope || frameworks.length === 0}
              className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] hover:from-[#7aa522] hover:to-[#6b9720] text-white rounded-lg disabled:opacity-50"
            >
              {classifying ? 'Classifying...' : 'Classify Evidence'}
            </Button>
          </div>
        </>
      )}

      {/* Evidence Context Display */}
      <Card className="border border-slate-200/40 bg-slate-50/40 backdrop-blur-sm p-4">
        <h4 className="text-xs font-medium text-slate-900 uppercase tracking-widest mb-3">Evidence Context</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Evidence ID</p>
            <p className="text-slate-900 font-mono mt-0.5">{evidence.evidence_id}</p>
          </div>
          <div>
            <p className="text-slate-500">Current State</p>
            <p className={`font-medium mt-0.5 ${
              evidence.state === 'RAW' ? 'text-blue-600' :
              evidence.state === 'CLASSIFIED' ? 'text-indigo-600' :
              evidence.state === 'STRUCTURED' ? 'text-emerald-600' :
              'text-red-600'
            }`}>{evidence.state}</p>
          </div>
          <div>
            <p className="text-slate-500">Declared Entity Type</p>
            <p className="text-slate-900 mt-0.5">{evidence.declared_context?.entity_type || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-slate-500">Intended Use</p>
            <p className="text-slate-900 mt-0.5">{evidence.declared_context?.intended_use || 'Unknown'}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}