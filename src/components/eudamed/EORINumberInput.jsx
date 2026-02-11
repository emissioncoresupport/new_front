import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EORINumberInput({ value, onChange, country, label = "EORI Number" }) {
  const [validationStatus, setValidationStatus] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateEORI = async () => {
    if (!value || !country) {
      toast.error('Enter EORI number and country first');
      return;
    }

    setIsValidating(true);
    setValidationStatus(null);

    try {
      // Validate EORI format and check via EU EORI validation
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate this EORI number: ${value} for country ${country}.
        
EORI (Economic Operators Registration and Identification) format rules:
- Starts with 2-letter country code
- Followed by unique identifier (varies by country, typically 12-15 characters total)
- Example formats: DE123456789012, NL123456789, GB123456789000

Check if the format is valid and use the EU EORI validation system if possible.

Return validation result as JSON:
- valid: boolean
- formatted_eori: string (properly formatted)
- operator_name: string (if found)
- error_message: string (if invalid)`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            formatted_eori: { type: "string" },
            operator_name: { type: "string" },
            error_message: { type: "string" }
          }
        }
      });

      setValidationStatus(result);
      
      if (result.valid) {
        toast.success('EORI number validated');
        if (result.formatted_eori) {
          onChange(result.formatted_eori);
        }
      } else {
        toast.error(result.error_message || 'EORI number is invalid');
      }
    } catch (error) {
      toast.error('Validation service unavailable');
      setValidationStatus({ valid: false, error_message: 'Service unavailable' });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder={country ? `${country}123456789012` : 'e.g., DE123456789012'}
            className={
              validationStatus?.valid ? 'border-emerald-500 bg-emerald-50' :
              validationStatus?.valid === false ? 'border-rose-500 bg-rose-50' : ''
            }
          />
          {validationStatus !== null && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validationStatus.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600" />
              )}
            </div>
          )}
        </div>
        <Button 
          type="button"
          variant="outline" 
          onClick={validateEORI}
          disabled={isValidating || !value || !country}
          size="sm"
        >
          {isValidating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Validate'
          )}
        </Button>
      </div>
      
      {validationStatus && (
        <div className={`text-xs p-2 rounded ${validationStatus.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {validationStatus.valid ? (
            <>
              <p className="font-semibold">✓ Valid EORI Number</p>
              {validationStatus.operator_name && <p className="mt-1">Operator: {validationStatus.operator_name}</p>}
            </>
          ) : (
            <p>✗ {validationStatus.error_message || 'Invalid EORI number'}</p>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <ExternalLink className="w-3 h-3" />
        <a 
          href="https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-[#02a1e8] underline"
        >
          Verify on EU EORI System
        </a>
      </div>
    </div>
  );
}