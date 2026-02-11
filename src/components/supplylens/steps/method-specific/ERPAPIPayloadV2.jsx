import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, AlertTriangle, Info, Database, Code } from 'lucide-react';
import { generateSimulatedDigest } from '../../utils/simulationHash';

/**
 * STEP 2: ERP_API Payload Adapter
 * Captures API extraction run metadata with manifest digest
 * No secrets or credentials stored
 */

export default function ERPAPIPayloadV2({ 
  declaration, 
  onBack, 
  onNext, 
  simulationMode 
}) {
  // State
  const [erpSystem, setErpSystem] = useState(declaration.erp_system || 'SAP');
  const [connectorName, setConnectorName] = useState(declaration.connector_name || '');
  const [runId, setRunId] = useState(declaration.run_id || '');
  const [queryProfile, setQueryProfile] = useState(declaration.query_profile || 'SUPPLIERS');
  const [customProfileName, setCustomProfileName] = useState(declaration.custom_profile_name || '');
  const [startedAtUtc, setStartedAtUtc] = useState(declaration.started_at_utc || '');
  const [finishedAtUtc, setFinishedAtUtc] = useState(declaration.finished_at_utc || '');
  const [recordsReturned, setRecordsReturned] = useState(declaration.records_returned || '');
  const [paginationPages, setPaginationPages] = useState(declaration.pagination_pages || '');
  const [apiBaseUrl, setApiBaseUrl] = useState(declaration.api_base_url || '');
  const [manifestDigest, setManifestDigest] = useState(declaration.manifest_digest_sha256 || '');

  // Sync state back to declaration
  useEffect(() => {
    declaration.erp_system = erpSystem;
    declaration.connector_name = connectorName;
    declaration.run_id = runId;
    declaration.query_profile = queryProfile;
    declaration.custom_profile_name = queryProfile === 'CUSTOM' ? customProfileName : null;
    declaration.started_at_utc = startedAtUtc;
    declaration.finished_at_utc = finishedAtUtc;
    declaration.records_returned = recordsReturned ? parseInt(recordsReturned) : null;
    declaration.pagination_pages = paginationPages ? parseInt(paginationPages) : null;
    declaration.api_base_url = apiBaseUrl;
    declaration.manifest_digest_sha256 = manifestDigest;
  }, [erpSystem, connectorName, runId, queryProfile, customProfileName, startedAtUtc, finishedAtUtc, recordsReturned, paginationPages, apiBaseUrl, manifestDigest]);

  // Validation
  const validateFields = () => {
    const errors = [];

    if (!connectorName || connectorName.length < 5 || connectorName.length > 80) {
      errors.push('Connector name must be 5-80 characters');
    }

    if (!runId || runId.length < 5 || runId.length > 80) {
      errors.push('Run ID must be 5-80 characters');
    }

    if (queryProfile === 'CUSTOM' && (!customProfileName || customProfileName.length < 5 || customProfileName.length > 80)) {
      errors.push('Custom profile name must be 5-80 characters');
    }

    if (!startedAtUtc) {
      errors.push('Started At timestamp is required');
    }

    if (!finishedAtUtc) {
      errors.push('Finished At timestamp is required');
    }

    if (startedAtUtc && finishedAtUtc && new Date(finishedAtUtc) < new Date(startedAtUtc)) {
      errors.push('Finished At must be >= Started At');
    }

    if (!recordsReturned || recordsReturned < 0) {
      errors.push('Records returned must be >= 0');
    }

    if (!simulationMode && (!manifestDigest || manifestDigest.length < 64)) {
      errors.push('Manifest digest SHA-256 is required in Production Mode (64 hex chars)');
    }

    return errors;
  };

  const errors = validateFields();
  const canProceed = errors.length === 0;

  // Generate simulated digest
  const handleSimulateDigest = () => {
    const simDigest = generateSimulatedDigest(`ERP_API:${connectorName}:${runId}`);
    setManifestDigest(simDigest);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-5 h-5 text-indigo-600" />
        <h3 className="font-medium text-slate-900">ERP API Extraction Details</h3>
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

      {/* Method Description */}
      <Card className="border-slate-300 bg-blue-50">
        <CardContent className="p-4 text-xs text-slate-700">
          <p className="font-medium text-blue-900 mb-2">ERP API Evidence</p>
          <p>Records an API extraction run with manifest digest. No credentials or tokens are captured.</p>
          <p className="mt-2 text-blue-800">The manifest digest ensures data integrity without storing the actual payload.</p>
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

      {/* ERP System and Connector */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Connector Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="erp-system" className="text-xs font-medium text-slate-700">
              ERP System <span className="text-red-500">*</span>
            </Label>
            <Select value={erpSystem} onValueChange={setErpSystem}>
              <SelectTrigger id="erp-system" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAP">SAP</SelectItem>
                <SelectItem value="ODOO">Odoo</SelectItem>
                <SelectItem value="DYNAMICS">Microsoft Dynamics</SelectItem>
                <SelectItem value="NETSUITE">NetSuite</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="connector-name" className="text-xs font-medium text-slate-700">
              Connector Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="connector-name"
              value={connectorName}
              onChange={(e) => setConnectorName(e.target.value)}
              placeholder="e.g. sap-prod-supplier-api"
              className="text-xs"
              maxLength={80}
            />
            <p className="text-[10px] text-slate-500 mt-1">{connectorName.length}/80 chars</p>
          </div>

          <div>
            <Label htmlFor="api-base-url" className="text-xs font-medium text-slate-700">
              API Base URL <span className="text-slate-500">(optional, no tokens)</span>
            </Label>
            <Input
              id="api-base-url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              className="text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">Display only — no credentials captured</p>
          </div>
        </CardContent>
      </Card>

      {/* Run Metadata */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Extraction Run Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="run-id" className="text-xs font-medium text-slate-700">
              Run ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="run-id"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
              placeholder="e.g. run-2026-01-28-001"
              className="text-xs font-mono"
              maxLength={80}
            />
            <p className="text-[10px] text-slate-500 mt-1">{runId.length}/80 chars</p>
          </div>

          <div>
            <Label htmlFor="query-profile" className="text-xs font-medium text-slate-700">
              Query Profile <span className="text-red-500">*</span>
            </Label>
            <Select value={queryProfile} onValueChange={setQueryProfile}>
              <SelectTrigger id="query-profile" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPPLIERS">Suppliers</SelectItem>
                <SelectItem value="PRODUCTS">Products</SelectItem>
                <SelectItem value="BOM">Bill of Materials</SelectItem>
                <SelectItem value="TRANSACTIONS">Transactions</SelectItem>
                <SelectItem value="CUSTOM">Custom Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {queryProfile === 'CUSTOM' && (
            <div>
              <Label htmlFor="custom-profile-name" className="text-xs font-medium text-slate-700">
                Custom Profile Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="custom-profile-name"
                value={customProfileName}
                onChange={(e) => setCustomProfileName(e.target.value)}
                placeholder="e.g. custom-carbon-footprint-query"
                className="text-xs"
                maxLength={80}
              />
              <p className="text-[10px] text-slate-500 mt-1">{customProfileName.length}/80 chars</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="started-at" className="text-xs font-medium text-slate-700">
                Started At (UTC) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="started-at"
                type="datetime-local"
                value={startedAtUtc}
                onChange={(e) => setStartedAtUtc(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <Label htmlFor="finished-at" className="text-xs font-medium text-slate-700">
                Finished At (UTC) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="finished-at"
                type="datetime-local"
                value={finishedAtUtc}
                onChange={(e) => setFinishedAtUtc(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="records-returned" className="text-xs font-medium text-slate-700">
                Records Returned <span className="text-red-500">*</span>
              </Label>
              <Input
                id="records-returned"
                type="number"
                value={recordsReturned}
                onChange={(e) => setRecordsReturned(e.target.value)}
                placeholder="0"
                className="text-xs"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="pagination-pages" className="text-xs font-medium text-slate-700">
                Pagination Pages <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                id="pagination-pages"
                type="number"
                value={paginationPages}
                onChange={(e) => setPaginationPages(e.target.value)}
                placeholder="1"
                className="text-xs"
                min="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manifest Digest */}
      <Card className="border-slate-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Manifest Digest</CardTitle>
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
            <Label htmlFor="manifest-digest" className="text-xs font-medium text-slate-700">
              SHA-256 Manifest Hash {!simulationMode && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="manifest-digest"
              value={manifestDigest}
              onChange={(e) => setManifestDigest(e.target.value)}
              placeholder={simulationMode ? "Click 'Simulate Digest' or enter manually" : "64 hex characters"}
              className="text-xs font-mono"
              maxLength={64}
            />
            {manifestDigest && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-slate-500">{manifestDigest.length}/64 chars</p>
                {manifestDigest.startsWith('SIM') && (
                  <Badge className="bg-amber-100 text-amber-800 text-[8px]">SIMULATED</Badge>
                )}
              </div>
            )}
          </div>

          <Alert className="bg-blue-50 border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-[10px] text-blue-900 ml-2">
              <strong>Manifest digest:</strong> Hash of the extraction manifest/metadata, not the entire payload.
              {simulationMode && <span className="block mt-1">In Simulation Mode, simulated digests are accepted for UI validation.</span>}
              {!simulationMode && <span className="block mt-1">In Production Mode, this is required and must be a valid SHA-256 hash.</span>}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-green-50 border-green-300">
        <CardContent className="p-3 text-xs text-green-900">
          <p className="font-medium mb-1">🔒 Security Notice</p>
          <p>No credentials, tokens, or sensitive headers are captured or stored in this evidence record.</p>
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
          className="text-xs bg-indigo-600 hover:bg-indigo-700"
        >
          Review & Seal
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}