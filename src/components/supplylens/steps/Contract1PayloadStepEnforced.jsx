import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Database, Code, Globe, User, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ERPAPIPayloadV2 from './method-specific/ERPAPIPayloadV2';
import SupplierPortalPayloadV2 from './method-specific/SupplierPortalPayloadV2';

export default function Contract1PayloadStepEnforced({ declaration, payload, setPayload, file, setFile, onNext, onBack, simulationMode }) {
  const [errors, setErrors] = useState({});

  const method = declaration.ingestion_method;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (evt) => setPayload(evt.target.result);
      reader.readAsText(selectedFile);
    }
  };

  const validate = () => {
    const errs = {};

    if (method === 'FILE_UPLOAD' && !file && !payload.trim()) {
      errs.payload = 'File or raw payload required';
    }
    if (method === 'API_PUSH' && !payload.trim()) {
      errs.payload = 'Raw payload required';
    }
    if (method === 'ERP_EXPORT' && !file) {
      errs.file = 'Export file required';
    }
    if (method === 'ERP_API' && !payload.trim()) {
      errs.payload = 'Server will fetch, but placeholder payload required for now';
    }
    if (method === 'SUPPLIER_PORTAL' && !payload.trim()) {
      errs.payload = 'Portal submission payload required';
    }
    if (method === 'MANUAL_ENTRY' && !payload.trim()) {
      errs.payload = 'Structured data required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    } else {
      toast.error('Please provide payload');
    }
  };

  const getIcon = () => {
    switch (method) {
      case 'FILE_UPLOAD': return <Upload className="w-5 h-5 text-blue-600" />;
      case 'API_PUSH': return <Code className="w-5 h-5 text-indigo-600" />;
      case 'ERP_EXPORT': return <Database className="w-5 h-5 text-purple-600" />;
      case 'ERP_API': return <Database className="w-5 h-5 text-violet-600" />;
      case 'SUPPLIER_PORTAL': return <Globe className="w-5 h-5 text-green-600" />;
      case 'MANUAL_ENTRY': return <User className="w-5 h-5 text-amber-600" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // Use dedicated adapters for specific methods
  if (method === 'ERP_API') {
    return (
      <ERPAPIPayloadV2 
        declaration={declaration} 
        onBack={onBack} 
        onNext={onNext} 
        simulationMode={simulationMode}
      />
    );
  }

  if (method === 'SUPPLIER_PORTAL') {
    return (
      <SupplierPortalPayloadV2 
        declaration={declaration} 
        onBack={onBack} 
        onNext={onNext} 
        simulationMode={simulationMode}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b">
        {getIcon()}
        <div>
          <h3 className="font-medium text-slate-900">Step 2: Provide Payload</h3>
          <p className="text-xs text-slate-600">Method: {method}</p>
        </div>
      </div>

      {/* FILE_UPLOAD */}
      {method === 'FILE_UPLOAD' && (
        <div className="space-y-3">
          <div>
            <Label>Upload File</Label>
            <div className="mt-2 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
              <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    <Upload className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click to upload</p>
                  </div>
                )}
              </label>
            </div>
          </div>
          <div>
            <Label>Or Paste Raw Payload</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="mt-2 h-24 font-mono text-xs"
              placeholder="CSV, JSON, or text..."
            />
          </div>
          {errors.payload && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.payload}</p>}
        </div>
      )}

      {/* API_PUSH */}
      {method === 'API_PUSH' && (
        <div className="space-y-3">
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-3 text-sm text-indigo-900">
              <p className="font-medium">API Integration</p>
              <p className="text-xs mt-1">JSON payload only. No file upload. Idempotency key required in Step 1.</p>
            </CardContent>
          </Card>
          <div>
            <Label>JSON Payload *</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="mt-2 h-32 font-mono text-xs"
              placeholder='{"supplier_id": "SUP-001", ...}'
            />
          </div>
          {errors.payload && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.payload}</p>}
        </div>
      )}

      {/* ERP_EXPORT */}
      {method === 'ERP_EXPORT' && (
        <div className="space-y-3">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-3 text-sm text-purple-900">
              <p className="font-medium">Batch Export Artifact</p>
              <p className="text-xs mt-1">File upload required. Snapshot timestamp set in Step 1.</p>
            </CardContent>
          </Card>
          <div>
            <Label>Upload ERP Export File *</Label>
            <div className="mt-2 border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors bg-purple-50/30">
              <input type="file" onChange={handleFileChange} className="hidden" id="erp-export-upload" accept=".csv,.json,.xml" />
              <label htmlFor="erp-export-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Database className="w-4 h-4" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div className="text-purple-600">
                    <Database className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Upload CSV/JSON/XML export</p>
                  </div>
                )}
              </label>
            </div>
          </div>
          {errors.file && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.file}</p>}
        </div>
      )}

      {/* ERP_API */}
      {method === 'ERP_API' && (
        <div className="space-y-3">
          <Card className="bg-violet-50 border-violet-200">
            <CardContent className="p-3 text-sm text-violet-900">
              <p className="font-medium">Server-Side Fetch</p>
              <p className="text-xs mt-1">Payload fetched from ERP. No client upload. Credentials never in logs.</p>
            </CardContent>
          </Card>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-600">
            <p className="font-medium mb-2">Query Descriptor (set in Step 1)</p>
            <div className="space-y-1 font-mono">
              <div>Endpoint: {declaration.api_endpoint_identifier || 'Not set'}</div>
              <div>Connector: {declaration.erp_instance_friendly_name || 'Not set'}</div>
              <div>Snapshot: {declaration.snapshot_at_utc || 'Not set'}</div>
            </div>
          </div>
          <div>
            <Label>Placeholder Payload (will be replaced server-side)</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="mt-2 h-24 font-mono text-xs bg-slate-50"
              placeholder='{"status": "will_be_fetched_server_side"}'
            />
          </div>
        </div>
      )}

      {/* SUPPLIER_PORTAL */}
      {method === 'SUPPLIER_PORTAL' && (
        <div className="space-y-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-sm text-green-900">
              <p className="font-medium">Supplier Portal Submission</p>
              <p className="text-xs mt-1">Payload linked to portal request. Origin locked to SUPPLIER_PORTAL.</p>
            </CardContent>
          </Card>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-600">
            <p className="font-medium mb-2">Portal Submission</p>
            <div className="font-mono">Request ID: {declaration.portal_request_id || 'Not set'}</div>
          </div>
          <div>
            <Label>Submission Payload (from portal)</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="mt-2 h-24 font-mono text-xs"
              placeholder='{"supplier_response": "..."}'
            />
          </div>
        </div>
      )}

      {/* MANUAL_ENTRY */}
      {method === 'MANUAL_ENTRY' && (
        <div className="space-y-3">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3 text-sm text-amber-900">
              <p className="font-medium">Structured Manual Form</p>
              <p className="text-xs mt-1">No paste. Guided form generates canonical JSON. source_system forced to INTERNAL_MANUAL.</p>
            </CardContent>
          </Card>
          <div>
            <Label>Manual Data Entry (structured JSON)</Label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="mt-2 h-32 font-mono text-xs"
              placeholder='{"field1": "value1", "field2": "value2"}'
            />
            <p className="text-xs text-slate-500 mt-1">Future: dataset-specific form will generate this automatically</p>
          </div>
          {errors.payload && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.payload}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleNext} className="bg-[#86b027] hover:bg-[#86b027]/90">
          Next: Review
        </Button>
      </div>
    </div>
  );
}