/**
 * CBAM Validation Panel - UI Component ONLY
 * Domain: Display validation results
 * Responsibilities: Render errors/warnings, trigger validation
 * Boundaries: NO validation logic
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, AlertTriangle, Shield } from "lucide-react";
import CBAMValidationService from '../services/lifecycle/CBAMValidationService';
import { toast } from 'sonner';

export default function CBAMValidationPanel({ entry, onValidationComplete }) {
  const [isValidating, setIsValidating] = React.useState(false);
  const [validation, setValidation] = React.useState(null);
  
  React.useEffect(() => {
    // Display existing validation if available
    if (entry.validation_errors || entry.validation_warnings) {
      setValidation({
        valid: entry.validation_status === 'validated',
        errors: entry.validation_errors || [],
        warnings: entry.validation_warnings || []
      });
    }
  }, [entry]);
  
  const handleValidate = async () => {
    setIsValidating(true);
    
    try {
      // Trigger validation service
      const result = await CBAMValidationService.validateAndUpdate(entry.id);
      
      if (result.success) {
        setValidation(result.validation);
        toast.success(result.validation.valid ? 'Validation passed' : 'Validation failed');
        onValidationComplete?.(result.entry);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <Card className="bg-white/60 backdrop-blur-xl border-white/80">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Regulatory Validation</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={handleValidate}
          disabled={isValidating}
          className="h-8 text-xs"
        >
          {isValidating ? (
            <><Shield className="w-3 h-3 mr-1 animate-pulse" /> Validating</>
          ) : (
            <><Shield className="w-3 h-3 mr-1" /> Validate</>
          )}
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {!validation ? (
          <Alert className="bg-slate-50/50 border-slate-200/50">
            <AlertCircle className="h-4 w-4 text-slate-400" />
            <AlertDescription className="text-xs text-slate-600">
              Click Validate to check compliance with C(2025) 8151
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Pure rendering - no validation logic */}
            {validation.valid ? (
              <Alert className="bg-emerald-50/50 border-emerald-200/50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-xs text-emerald-700">
                  All regulatory requirements met
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50/50 border-red-200/50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-xs text-red-700">
                  {validation.errors.length} compliance error(s) found
                </AlertDescription>
              </Alert>
            )}
            
            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-700">Errors</div>
                {validation.errors.map((error, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-red-700">{error.message}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{error.regulation}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-700">Warnings</div>
                {validation.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-amber-700">{warning.message}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{warning.regulation}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Compliance Score */}
            {validation.compliance_score !== undefined && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-600">Compliance Score</span>
                <span className={`text-sm font-semibold ${
                  validation.compliance_score >= 90 ? 'text-emerald-600' :
                  validation.compliance_score >= 70 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {validation.compliance_score}/100
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}