import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Target,
  Flag
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function IngestionPipeline({
  supplier_data,
  source_path,
  evidence_id,
  onComplete,
  onCancel
}) {
  const [stage, setStage] = useState('processing');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [userApproval, setUserApproval] = useState(null);

  // Run orchestration pipeline on mount
  React.useEffect(() => {
    const orchestrate = async () => {
      try {
        const res = await base44.functions.invoke('supplierIngestionOrchestrator', {
          supplier_data,
          source_path,
          evidence_id
        });
        
        if (!res.data.success) throw new Error(res.data.error);
        
        setResult(res.data);
        
        // Move to dedup or gate based on conflicts
        if (res.data.mapping_preview.conflicts.length > 0) {
          setStage('dedup_review');
        } else {
          setStage('gate_ready');
        }
      } catch (err) {
        setError(err.message);
      }
    };

    orchestrate();
  }, [supplier_data, source_path, evidence_id]);

  const handleUserApproval = async (action) => {
    setUserApproval(action);
    // Action: 'create_new' | 'merge_with_X' | 'cancel'
    if (action === 'create_new') {
      setStage('gate_ready');
    }
  };

  const handleGateSubmit = async () => {
    try {
      // Submit to mapping gate for final decision
      const gateRes = await base44.functions.invoke('mappingGateEnforcer', {
        evidence_id,
        supplier_data: result.supplier_data,
        declared_frameworks: result.frameworks,
        user_approval: userApproval
      });

      if (gateRes.data.status === 'APPROVED') {
        // Create onboarding task chain
        await base44.functions.invoke('createOnboardingTaskChain', {
          supplier_id: gateRes.data.supplier_id,
          frameworks: result.frameworks,
          risk_checks: result.risk_level,
          evidence_id
        });
      }

      onComplete?.(gateRes.data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <Card className="p-6 bg-red-50/50 border-red-200/50">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-900">Pipeline Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (stage === 'processing' || !result) {
    return (
      <Card className="p-8 bg-gradient-to-br from-white/85 to-slate-50/85 border-slate-200/30">
        <div className="flex flex-col items-center justify-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <Loader2 className="w-8 h-8 text-[#86b027]" />
          </motion.div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900">Running Compliance Pipeline</p>
            <p className="text-xs text-slate-500 mt-2">Schema → Dedup → Framework → Risk → Preview</p>
          </div>
        </div>
      </Card>
    );
  }

  // DEDUP REVIEW STAGE
  if (stage === 'dedup_review') {
    const conflict = result.mapping_preview.conflicts[0];
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="p-6 border-amber-200/50 bg-amber-50/50">
          <div className="flex gap-3 mb-4">
            <Flag className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Potential Duplicate Detected</h3>
              <p className="text-sm text-amber-700 mt-1">{conflict.message}</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {conflict.matches?.map((match, idx) => (
              <div key={idx} className="p-3 bg-white/60 rounded-lg border border-amber-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{match.legal_name}</p>
                    <p className="text-xs text-slate-600 mt-1">Match: {(match.match_score * 100).toFixed(0)}%</p>
                  </div>
                  <Button
                    onClick={() => handleUserApproval('merge_with_' + match.id)}
                    variant="outline"
                    className="text-xs"
                  >
                    Link
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => handleUserApproval('create_new')}
            className="w-full mt-4 bg-[#86b027] hover:bg-[#7aa522] text-white rounded-lg"
          >
            Create as New Supplier
          </Button>
        </Card>
      </motion.div>
    );
  }

  // GATE READY STAGE - Show pipeline summary
  if (stage === 'gate_ready') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* VALIDATION SCORE */}
        <Card className="p-4 bg-gradient-to-r from-blue-50/60 to-blue-100/40 border-blue-200/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900 uppercase">Data Completeness</span>
            </div>
            <span className="text-lg font-light text-blue-900">{result.validation.completeness_score}%</span>
          </div>
          <div className="w-full bg-blue-200/30 rounded-full h-1.5 mt-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full"
              style={{ width: `${result.validation.completeness_score}%` }}
            />
          </div>
        </Card>

        {/* FRAMEWORKS */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-900 uppercase">Detected Frameworks</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {result.frameworks.map(fw => (
              <div key={fw} className="p-2 bg-slate-100/50 rounded border border-slate-200/50 text-xs font-medium text-slate-700 uppercase text-center">
                {fw}
              </div>
            ))}
          </div>
        </div>

        {/* RISK LEVEL */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/30">
          <Shield className="w-4 h-4 text-slate-600" />
          <span className="text-xs text-slate-700 font-medium">Risk Level:</span>
          <span className={`text-xs font-medium uppercase ${
            result.risk_level === 'critical' ? 'text-red-700' :
            result.risk_level === 'high' ? 'text-orange-700' :
            'text-green-700'
          }`}>
            {result.risk_level}
          </span>
        </div>

        {/* READY FOR GATE */}
        <Alert className="bg-green-50/50 border-green-200/50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-xs text-green-700">
            Ready for mapping gate validation. All checks passed.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 pt-4 border-t border-slate-200/30">
          <Button onClick={onCancel} variant="outline" className="flex-1 rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleGateSubmit}
            className="flex-1 bg-[#86b027] hover:bg-[#7aa522] text-white rounded-lg"
          >
            Submit to Gate <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return null;
}