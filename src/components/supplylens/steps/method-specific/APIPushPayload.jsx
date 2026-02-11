import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Zap, Hash, Clock, Loader2, ChevronDown, Info } from 'lucide-react';
import { toast } from 'sonner';

/**
 * API_PUSH Step 2: API Receipt Details
 * Captures push event reference with server-verified payload digest.
 * 
 * Deterministic & Regulator-Grade:
 * - received_at_utc is read-only (server-authoritative)
 * - payload_digest_sha256 must be exactly 64 lowercase hex chars
 * - external_reference_id enforces idempotency key format
 * - Optional digest helper (client-side only, payload never sent to server)
 */
export default function APIPushPayload({ declaration, onNext, onBack, draftId, simulationMode }) {
  const [externalRefId, setExternalRefId] = useState(declaration.external_reference_id || '');
  const [sourceEndpoint, setSourceEndpoint] = useState(declaration.source_endpoint || '');
  // received_at_utc is READ-ONLY, shown as "Pending" or server value
  const [receivedAtUtc] = useState(declaration.received_at_utc);
  const [payloadDigest, setPayloadDigest] = useState((declaration.payload_digest_sha256 || '').toLowerCase());
  const [payloadBytesCount, setPayloadBytesCount] = useState(declaration.payload_bytes_count || '');
  const [rawPayload, setRawPayload] = useState('');
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [showDigestHelper, setShowDigestHelper] = useState(false);
  
  // Validation: strict regex format for idempotency key
  const refIdRegex = /^[A-Za-z0-9._:-]{8,80}$/;
  const refIdValid = refIdRegex.test(externalRefId.trim());
  
  // Digest: exactly 64 lowercase hex chars
  const digestRegex = /^[a-f0-9]{64}$/i;
  const digestValid = digestRegex.test(payloadDigest.trim());
  
  // Source endpoint: optional but must be valid URL if provided
  const sourceEndpointValid = !sourceEndpoint.trim() || 
    (sourceEndpoint.trim().length <= 200 && sourceEndpoint.trim().startsWith('http'));
  
  const canProceed = refIdValid && sourceEndpointValid && (
    simulationMode || digestValid
  );

  // Client-side SHA-256 computation (payload NEVER sent to server)
  const computeHashFromRawPayload = async () => {
    if (!rawPayload.trim()) {
      toast.error('Payload is empty', { duration: 3000 });
      return;
    }
    
    setIsComputingHash(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(rawPayload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
      
      setPayloadDigest(hashHex);
      setPayloadBytesCount(data.length);
      toast.success('✓ Digest computed locally', { 
        description: `${hashHex.substring(0, 16)}...`,
        duration: 3000 
      });
    } catch (error) {
      toast.error('Computation failed', { description: error.message, duration: 4000 });
    } finally {
      setIsComputingHash(false);
    }
  };

  // Simulation: deterministic test digest
  const generateSimulatedDigest = () => {
    const simDigest = 'abcdef0123456789'.repeat(4).substring(0, 64); // Valid hex pattern
    setPayloadDigest(simDigest);
    setPayloadBytesCount(1024);
    toast.info('Test digest generated', { description: 'UI validation only', duration: 2000 });
  };

  // Persist to declaration (read-only fields excluded)
  useEffect(() => {
    declaration.external_reference_id = externalRefId.trim();
    declaration.source_endpoint = sourceEndpoint.trim() || null;
    declaration.payload_digest_sha256 = payloadDigest.toLowerCase();
    declaration.payload_bytes_count = payloadBytesCount ? parseInt(payloadBytesCount, 10) : null;
    // received_at_utc is set by server, never modified here
  }, [externalRefId, sourceEndpoint, payloadDigest, payloadBytesCount]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900">Step 2: API Receipt Details</h3>
        <p className="text-xs text-slate-600 mt-1">External reference ID and payload integrity digest</p>
      </div>

      <Card className="bg-indigo-50/50 border-indigo-300/60">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900">
              <p className="font-medium">API_PUSH: Reference-Based Ingestion</p>
              <p className="mt-1">External reference ensures idempotent replay protection. Payload digest (SHA-256) verifies integrity without storing raw bytes.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1 Summary (read-only) */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="p-3 space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Method</span>
            <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">API_PUSH</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Dataset</span>
            <Badge className="bg-blue-100 text-blue-800 text-[10px]">{declaration.dataset_type || 'Not set'}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Scope</span>
            <span className="text-slate-700 font-mono text-[10px]">{declaration.declared_scope || '—'}</span>
          </div>
        </CardContent>
      </Card>

      {/* External Reference ID */}
      <div>
        <Label className="text-xs font-medium">External Reference ID * (idempotency key)</Label>
        <Input
          value={externalRefId}
          onChange={(e) => setExternalRefId(e.target.value)}
          placeholder="e.g., ORDER-2026-12345 or api-evt_abc123"
          className="font-mono text-xs"
          maxLength={80}
        />
        <p className="text-xs text-slate-500 mt-1">
          Alphanumeric, dots, dashes, colons, underscores only. 8–80 chars. Ensures idempotent replay protection.
        </p>
        {externalRefId && !refIdValid && (
          <p className="text-xs text-red-600 mt-1">✗ Invalid format. Use [A-Za-z0-9._:-] only.</p>
        )}
      </div>

      {/* Received At UTC (READ-ONLY, server-authoritative) */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <Label className="text-xs font-medium text-slate-700 block mb-2">Received At (UTC) — Server-Set</Label>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <code className="flex-1 text-xs font-mono text-slate-700 bg-white rounded px-2 py-1 border border-slate-300">
            {receivedAtUtc ? new Date(receivedAtUtc).toISOString() : 'Pending (server will set)'}
          </code>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          ⓘ This timestamp is set by the Evidence Engine when the draft is created. Read-only in production.
        </p>
      </div>

      {/* Source Endpoint (optional) */}
      <div>
        <Label className="text-xs font-medium">Source Endpoint (optional)</Label>
        <Input
          value={sourceEndpoint}
          onChange={(e) => setSourceEndpoint(e.target.value)}
          placeholder="https://api.yoursystem.com/push/v1"
          className="font-mono text-xs"
          maxLength={200}
        />
        <p className="text-xs text-slate-500 mt-1">
          Must be a valid HTTPS URL if provided. Max 200 chars.
        </p>
        {sourceEndpoint && !sourceEndpointValid && (
          <p className="text-xs text-red-600 mt-1">✗ Invalid URL or too long</p>
        )}
      </div>

      {/* Payload Digest SHA-256 */}
      <div>
        <Label className="text-xs font-medium">
          Payload Digest SHA-256 * {simulationMode && '(optional in UI mode)'}
        </Label>
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-slate-400" />
          <Input
            value={payloadDigest}
            onChange={(e) => setPayloadDigest(e.target.value.toLowerCase())}
            placeholder="64 lowercase hex characters"
            className="flex-1 font-mono text-xs"
            maxLength={64}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {simulationMode 
            ? 'Optional in UI Validation Mode.' 
            : 'Required. Exactly 64 hex chars (a–f, 0–9).'}
        </p>
        {payloadDigest && !digestValid && (
          <p className="text-xs text-red-600 mt-1">✗ Must be exactly 64 lowercase hex characters</p>
        )}
      </div>

      {/* Payload Bytes Count (optional) */}
      <div>
        <Label className="text-xs font-medium">Payload Bytes Count (optional)</Label>
        <Input
          type="number"
          value={payloadBytesCount}
          onChange={(e) => setPayloadBytesCount(e.target.value)}
          placeholder="e.g., 2048"
          className="font-mono text-xs"
          min="0"
        />
        <p className="text-xs text-slate-500 mt-1">Non-negative integer, in bytes.</p>
      </div>

      {/* Developer Helper: Digest Computation (collapsed panel) */}
      {!simulationMode && typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
        <Card className="border-slate-200 bg-white">
          <button
            onClick={() => setShowDigestHelper(!showDigestHelper)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-medium text-slate-700">Local helper: Compute digest in browser</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDigestHelper ? 'rotate-180' : ''}`} />
          </button>
          
          {showDigestHelper && (
            <CardContent className="p-4 space-y-3 border-t border-slate-200">
              {declaration.contains_personal_data && (
                <Alert className="bg-red-50 border-red-300">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-xs text-red-900 ml-2">
                    <strong>Caution:</strong> Avoid pasting personal data. This helper is for testing only.
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <Label className="text-xs font-medium text-slate-700">Raw Payload (JSON/text)</Label>
                <Textarea
                  value={rawPayload}
                  onChange={(e) => setRawPayload(e.target.value)}
                  placeholder="Paste payload here. Hashed in browser only — never sent to server."
                  className="font-mono text-xs h-20 mt-1"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={computeHashFromRawPayload}
                disabled={!rawPayload.trim() || isComputingHash}
                className="w-full"
              >
                {isComputingHash ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    Computing SHA-256...
                  </>
                ) : (
                  <>
                    <Hash className="w-3 h-3 mr-2" />
                    Compute SHA-256 (browser only)
                  </>
                )}
              </Button>

              <p className="text-[10px] text-slate-500 italic">
                ⓘ Digest is computed locally in your browser. Your payload is never sent to our servers.
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {/* Simulation Mode: Generate Test Digest */}
      {simulationMode && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-4 space-y-3">
            <Button
              size="sm"
              variant="outline"
              onClick={generateSimulatedDigest}
              className="w-full"
            >
              <Zap className="w-3 h-3 mr-2" />
              Generate Test Digest
            </Button>
            <p className="text-xs text-amber-800">
              ⚠️ UI Validation Mode: Digest is deterministic test value, not cryptographically secure.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Receipt Status Card */}
      <Card className={simulationMode ? "bg-amber-50 border-amber-300" : digestValid ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-200"}>
        <CardContent className={`p-3 text-xs ${simulationMode ? 'text-amber-900' : digestValid ? 'text-green-800' : 'text-slate-700'}`}>
          <p className={`font-medium mb-2 ${simulationMode ? 'text-amber-900' : digestValid ? 'text-green-900' : 'text-slate-900'}`}>
            {simulationMode ? '⚠️ UI Validation Mode' : digestValid ? '✓ Ready to Review' : 'Status'}
          </p>
          <div className="space-y-1">
            <p>• Method: <strong>API_PUSH</strong></p>
            <p>• Reference ID: <strong>{externalRefId ? '✓' : '—'}</strong></p>
            <p>• Digest: <strong>{digestValid ? `${payloadDigest.substring(0, 12)}...` : '—'}</strong></p>
            {simulationMode && (
              <p className="text-[10px] mt-2 italic">No ledger record will be created. For UI testing only.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Feedback */}
      {!canProceed && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            <strong>Cannot proceed:</strong>
            {!refIdValid && ' External reference ID format invalid.'}
            {!sourceEndpointValid && ' Source endpoint must be a valid URL.'}
            {!simulationMode && !digestValid && ' Payload digest must be 64 hex characters.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          onClick={onNext}
          disabled={!canProceed}
          className="bg-[#86b027] hover:bg-[#86b027]/90 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          Review & Seal
        </Button>
      </div>
    </div>
  );
}