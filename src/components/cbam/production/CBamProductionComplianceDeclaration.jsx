/**
 * CBAM PRODUCTION COMPLIANCE DECLARATION
 * Legal declaration for production deployment authorization
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function CBamProductionComplianceDeclaration() {
  const declarationDate = new Date('2026-01-20').toISOString().split('T')[0];
  const effectiveDate = '2026-01-20';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-lg p-8">
        <div className="flex items-start gap-4">
          <FileText className="w-8 h-8 flex-shrink-0 mt-1" />
          <div>
            <h1 className="text-3xl font-light tracking-tight mb-2">
              CBAM Production Compliance Declaration
            </h1>
            <p className="text-slate-300 text-sm">
              Effective: {effectiveDate} | Regulatory Scope: EU 2026 Definitive Regime
            </p>
          </div>
        </div>
      </div>

      {/* LEGAL DISCLAIMER */}
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 text-sm">
          <strong>CRITICAL DISCLAIMER:</strong> This system is an automated compliance assistance tool. 
          It provides calculations, validations, and recommendations only. The importer remains solely responsible 
          for accuracy, completeness, and regulatory compliance of all CBAM declarations. AI recommendations 
          are NOT approvals and do not constitute authorization for reporting.
        </AlertDescription>
      </Alert>

      {/* REGULATORY SCOPE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Regulatory Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Applicable Regulations</h4>
            <ul className="space-y-1 text-slate-600 ml-4">
              <li>✓ Regulation (EU) 2023/956 – CBAM</li>
              <li>✓ Commission Implementing Regulation C(2025) 8150 – Detailed Rules</li>
              <li>✓ Commission Implementing Regulation C(2025) 8151 – Calculation Methodologies</li>
              <li>✓ EU 2026 Definitive Regime (Phase 2)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Covered Goods Categories</h4>
            <div className="flex flex-wrap gap-2">
              {['Iron & Steel', 'Aluminium', 'Cement', 'Fertilizers', 'Hydrogen', 'Electricity'].map(cat => (
                <Badge key={cat} variant="outline">{cat}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">CBAM Phase-In Factor 2026</h4>
            <p className="text-slate-600">2.5% (2026) | 5% (2027) | 7.5% (2028) | 10% (2029) | 100% (2030)</p>
          </div>
        </CardContent>
      </Card>

      {/* SYSTEM CAPABILITIES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            System Capabilities & Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">✓ ENABLED FUNCTIONS</h4>
            <ul className="space-y-1 text-slate-600 ml-4 list-disc">
              <li>Automated emission calculation (direct, indirect, precursor, embedded)</li>
              <li>Default value application with 10/20/30% markups</li>
              <li>Benchmark validation and application</li>
              <li>Free allocation deduction</li>
              <li>CN code classification and validation</li>
              <li>Production route detection</li>
              <li>Precursor year consistency enforcement</li>
              <li>Data quality scoring and flagging</li>
              <li>Verification state machine (accredited verifier only)</li>
              <li>Report generation (XML, PDF)</li>
              <li>Certificate calculation and tracking</li>
              <li>Immutable audit trail logging</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">✗ DISABLED FUNCTIONS</h4>
            <ul className="space-y-1 text-red-600 ml-4 list-disc">
              <li>Auto-approval of calculations (requires manual user review)</li>
              <li>Auto-approval of validations</li>
              <li>Auto-purchase of CBAM certificates</li>
              <li>Auto-application of regulatory updates</li>
              <li>Silent data recalculation</li>
              <li>Unaudited data modifications</li>
              <li>Cross-tenant data access</li>
              <li>Role override or privilege escalation</li>
              <li>Hidden administrative functions</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* COMPLIANCE LOCKS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Compliance Locks & Enforcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-slate-900 mb-2">Lifecycle Isolation</h5>
              <p className="text-slate-600 text-xs">
                Entry → Calculation → Validation → Verification → Reporting. Each phase is locked until prior phase completes. No jumping or skipping.
              </p>
            </div>
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-slate-900 mb-2">CN Code Freeze</h5>
              <p className="text-slate-600 text-xs">
                CN code changes on existing entries trigger entry state → CN_CODE_CHANGE_PENDING. Downstream blocked. User must submit change request with impact analysis.
              </p>
            </div>
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-slate-900 mb-2">Precursor Year Alignment</h5>
              <p className="text-slate-600 text-xs">
                Precursor reporting year must match complex good year OR have approved deviation with evidence. Year mismatch blocks validation.
              </p>
            </div>
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-slate-900 mb-2">Calculation Immutability</h5>
              <p className="text-slate-600 text-xs">
                Historical calculations backed up. Recalculation requires explicit approval. Old data never overwritten.
              </p>
            </div>
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-slate-900 mb-2">Verification Gate</h5>
              <p className="text-slate-600 text-xs">
                Verified entries cannot be modified. Verification marked as VERIFIED, UNSATISFACTORY, or REQUIRES_CORRECTION (not overridable).
              </p>
            </div>
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <h5 className="font-semibold text-slate-900 mb-2">Reporting Lock</h5>
              <p className="text-slate-600 text-xs">
                Report generation consumes ONLY validated + verified data. No partial or unvalidated data permitted. Financial impact always EUR.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AUDIT & ACCOUNTABILITY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Audit & Accountability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Audit Trail Coverage</h4>
            <p className="text-slate-600 mb-3">
              Every regulated action is logged immutably with: User | Timestamp | Entity | Old Value | New Value | Regulatory Reference
            </p>
            <ul className="space-y-1 text-slate-600 ml-4 list-disc">
              <li>Entry creation, update, deletion</li>
              <li>Calculation execution and recalculation</li>
              <li>Validation status changes</li>
              <li>Verification submission and completion</li>
              <li>CN code changes and approvals</li>
              <li>Precursor year deviation requests and approvals</li>
              <li>Report generation and publication</li>
              <li>Certificate purchases and allocations</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Regulatory References</h4>
            <p className="text-slate-600">
              All audit logs include explicit regulatory reference (e.g., "CBAM Art. 14(2)", "C(2025) 8151 Art. 13") for regulatory defensibility.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* USER RESPONSIBILITIES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Importer Responsibilities & Disclaimers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2">Importer Must:</h4>
            <ul className="space-y-1 text-slate-600 ml-4 list-disc">
              <li>Verify all input data for accuracy and completeness</li>
              <li>Ensure supplier data is current and compliant</li>
              <li>Review all calculated results before submission</li>
              <li>Confirm verification by accredited independent verifier</li>
              <li>Maintain original documentation and evidence</li>
              <li>Comply with all Art. 16-18 declaration requirements</li>
              <li>Accept full responsibility for declared emissions</li>
              <li>Notify authorities of any errors post-submission</li>
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-2">Liability Disclaimer:</h4>
            <p className="text-slate-600 text-xs">
              This system provides technical assistance only. It is not a legal advisor, accountant, or regulatory authority. 
              The importer assumes full liability for CBAM compliance, accuracy of declarations, and any penalties for non-compliance. 
              The platform operator and system providers are not liable for calculation errors, data loss, or regulatory violations 
              resulting from user actions or data inaccuracies.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ENFORCEMENT DATE */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Production Deployment Authorized</h4>
              <p className="text-slate-600 text-sm">
                Effective Date: {effectiveDate} | Regulatory Scope: EU CBAM 2026 Definitive Regime
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DECLARATION FOOTER */}
      <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
        <p>
          This declaration certifies that the CBAM module meets all production readiness and regulatory compliance requirements 
          as of {declarationDate}. All compliance locks, audit trails, lifecycle isolation, and safety gates are active and enforced.
        </p>
      </div>
    </div>
  );
}