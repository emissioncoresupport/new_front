import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import Contract1DeclarationStep from './steps/Contract1DeclarationStep';
import Contract1RetentionStep from './steps/Contract1RetentionStep';
import Contract1SealReceiptStep from './steps/Contract1SealReceiptStep';

export default function Contract1SealingWizard({ onClose }) {
  const [step, setStep] = useState(1);
  const [declaration, setDeclaration] = useState({
    ingestion_method: '',
    dataset_type: '',
    source_system: '',
    source_system_detail: '',
    snapshot_date_utc: '',
    declared_scope: '',
    scope_target_id: '',
    declared_intent: '',
    intent_details: '',
    intended_consumers: [],
    personal_data_present: undefined,
    gdpr_legal_basis: '',
    retention_policy: '',
    retention_custom_days: null,
    data_minimization_confirmed: false,
    export_restrictions: 'NONE'
  });
  const [payload, setPayload] = useState(null);
  const [sealReceipt, setSealReceipt] = useState(null);
  const [isSealing, setIsSealing] = useState(false);

  const missingRequired = () => {
    const missing = [];

    // Step 1: Declaration
    if (!declaration.ingestion_method) missing.push('Ingestion Method');
    if (!declaration.dataset_type) missing.push('Dataset Type');
    if (!declaration.source_system) missing.push('Source System');
    if (declaration.source_system === 'OTHER' && !declaration.source_system_detail) missing.push('Source System Detail');
    if (!declaration.declared_scope) missing.push('Declared Scope');
    if (!declaration.declared_intent) missing.push('Declared Intent');
    if (declaration.intended_consumers.length === 0) missing.push('Purpose Tags (at least 1)');
    if (['LEGAL_ENTITY', 'SITE', 'PRODUCT_FAMILY'].includes(declaration.declared_scope) && !declaration.scope_target_id) {
      missing.push('Scope Target ID');
    }
    if (['ERP_EXPORT', 'ERP_API'].includes(declaration.ingestion_method) && !declaration.snapshot_date_utc) {
      missing.push('Snapshot Date');
    }

    // Step 4: GDPR & Retention
    if (declaration.personal_data_present === undefined || declaration.personal_data_present === null) {
      missing.push('Personal Data Declaration');
    }
    if (declaration.personal_data_present && !declaration.gdpr_legal_basis) {
      missing.push('GDPR Legal Basis');
    }
    if (!declaration.retention_policy) {
      missing.push('Retention Policy');
    }
    if (declaration.retention_policy === 'CUSTOM' && (!declaration.retention_custom_days || declaration.retention_custom_days < 1 || declaration.retention_custom_days > 3650)) {
      missing.push('Custom Retention Days (1-3650)');
    }
    if (!declaration.data_minimization_confirmed) {
      missing.push('Data Minimization Confirmation');
    }

    return missing;
  };

  const canProceedToPayload = missingRequired().length === 0;
  const canSeal = payload && missingRequired().length === 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-white/50 shadow-2xl">
        <CardHeader className="sticky top-0 bg-gradient-to-r from-slate-50 to-white border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 font-light flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#86b027]" />
              Contract 1 Evidence Sealing
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={step >= 1 ? "default" : "outline"}>A</Badge>
              <div className="w-8 h-0.5 bg-slate-300" />
              <Badge variant={step >= 2 ? "default" : "outline"}>D</Badge>
              <div className="w-8 h-0.5 bg-slate-300" />
              <Badge variant={step >= 3 ? "default" : "outline"}>✓</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Step 1: Declaration (A-C) */}
          {step === 1 && (
            <Contract1DeclarationStep
              declaration={declaration}
              setDeclaration={setDeclaration}
            />
          )}

          {/* Step 2: Retention & GDPR (D) */}
          {step === 2 && (
            <Contract1RetentionStep
              declaration={declaration}
              setDeclaration={setDeclaration}
            />
          )}

          {/* Step 3: Seal Receipt */}
          {step === 3 && (
            <Contract1SealReceiptStep
              declaration={declaration}
              payload={payload}
              isSealing={isSealing}
              setIsSealing={setIsSealing}
              onClose={onClose}
            />
          )}

          {/* Why is this blocked? */}
          {missingRequired().length > 0 && step < 3 && (
            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-2">Missing Declaration Items:</p>
                    <ul className="space-y-1">
                      {missingRequired().map((item, idx) => (
                        <li key={idx} className="text-xs text-amber-800">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button
                  onClick={() => setStep(step - 1)}
                  variant="outline"
                  size="sm"
                >
                  Back
                </Button>
              )}

              {step < 2 && (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToPayload}
                  size="sm"
                >
                  Continue to GDPR & Retention
                </Button>
              )}

              {step === 2 && (
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canSeal}
                  size="sm"
                >
                  Review & Seal
                </Button>
              )}

              {step === 3 && (
                <Button
                  onClick={() => setIsSealing(true)}
                  disabled={isSealing}
                  size="sm"
                  className="bg-[#86b027] hover:bg-[#7aa522]"
                >
                  {isSealing ? '⟳ Sealing...' : '🔒 Seal Evidence'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}