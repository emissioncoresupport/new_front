import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';

// Minimum required fields per entity type
const REQUIRED_FIELDS = {
  SUPPLIER: ['supplier_name', 'country'],
  SITE: ['site_name', 'country'],
  SKU: ['sku_code'],
  MATERIAL: ['material_name'],
  BOM: ['bom_code'],
  SHIPMENT: ['origin', 'destination'],
  OTHER: []
};

export default function SupplyLensStructuredEvidenceGate({ evidenceId, onGateComplete }) {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('declare'); // declare | gdpr | confirm
  const [scope, setScope] = useState('');
  const [fields, setFields] = useState({});
  const [hasPersonalData, setHasPersonalData] = useState(false);
  const [gdprBasis, setGdprBasis] = useState('');
  const [error, setError] = useState(null);
  const [blockingReasons, setBlockingReasons] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch evidence
  const { data: evidence, isLoading: isEvidenceLoading } = useQuery({
    queryKey: ['evidence', evidenceId],
    queryFn: () => base44.entities.Evidence.filter({ id: evidenceId }, '', 1)
      .then(results => results[0]),
    enabled: !!evidenceId
  });

  // Check if all required fields are filled
  const getRequiredFields = () => REQUIRED_FIELDS[scope] || [];

  const isScopeValid = () => scope && scope !== '';

  const areRequiredFieldsFilled = () => {
    const required = getRequiredFields();
    return required.length === 0 || required.every(f => fields[f]);
  };

  const isGdprSatisfied = () => {
    if (!hasPersonalData) return true;
    return !!gdprBasis;
  };

  const canTransition = () => {
    return isScopeValid() && areRequiredFieldsFilled() && isGdprSatisfied();
  };

  const getMissingItems = () => {
    const missing = [];

    if (!isScopeValid()) {
      missing.push('Entity scope must be declared');
    }

    const required = getRequiredFields();
    const unfilled = required.filter(f => !fields[f]);
    if (unfilled.length > 0) {
      missing.push(`Missing required fields: ${unfilled.join(', ')}`);
    }

    if (hasPersonalData && !isGdprSatisfied()) {
      missing.push('GDPR legal basis required (personal data detected)');
    }

    return missing;
  };

  // State transition mutation
  const transitionMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await base44.functions.invoke('transitionEvidenceToStructured', {
          evidence_id: evidenceId,
          declared_scope: scope,
          fields_declared: fields,
          gdpr_personal_data_detected: hasPersonalData,
          gdpr_legal_basis: hasPersonalData ? gdprBasis : null,
          tenant_id: user?.company_id || 'default'
        });

        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Transition failed');
        }

        return response.data;
      } catch (err) {
        throw new Error(err.message || 'Failed to transition evidence');
      }
    },
    onSuccess: (data) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      
      // Callback to parent
      if (onGateComplete) {
        onGateComplete(data);
      }
    },
    onError: (err) => {
      setError(err.message);
      setBlockingReasons([err.message]);
    }
  });

  if (!user || isEvidenceLoading) {
    return <div className="text-center py-8 text-slate-600">Loading...</div>;
  }

  if (!evidence) {
    return (
      <Card className="border border-red-300 bg-red-50 p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900">Evidence Not Found</p>
          <p className="text-xs text-red-700 mt-1">Cannot load evidence {evidenceId}</p>
        </div>
      </Card>
    );
  }

  // Render based on current state
  if (evidence.state !== 'RAW' && evidence.state !== 'CLASSIFIED') {
    return (
      <Card className="border border-green-300 bg-green-50 p-4 flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-900">Already Structured</p>
          <p className="text-xs text-green-700 mt-1">This evidence is in {evidence.state} state.</p>
        </div>
      </Card>
    );
  }

  const missing = getMissingItems();
  const isBlocked = missing.length > 0;

  return (
    <div className="space-y-6">
      {/* BANNER: "NOT STRUCTURED" */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border border-amber-300 bg-amber-50 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Evidence Not Yet Structured</p>
            <p className="text-xs text-amber-700 mt-1">
              Complete the requirements below to mark as structured.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* EVIDENCE SUMMARY */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase">Evidence Details</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">File</p>
              <p className="font-mono text-slate-900">{evidence.original_filename}</p>
            </div>
            <div>
              <p className="text-slate-600">Current State</p>
              <p className="font-mono text-[#86b027]">{evidence.state}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* DECLARATION FORM */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
        {/* STEP 1: Declare Scope */}
        <Card className="border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900">
            Step 1: Declare Entity Type *
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(REQUIRED_FIELDS).map(type => (
              <button
                key={type}
                onClick={() => {
                  setScope(type);
                  setFields({});
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  scope === type
                    ? 'border-[#86b027] bg-[#86b027]/10 text-[#86b027]'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-[#86b027]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </Card>

        {/* STEP 2: Fill Required Fields */}
        {scope && (
          <Card className="border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-slate-900">
              Step 2: Fill Required Fields *
            </p>
            <div className="space-y-2">
              {getRequiredFields().map(field => (
                <div key={field}>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">
                    {field} *
                  </label>
                  <input
                    type="text"
                    placeholder={field}
                    value={fields[field] || ''}
                    onChange={(e) => setFields({ ...fields, [field]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027] focus:border-transparent"
                  />
                  {!fields[field] && (
                    <p className="text-xs text-red-600 mt-1">Required</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* STEP 3: GDPR Gate */}
        {scope && (
          <Card className="border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-slate-900">
              Step 3: GDPR Declaration
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPersonalData}
                  onChange={(e) => {
                    setHasPersonalData(e.target.checked);
                    if (!e.target.checked) setGdprBasis('');
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-[#86b027]"
                />
                <span className="text-sm text-slate-700">
                  This evidence contains personal data
                </span>
              </label>

              {hasPersonalData && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1 font-medium">
                    Legal Basis *
                  </label>
                  <select
                    value={gdprBasis}
                    onChange={(e) => setGdprBasis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#86b027]"
                  >
                    <option value="">Select...</option>
                    <option value="CONSENT">Explicit Consent</option>
                    <option value="CONTRACT">Contract Performance</option>
                    <option value="LEGAL_OBLIGATION">Legal Obligation</option>
                    <option value="LEGITIMATE_INTERESTS">Legitimate Interests</option>
                  </select>
                  {!gdprBasis && (
                    <p className="text-xs text-red-600 mt-1">Required</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </motion.div>

      {/* BLOCKING CHECKLIST */}
      {isBlocked && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="border border-red-300 bg-red-50 p-4 space-y-3">
            <div className="flex gap-2 items-start">
              <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-900">Cannot Transition Yet</p>
                <ul className="mt-2 space-y-1">
                  {missing.map((reason, idx) => (
                    <li key={idx} className="text-xs text-red-700 flex gap-2">
                      <span className="text-red-600">✗</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="border border-red-300 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Transition Failed</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ACTION BUTTON */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Button
          onClick={() => transitionMutation.mutate()}
          disabled={isBlocked || transitionMutation.isPending}
          className={`w-full py-3 font-medium flex items-center justify-center gap-2 ${
            isBlocked || transitionMutation.isPending
              ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
              : 'bg-[#86b027] hover:bg-[#7aa522] text-white'
          }`}
        >
          {transitionMutation.isPending ? (
            <>
              <span className="animate-spin">⌛</span>
              Transitioning...
            </>
          ) : (
            <>
              Mark as Structured
              <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}