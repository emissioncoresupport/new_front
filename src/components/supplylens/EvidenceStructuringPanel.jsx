import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Sparkles, Loader2, AlertTriangle, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EvidenceStructuringPanel({ evidence, onStructured }) {
  const [userRole, setUserRole] = useState(null);
  const [schemaType, setSchemaType] = useState('');
  const [extractedFields, setExtractedFields] = useState({});
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState(null);

  const allowedRoles = ['admin', 'legal', 'compliance', 'procurement', 'auditor'];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserRole(user?.role);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  const handleExtractWithAI = async () => {
    setIsLoadingAI(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract structured data from this evidence file. Return JSON with fields like: company_name, country, address, vat_number, contact_email, etc. Be specific and accurate.`,
        file_urls: evidence.file_url ? [evidence.file_url] : [],
        response_json_schema: {
          type: 'object',
          properties: {
            fields: { type: 'object' },
            confidence_score: { type: 'number' },
            schema_type_suggestion: { type: 'string' }
          }
        }
      });

      setAiSuggestion({
        fields: result.fields || {},
        confidence_score: result.confidence_score || 0,
        schema_type_suggestion: result.schema_type_suggestion || 'other',
        model: 'gpt-4o'
      });
      setExtractedFields(result.fields || {});
      if (result.schema_type_suggestion) {
        setSchemaType(result.schema_type_suggestion);
      }
    } catch (err) {
      setError('AI extraction failed: ' + err.message);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      const result = await base44.functions.invoke('structureEvidence', {
        evidence_id: evidence.evidence_id,
        schema_type: schemaType,
        extracted_fields: extractedFields,
        ai_suggestion: aiSuggestion
      });

      if (result.data?.success) {
        onStructured && onStructured(result.data);
      } else {
        setError(result.data?.error || 'Failed to approve structuring');
      }
    } catch (err) {
      setError('Approval failed: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setExtractedFields(prev => ({ ...prev, [key]: value }));
  };

  const addField = () => {
    const newKey = `field_${Object.keys(extractedFields).length + 1}`;
    setExtractedFields(prev => ({ ...prev, [newKey]: '' }));
  };

  const removeField = (key) => {
    setExtractedFields(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Permission check
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Permission Denied: Only legal, compliance, procurement, auditor, or admin roles can approve structuring.
              <br />Your role: <Badge variant="outline">{userRole || 'unknown'}</Badge>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // State check
  if (evidence.state !== 'CLASSIFIED') {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Evidence must be in CLASSIFIED state to structure.
              <br />Current state: <Badge>{evidence.state}</Badge>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-light flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Structure Evidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evidence Context */}
        <div className="bg-slate-50 rounded p-3 space-y-2 text-xs">
          <div><span className="font-medium">Evidence ID:</span> {evidence.evidence_id}</div>
          <div><span className="font-medium">State:</span> <Badge variant="outline">{evidence.state}</Badge></div>
          <div><span className="font-medium">File:</span> {evidence.original_filename || 'N/A'}</div>
        </div>

        {/* AI Extraction */}
        <div className="space-y-2">
          <Button 
            onClick={handleExtractWithAI} 
            disabled={isLoadingAI || isApproving}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isLoadingAI ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Assisted Extraction
              </>
            )}
          </Button>
          {aiSuggestion && (
            <div className="bg-purple-50 rounded p-2 text-xs">
              <div className="font-medium text-purple-900">AI Suggestion</div>
              <div className="text-purple-700">Confidence: {aiSuggestion.confidence_score}%</div>
              <div className="text-purple-700">Model: {aiSuggestion.model}</div>
            </div>
          )}
        </div>

        {/* Schema Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Schema Type</label>
          <Select value={schemaType} onValueChange={setSchemaType}>
            <SelectTrigger>
              <SelectValue placeholder="Select schema type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supplier_identity">Supplier Identity</SelectItem>
              <SelectItem value="facility">Facility</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="shipment">Shipment</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="batch">Batch</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Extracted Fields */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Extracted Fields</label>
            <Button onClick={addField} variant="ghost" size="sm" className="text-xs">
              + Add Field
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(extractedFields).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <Input 
                  value={key} 
                  onChange={(e) => {
                    const newKey = e.target.value;
                    const updated = { ...extractedFields };
                    delete updated[key];
                    updated[newKey] = value;
                    setExtractedFields(updated);
                  }}
                  placeholder="Field name"
                  className="flex-1"
                />
                <Input 
                  value={value} 
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  placeholder="Field value"
                  className="flex-1"
                />
                <Button onClick={() => removeField(key)} variant="ghost" size="sm" className="text-red-600">
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Approve Button */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleApprove} 
            disabled={!schemaType || Object.keys(extractedFields).length === 0 || isApproving}
            className="w-full"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Structuring (Human Sign-Off)
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            By approving, you certify this structured data is accurate and complete.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}