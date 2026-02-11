import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProofFirstExtractFlow({ evidence, onComplete, onCancel }) {
  const [stage, setStage] = useState('extracting'); // extracting → review → risk_check → confirmation
  const [extraction, setExtraction] = useState(null);
  const [frameworks, setFrameworks] = useState(null);
  const [risks, setRisks] = useState(null);
  const [approvedFields, setApprovedFields] = useState({});
  const [manualOverrides, setManualOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Step 1: AI Extraction
  useEffect(() => {
    if (stage !== 'extracting' || extraction) return;
    const extract = async () => {
      try {
        const res = await base44.functions.invoke('extractEvidenceWithAI', {
          file_url: evidence.file_url,
          entity_type: evidence.target_entity_type,
          reason_for_upload: evidence.reason_for_upload
        });
        if (!res.data.success) throw new Error(res.data.error);
        setExtraction(res.data);
        setApprovedFields(res.data.structured_payload);
        setStage('review');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    extract();
  }, [stage, extraction, evidence]);

  // Step 2: Detect frameworks after user approves fields
  const handleFieldApprove = async () => {
    setStage('framework_detect');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('detectFrameworkRelevance', {
        country: approvedFields.country || manualOverrides.country,
        supplier_type: approvedFields.supplier_type || manualOverrides.supplier_type,
        manufacturing_countries: approvedFields.manufacturing_countries,
        entity_type: evidence.target_entity_type
      });
      setFrameworks(res.data);
      setStage('risk_screen');
    } catch (err) {
      setError(err.message);
      setStage('review');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Risk screening
  useEffect(() => {
    if (stage !== 'risk_screen' || risks) return;
    const screen = async () => {
      try {
        const res = await base44.functions.invoke('screenSupplierRisks', {
          supplier_name: approvedFields.legal_name || manualOverrides.legal_name,
          country: approvedFields.country || manualOverrides.country,
          manufacturing_countries: approvedFields.manufacturing_countries,
          supplier_type: approvedFields.supplier_type,
          vat_number: approvedFields.vat_number
        });
        setRisks(res.data);
        setStage('confirmation');
      } catch (err) {
        setError(err.message);
      }
    };
    screen();
  }, [stage, risks, approvedFields, manualOverrides, evidence]);

  // Field provenance visualization
  const renderFieldProvenance = (fieldName) => {
    const prov = extraction?.field_provenance?.[fieldName];
    if (!prov) return null;
    const conf = prov.confidence;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs space-y-1 mt-2 p-2 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded border border-slate-200/50">
        <div className="flex items-center gap-1">
          <div className="w-12 h-1 bg-gradient-to-r from-slate-300 to-slate-400 rounded-full" style={{width: `${conf}%`, maxWidth: '100px'}} />
          <span className="text-slate-600 font-medium">{conf}%</span>
        </div>
        <p className="text-slate-500 italic truncate">"{prov.source_text?.substring(0, 60)}..."</p>
      </motion.div>
    );
  };

  if (loading && stage === 'extracting') {
    return (
      <Card className="p-8 bg-gradient-to-br from-white/85 to-slate-50/85 border-slate-200/30">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <Loader2 className="w-8 h-8 text-[#86b027]" />
          </motion.div>
          <p className="text-sm text-slate-700">AI extracting evidence data...</p>
          <p className="text-xs text-slate-500">This usually takes 10-20 seconds</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* STEP 1: FIELD EXTRACTION & PROVENANCE */}
      {(stage === 'review' || stage === 'framework_detect' || stage === 'risk_screen' || stage === 'confirmation') && extraction && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest">Extracted Fields</h3>
              <p className="text-xs text-slate-500 mt-1">{extraction.high_confidence_fields.length} high-confidence fields ready</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              extraction.extraction_quality === 'high' ? 'bg-green-100 text-green-700' :
              extraction.extraction_quality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {extraction.extraction_quality} quality
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto pr-2">
            {Object.entries(extraction.structured_payload).map(([key, value]) => (
              <div key={key} className="p-3 border border-slate-200/40 rounded-lg bg-gradient-to-r from-slate-50/50 to-white/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-900 uppercase tracking-wider">{key}</label>
                    <p className="text-sm text-slate-700 font-mono mt-1">{value}</p>
                    {renderFieldProvenance(key)}
                  </div>
                  <button
                    onClick={() => setApprovedFields(prev => ({ ...prev, [key]: value }))}
                    className="ml-2 p-1.5 hover:bg-green-100 rounded transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {extraction.warnings?.length > 0 && (
            <Alert className="bg-yellow-50/50 border-yellow-200/50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-xs text-yellow-700">
                {extraction.warnings[0]}
              </AlertDescription>
            </Alert>
          )}

          {stage === 'review' && (
            <Button
              onClick={handleFieldApprove}
              disabled={Object.keys(approvedFields).length < 2}
              className="w-full bg-[#86b027] hover:bg-[#7aa522] text-white rounded-lg"
            >
              Continue with {Object.keys(approvedFields).length} Fields <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </motion.div>
      )}

      {/* STEP 2: FRAMEWORK DETECTION */}
      {(stage === 'framework_detect' || stage === 'risk_screen' || stage === 'confirmation') && frameworks && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest">Framework Detection</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {frameworks.frameworks.map(fw => (
              <div key={fw} className="p-3 bg-gradient-to-br from-blue-50/60 to-blue-100/40 border border-blue-200/30 rounded-lg">
                <p className="text-xs font-medium text-blue-900 uppercase">{fw}</p>
                <p className="text-xs text-blue-700 mt-1 leading-snug">{frameworks.framework_details[fw]}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* STEP 3: RISK SCREENING */}
      {(stage === 'risk_screen' || stage === 'confirmation') && risks && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-light text-slate-900 uppercase tracking-widest">Risk Assessment</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(risks.risk_checks).map(([check, result]) => (
              <div key={check} className={`p-3 rounded-lg border ${
                result.passed ? 'bg-green-50/60 border-green-200/30' : 'bg-red-50/60 border-red-200/30'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-900 uppercase">{check.replace(/_/g, ' ')}</p>
                    <p className={`text-xs mt-1 ${result.passed ? 'text-green-700' : 'text-red-700'}`}>{result.details}</p>
                  </div>
                  {result.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {risks.required_questionnaires?.length > 0 && (
            <Alert className="bg-blue-50/50 border-blue-200/50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                {risks.required_questionnaires.length} onboarding tasks will be created
              </AlertDescription>
            </Alert>
          )}
        </motion.div>
      )}

      {/* ERRORS */}
      {error && (
        <Alert className="bg-red-50/50 border-red-200/50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-xs text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* ACTIONS */}
      <div className="flex gap-2 pt-4 border-t border-slate-200/30">
        {stage === 'review' && (
          <Button onClick={onCancel} variant="outline" className="flex-1 rounded-lg">
            Cancel
          </Button>
        )}
        {stage === 'confirmation' && (
          <>
            <Button onClick={onCancel} variant="outline" className="flex-1 rounded-lg">
              Back
            </Button>
            <Button
              onClick={() => onComplete({ extraction, frameworks, risks, approvedFields })}
              className="flex-1 bg-[#86b027] hover:bg-[#7aa522] text-white rounded-lg"
            >
              Proceed to Gate
            </Button>
          </>
        )}
      </div>
    </div>
  );
}