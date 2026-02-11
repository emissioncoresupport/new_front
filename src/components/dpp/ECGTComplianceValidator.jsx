import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Shield, CheckCircle2, XCircle, AlertTriangle, FileCheck,
  Leaf, Award, Zap, Info
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

/**
 * ECGT (Empowering Consumers for the Green Transition) Compliance Validator
 * EU Directive 2024/825 - Green Claims Directive
 * 
 * Validates environmental claims for:
 * - DPP (Digital Product Passports)
 * - CSRD reporting
 * - Marketing materials
 * - Product labels
 * 
 * Key requirements per ECGT:
 * 1. Claims must be substantiated with scientific evidence
 * 2. Life cycle assessment basis required
 * 3. Third-party verification for specific claims
 * 4. Clear and accessible information
 * 5. No vague/generic claims (e.g., "eco-friendly" without proof)
 */

export default function ECGTComplianceValidator({ productId, claims = [], onValidationComplete }) {
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState([]);

  // ECGT-defined claim categories requiring substantiation
  const claimCategories = {
    carbon_neutral: {
      label: "Carbon Neutral / Net Zero",
      requirements: ["Full LCA", "Offset verification", "Scope 1-3 coverage"],
      evidence_required: ["LCA report", "Offset certificates", "Third-party verification"],
      risk_level: "high"
    },
    recycled_content: {
      label: "Recycled Content",
      requirements: ["Material composition analysis", "Supply chain traceability"],
      evidence_required: ["Material certificates", "Supplier declarations"],
      risk_level: "medium"
    },
    renewable_energy: {
      label: "Made with Renewable Energy",
      requirements: ["Energy source documentation", "RECs/GO certificates"],
      evidence_required: ["Energy audit", "Renewable energy certificates"],
      risk_level: "medium"
    },
    biodegradable: {
      label: "Biodegradable / Compostable",
      requirements: ["EN 13432 or ISO 14855 testing", "Time-bound degradation proof"],
      evidence_required: ["Lab test results", "Certification"],
      risk_level: "high"
    },
    sustainable_sourcing: {
      label: "Sustainably Sourced",
      requirements: ["Supply chain mapping", "Sustainability criteria"],
      evidence_required: ["Supplier audits", "Certification (FSC, MSC, etc.)"],
      risk_level: "medium"
    },
    water_savings: {
      label: "Water Saving",
      requirements: ["Comparative analysis vs baseline"],
      evidence_required: ["Water usage data", "Comparative study"],
      risk_level: "low"
    }
  };

  const validateClaim = async (claim) => {
    setIsValidating(true);

    try {
      // Get product data for context
      const products = await base44.entities.Product.filter({ id: productId });
      const product = products[0];

      // Get LCA data if available
      const lcaStudies = await base44.entities.LCAStudy.filter({ product_id: productId });

      // Get DPP records
      const dppRecords = await base44.entities.DPPRecord.filter({ product_id: productId });

      // Use AI to validate claim against evidence
      const validation = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an ECGT (Green Claims Directive EU 2024/825) compliance validator.

CLAIM TO VALIDATE: "${claim.claim_text}"
CLAIM CATEGORY: ${claim.category}

PRODUCT DATA:
- Name: ${product?.name}
- Category: ${product?.category}
- PCF: ${product?.total_co2e_kg} kg CO2e

AVAILABLE EVIDENCE:
- LCA Studies: ${lcaStudies.length} available
- DPP Records: ${dppRecords.length} available
- Supporting Documents: ${claim.evidence_urls?.length || 0} files

ECGT REQUIREMENTS FOR "${claimCategories[claim.category]?.label}":
${claimCategories[claim.category]?.requirements.map(r => `- ${r}`).join('\n')}

REQUIRED EVIDENCE:
${claimCategories[claim.category]?.evidence_required.map(e => `- ${e}`).join('\n')}

VALIDATION TASKS:
1. Is the claim specific and quantifiable? (not vague like "eco-friendly")
2. Is there scientific evidence/LCA basis?
3. Is third-party verification present (if required for high-risk claims)?
4. Are offsetting claims properly disclosed?
5. Is the claim clear and not misleading?
6. Are limitations/conditions disclosed?

Return detailed validation assessment with compliance score.`,
        response_json_schema: {
          type: "object",
          properties: {
            is_compliant: { type: "boolean" },
            compliance_score: { type: "number" },
            risk_assessment: { type: "string", enum: ["low", "medium", "high"] },
            validation_details: {
              type: "object",
              properties: {
                is_specific: { type: "boolean" },
                has_scientific_basis: { type: "boolean" },
                has_verification: { type: "boolean" },
                is_clear: { type: "boolean" },
                limitations_disclosed: { type: "boolean" }
              }
            },
            missing_evidence: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            greenwashing_risk: { type: "string", enum: ["low", "medium", "high"] },
            required_actions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      return {
        claim,
        ...validation
      };

    } catch (error) {
      console.error('ECGT validation error:', error);
      toast.error('Validation failed: ' + error.message);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidateAll = async () => {
    if (claims.length === 0) {
      toast.warning('No claims to validate');
      return;
    }

    setIsValidating(true);
    const results = [];

    for (const claim of claims) {
      const result = await validateClaim(claim);
      if (result) results.push(result);
    }

    setValidationResults(results);
    
    const compliantCount = results.filter(r => r.is_compliant).length;
    const avgScore = results.reduce((sum, r) => sum + r.compliance_score, 0) / results.length;

    toast.success(`Validation Complete: ${compliantCount}/${results.length} compliant`, {
      description: `Average score: ${avgScore.toFixed(0)}%`
    });

    if (onValidationComplete) {
      onValidationComplete(results);
    }

    setIsValidating(false);
  };

  const ComplianceCard = ({ result }) => (
    <Card className={`border-l-4 ${
      result.is_compliant ? 'border-l-green-600' : 'border-l-red-600'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {result.is_compliant ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <h4 className="font-semibold text-slate-900">{result.claim.claim_text}</h4>
            </div>
            <Badge variant="outline" className="text-xs">
              {claimCategories[result.claim.category]?.label}
            </Badge>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">
              {result.compliance_score}%
            </div>
            <Badge className={
              result.greenwashing_risk === 'high' ? 'bg-red-100 text-red-700' :
              result.greenwashing_risk === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }>
              {result.greenwashing_risk} risk
            </Badge>
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className={`flex items-center gap-1 ${result.validation_details.is_specific ? 'text-green-700' : 'text-red-700'}`}>
            {result.validation_details.is_specific ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            Specific & Quantifiable
          </div>
          <div className={`flex items-center gap-1 ${result.validation_details.has_scientific_basis ? 'text-green-700' : 'text-red-700'}`}>
            {result.validation_details.has_scientific_basis ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            Scientific Basis
          </div>
          <div className={`flex items-center gap-1 ${result.validation_details.has_verification ? 'text-green-700' : 'text-red-700'}`}>
            {result.validation_details.has_verification ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            Third-Party Verified
          </div>
          <div className={`flex items-center gap-1 ${result.validation_details.is_clear ? 'text-green-700' : 'text-red-700'}`}>
            {result.validation_details.is_clear ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            Clear & Not Misleading
          </div>
        </div>

        {/* Missing Evidence */}
        {result.missing_evidence && result.missing_evidence.length > 0 && (
          <Alert className="mb-3">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="font-semibold text-xs mb-1">Missing Evidence:</div>
              <ul className="list-disc list-inside text-xs space-y-0.5">
                {result.missing_evidence.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Required Actions */}
        {result.required_actions && result.required_actions.length > 0 && (
          <div className="bg-amber-50 p-2 rounded text-xs">
            <div className="font-semibold text-amber-900 mb-1">Required Actions:</div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              {result.required_actions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#86b027]" />
            ECGT Green Claims Validator
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            EU Directive 2024/825 - Empowering Consumers for the Green Transition
          </p>
        </div>

        <Button 
          onClick={handleValidateAll}
          disabled={isValidating || claims.length === 0}
          className="bg-[#86b027] hover:bg-[#769c22]"
        >
          <FileCheck className="w-4 h-4 mr-2" />
          {isValidating ? 'Validating...' : 'Validate All Claims'}
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          <strong>ECGT Requirements:</strong> All environmental claims must be specific, substantiated with scientific evidence, 
          and verified. Generic claims like "eco-friendly" or "green" without proof are prohibited as of September 2026.
        </AlertDescription>
      </Alert>

      {/* Claim Categories Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supported Claim Categories</CardTitle>
          <CardDescription>Evidence requirements per ECGT</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(claimCategories).map(([key, category]) => (
              <div key={key} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-slate-900">{category.label}</h4>
                  <Badge variant={
                    category.risk_level === 'high' ? 'destructive' :
                    category.risk_level === 'medium' ? 'warning' : 'default'
                  }>
                    {category.risk_level}
                  </Badge>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="font-medium">Required Evidence:</div>
                  <ul className="list-disc list-inside">
                    {category.evidence_required.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && validationResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Validation Results</h3>
          
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Compliant Claims</p>
                  <p className="text-2xl font-bold text-green-600">
                    {validationResults.filter(r => r.is_compliant).length}/{validationResults.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Average Score</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(validationResults.reduce((sum, r) => sum + r.compliance_score, 0) / validationResults.length).toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">
                    {validationResults.filter(r => r.greenwashing_risk === 'high').length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Results */}
          <div className="space-y-3">
            {validationResults.map((result, idx) => (
              <ComplianceCard key={idx} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* No Claims State */}
      {claims.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Leaf className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Claims to Validate</h3>
            <p className="text-slate-500">Add environmental claims to your product to validate ECGT compliance</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}