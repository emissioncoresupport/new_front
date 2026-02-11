import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, AlertTriangle, Info, Globe, Code, ShieldAlert } from 'lucide-react';
import { generateSimulatedDigest } from '../../utils/simulationHash';

/**
 * STEP 2: SUPPLIER_PORTAL Payload Adapter
 * Captures supplier submission metadata with content digest
 * Reference-first approach: file upload comes later
 */

export default function SupplierPortalPayloadV2({ 
  declaration, 
  onBack, 
  onNext, 
  simulationMode 
}) {
  // State
  const [submittingParty, setSubmittingParty] = useState(declaration.submitting_party || '');
  const [supplierIdentifier, setSupplierIdentifier] = useState(declaration.supplier_identifier || '');
  const [submissionId, setSubmissionId] = useState(declaration.submission_id || '');
  const [submittedAtUtc, setSubmittedAtUtc] = useState(declaration.submitted_at_utc || '');
  const [submissionChannel, setSubmissionChannel] = useState(declaration.submission_channel || 'WEB_FORM');
  const [declarationType, setDeclarationType] = useState(declaration.declaration_type || 'CERTIFICATE');
  const [otherDeclarationType, setOtherDeclarationType] = useState(declaration.other_declaration_type || '');
  const [contentDigest, setContentDigest] = useState(declaration.content_digest_sha256 || '');
  const [contactEmail, setContactEmail] = useState(declaration.contact_email || '');

  // Sync state back to declaration
  useEffect(() => {
    declaration.submitting_party = submittingParty;
    declaration.supplier_identifier = supplierIdentifier;
    declaration.submission_id = submissionId;
    declaration.submitted_at_utc = submittedAtUtc;
    declaration.submission_channel = submissionChannel;
    declaration.declaration_type = declarationType;
    declaration.other_declaration_type = declarationType === 'OTHER' ? otherDeclarationType : null;
    declaration.content_digest_sha256 = contentDigest;
    declaration.contact_email = contactEmail;
  }, [submittingParty, supplierIdentifier, submissionId, submittedAtUtc, submissionChannel, declarationType, otherDeclarationType, contentDigest, contactEmail]);

  // Email validation
  const isValidEmail = (email) => {
    if (!email) return true; // Optional field
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validation
  const validateFields = () => {
    const errors = [];

    if (!submittingParty || submittingParty.length < 2 || submittingParty.length > 120) {
      errors.push('Submitting party name must be 2-120 characters');
    }

    if (supplierIdentifier && supplierIdentifier.length > 80) {
      errors.push('Supplier identifier must be max 80 characters');
    }

    if (!submissionId || submissionId.length < 8 || submissionId.length > 80) {
      errors.push('Submission ID must be 8-80 characters');
    }

    if (!submittedAtUtc) {
      errors.push('Submission timestamp is required');
    }

    if (declarationType === 'OTHER' && (!otherDeclarationType || otherDeclarationType.length < 5 || otherDeclarationType.length > 80)) {
      errors.push('Other declaration type must be 5-80 characters');
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      errors.push('Contact email format is invalid');
    }

    if (!simulationMode && (!contentDigest || contentDigest.length < 64)) {
      errors.push('Content digest SHA-256 is required in Production Mode (64 hex chars)');
    }

    return errors;
  };

  const errors = validateFields();
  const canProceed = errors.length === 0;

  // Generate simulated digest
  const handleSimulateDigest = () => {
    const simDigest = generateSimulatedDigest(`SUPPLIER_PORTAL:${submittingParty}:${submissionId}`);
    setContentDigest(simDigest);
  };

  const hasPersonalData = declaration.contains_personal_data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-5 h-5 text-green-600" />
        <h3 className="font-medium text-slate-900">Supplier Portal Submission</h3>
      </div>

      {/* Simulation Mode Banner */}
      {simulationMode && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900 ml-2">
            <strong>UI Validation Mode:</strong> Simulated digests allowed. No ledger interaction.
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Data Warning */}
      {hasPersonalData && (
        <Alert className="bg-orange-50 border-orange-300">
          <ShieldAlert className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-sm text-orange-900 ml-2">
            <strong>Personal Data:</strong> This submission contains personal data. Access controls and GDPR compliance apply.
          </AlertDescription>
        </Alert>
      )}

      {/* Method Description */}
      <Card className="border-slate-300 bg-green-50">
        <CardContent className="p-4 text-xs text-slate-700">
          <p className="font-medium text-green-900 mb-2">Supplier Portal Evidence</p>
          <p>Records a submission event from an external party via the supplier portal or form.</p>
          <p className="mt-2 text-green-800">Reference-first approach: submission metadata sealed now, file content linked later.</p>
        </CardContent>
      </Card>

      {/* Read-only Declaration Context */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">From Step 1 Declaration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-600 font-medium">Source System</p>
              <Badge className="bg-purple-100 text-purple-800 text-[10px] mt-1">{declaration.source_system}</Badge>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Evidence Type</p>
              <Badge className="bg-blue-100 text-blue-800 text-[10px] mt-1">{declaration.dataset_type}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submitting Party Information */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Submitting Party</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="submitting-party" className="text-xs font-medium text-slate-700">
              Supplier Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="submitting-party"
              value={submittingParty}
              onChange={(e) => setSubmittingParty(e.target.value)}
              placeholder="e.g. Acme Manufacturing GmbH"
              className="text-xs"
              maxLength={120}
            />
            <p className="text-[10px] text-slate-500 mt-1">{submittingParty.length}/120 chars</p>
          </div>

          <div>
            <Label htmlFor="supplier-identifier" className="text-xs font-medium text-slate-700">
              Supplier Identifier <span className="text-slate-500">(optional)</span>
            </Label>
            <Input
              id="supplier-identifier"
              value={supplierIdentifier}
              onChange={(e) => setSupplierIdentifier(e.target.value)}
              placeholder="e.g. SUP-12345 or VAT-DE123456789"
              className="text-xs"
              maxLength={80}
            />
            <p className="text-[10px] text-slate-500 mt-1">{supplierIdentifier.length}/80 chars</p>
          </div>

          <div>
            <Label htmlFor="contact-email" className="text-xs font-medium text-slate-700">
              Contact Email <span className="text-slate-500">(optional)</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="supplier@example.com"
              className="text-xs"
            />
            {contactEmail && !isValidEmail(contactEmail) && (
              <p className="text-[10px] text-red-600 mt-1">Invalid email format</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submission Details */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Submission Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="submission-id" className="text-xs font-medium text-slate-700">
              Submission ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="submission-id"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              placeholder="e.g. PORTAL-2026-01-28-0001"
              className="text-xs font-mono"
              maxLength={80}
            />
            <p className="text-[10px] text-slate-500 mt-1">{submissionId.length}/80 chars (min 8)</p>
          </div>

          <div>
            <Label htmlFor="submitted-at" className="text-xs font-medium text-slate-700">
              Submitted At (UTC) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="submitted-at"
              type="datetime-local"
              value={submittedAtUtc}
              onChange={(e) => setSubmittedAtUtc(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <Label htmlFor="submission-channel" className="text-xs font-medium text-slate-700">
              Submission Channel <span className="text-red-500">*</span>
            </Label>
            <Select value={submissionChannel} onValueChange={setSubmissionChannel}>
              <SelectTrigger id="submission-channel" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEB_FORM">Web Form</SelectItem>
                <SelectItem value="EMAIL_LINK">Email Link</SelectItem>
                <SelectItem value="API_FORM">API Form</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="declaration-type" className="text-xs font-medium text-slate-700">
              Declaration Type <span className="text-red-500">*</span>
            </Label>
            <Select value={declarationType} onValueChange={setDeclarationType}>
              <SelectTrigger id="declaration-type" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                <SelectItem value="TEST_REPORT">Test Report</SelectItem>
                <SelectItem value="DECLARATION">Declaration</SelectItem>
                <SelectItem value="BOM">Bill of Materials</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {declarationType === 'OTHER' && (
            <div>
              <Label htmlFor="other-declaration-type" className="text-xs font-medium text-slate-700">
                Other Declaration Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="other-declaration-type"
                value={otherDeclarationType}
                onChange={(e) => setOtherDeclarationType(e.target.value)}
                placeholder="e.g. environmental-assessment-report"
                className="text-xs"
                maxLength={80}
              />
              <p className="text-[10px] text-slate-500 mt-1">{otherDeclarationType.length}/80 chars (min 5)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Digest */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Content Digest</CardTitle>
            {simulationMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSimulateDigest}
                className="text-xs h-7"
              >
                <Code className="w-3 h-3 mr-1" />
                Simulate Digest
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="content-digest" className="text-xs font-medium text-slate-700">
              SHA-256 Content Hash {!simulationMode && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="content-digest"
              value={contentDigest}
              onChange={(e) => setContentDigest(e.target.value)}
              placeholder={simulationMode ? "Click 'Simulate Digest' or enter manually" : "64 hex characters"}
              className="text-xs font-mono"
              maxLength={64}
            />
            {contentDigest && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500">{contentDigest.length}/64 chars</p>
                {contentDigest.startsWith('SIM') && (
                  <Badge className="bg-amber-100 text-amber-800 text-[8px]">SIMULATED</Badge>
                )}
              </div>
            )}
          </div>

          <Alert className="bg-blue-50 border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-[10px] text-blue-900 ml-2">
              <strong>Content digest:</strong> Hash of the submitted content/file, computed before submission.
              {simulationMode && <span className="block mt-1">In Simulation Mode, simulated digests are accepted for UI validation.</span>}
              {!simulationMode && <span className="block mt-1">In Production Mode, this is required and must be a valid SHA-256 hash.</span>}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Reference-First Notice */}
      <Card className="bg-blue-50 border-blue-300">
        <CardContent className="p-3 text-xs text-blue-900">
          <p className="font-medium mb-1">📋 Reference-First Approach</p>
          <p>This evidence seals the submission metadata now. The actual file content can be uploaded and linked to this evidence record later.</p>
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-xs text-red-900 ml-2">
            <p className="font-medium mb-1">Please fix the following issues:</p>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="text-xs bg-green-600 hover:bg-green-700"
        >
          Review & Seal
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}