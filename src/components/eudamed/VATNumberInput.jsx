import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function VATNumberInput({ value, onChange, country, label = "VAT Number" }) {
  const [validationStatus, setValidationStatus] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateVAT = async () => {
    if (!value || !country) {
      toast.error('Enter VAT number and country first');
      return;
    }

    setIsValidating(true);
    setValidationStatus(null);

    try {
      // Use VIES API via LLM with internet access
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate this EU VAT number: ${value} for country ${country}. 
        
Use the VIES (VAT Information Exchange System) validation service at https://ec.europa.eu/taxation_customs/vies/
        
Return validation result as JSON with:
- valid: boolean (true/false)
- company_name: string (if valid)
- company_address: string (if valid)
- error_message: string (if invalid)
- vat_number_formatted: string (properly formatted VAT number)`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            company_name: { type: "string" },
            company_address: { type: "string" },
            error_message: { type: "string" },
            vat_number_formatted: { type: "string" }
          }
        }
      });

      setValidationStatus(result);
      
      if (result.valid) {
        toast.success('VAT number validated successfully');
        // Auto-fill formatted VAT
        if (result.vat_number_formatted) {
          onChange(result.vat_number_formatted);
        }
      } else {
        toast.error(result.error_message || 'VAT number is invalid');
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
            placeholder={country ? `${country}123456789` : 'e.g., DE123456789'}
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
          onClick={validateVAT}
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
              <p className="font-semibold">✓ Valid VAT Number</p>
              {validationStatus.company_name && <p className="mt-1">Company: {validationStatus.company_name}</p>}
              {validationStatus.company_address && <p>Address: {validationStatus.company_address}</p>}
            </>
          ) : (
            <p>✗ {validationStatus.error_message || 'Invalid VAT number'}</p>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <ExternalLink className="w-3 h-3" />
        <a 
          href="https://ec.europa.eu/taxation_customs/vies/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-[#02a1e8] underline"
        >
          Verify on VIES
        </a>
      </div>
    </div>
  );
}