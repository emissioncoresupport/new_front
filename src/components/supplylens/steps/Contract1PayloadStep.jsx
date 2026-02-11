import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Contract1PayloadStep({ ingestionMethod, payload, setPayload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [manualFormData, setManualFormData] = useState({
    supplier_name: '',
    facility_name: '',
    metric_name: '',
    metric_value: '',
    unit: ''
  });

  const handleFileSelect = (file) => {
    if (file.size > 104857600) {
      toast.error('File too large (max 100MB)');
      return;
    }
    setPayload({
      type: 'file',
      file,
      name: file.name,
      size: file.size
    });
  };

  const handleJsonSubmit = () => {
    try {
      JSON.parse(jsonText);
      setPayload({
        type: 'json',
        data: jsonText,
        size: jsonText.length
      });
    } catch (err) {
      toast.error('Invalid JSON: ' + err.message);
    }
  };

  const handleManualFormSubmit = () => {
    if (!manualFormData.supplier_name || !manualFormData.metric_name) {
      toast.error('Supplier name and metric are required');
      return;
    }
    const jsonPayload = JSON.stringify(manualFormData, null, 2);
    setPayload({
      type: 'json',
      data: jsonPayload,
      size: jsonPayload.length,
      isManual: true
    });
  };

  const getMethodDescription = () => {
    const descriptions = {
      FILE_UPLOAD: 'Upload a file (CSV, Excel, PDF, JSON, etc.)',
      ERP_EXPORT: 'Upload exported file from ERP system',
      ERP_API: 'Provide connector reference or exported file',
      SUPPLIER_PORTAL: 'Upload attestation or declaration document',
      MANUAL: 'Enter data in the form below'
    };
    return descriptions[ingestionMethod] || 'Provide evidence payload';
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Evidence Payload</h3>
        <p className="text-xs text-slate-600 mb-4">{getMethodDescription()}</p>
      </div>

      {/* Manual Entry Form */}
      {ingestionMethod === 'MANUAL' && !payload && (
        <Card className="bg-white/30 border-white/50">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Supplier Name *</Label>
                <Input
                  placeholder="Supplier name"
                  value={manualFormData.supplier_name}
                  onChange={(e) => setManualFormData({...manualFormData, supplier_name: e.target.value})}
                  className="bg-white/50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Facility (optional)</Label>
                <Input
                  placeholder="Facility name"
                  value={manualFormData.facility_name}
                  onChange={(e) => setManualFormData({...manualFormData, facility_name: e.target.value})}
                  className="bg-white/50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Metric Name *</Label>
                <Input
                  placeholder="e.g., CO2e, Energy Consumed"
                  value={manualFormData.metric_name}
                  onChange={(e) => setManualFormData({...manualFormData, metric_name: e.target.value})}
                  className="bg-white/50 text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Value *</Label>
                <Input
                  placeholder="123.45"
                  value={manualFormData.metric_value}
                  onChange={(e) => setManualFormData({...manualFormData, metric_value: e.target.value})}
                  className="bg-white/50 text-xs"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-medium text-slate-700">Unit *</Label>
                <Input
                  placeholder="e.g., kgCO2e, kWh, tonnes"
                  value={manualFormData.unit}
                  onChange={(e) => setManualFormData({...manualFormData, unit: e.target.value})}
                  className="bg-white/50 text-xs"
                />
              </div>
            </div>
            <Button
              onClick={handleManualFormSubmit}
              size="sm"
              className="w-full bg-[#86b027] hover:bg-[#7aa522]"
            >
              Create Payload
            </Button>
          </CardContent>
        </Card>
      )}

      {/* File Upload (for FILE_UPLOAD, ERP_EXPORT, SUPPLIER_PORTAL, or as alternative for others) */}
      {ingestionMethod !== 'MANUAL' && !payload && (
        <Card
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'bg-[#86b027]/5 border-[#86b027]' : 'bg-white/20 border-white/40'
          }`}
        >
          <input
            type="file"
            id="file-input"
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">Drag and drop file</p>
            <p className="text-xs text-slate-500">or click to browse</p>
          </label>
        </Card>
      )}

      {/* JSON Input (for ERP_API, SUPPLIER_PORTAL, or as alternative) */}
      {['ERP_API', 'SUPPLIER_PORTAL'].includes(ingestionMethod) && !payload && (
        <div className="space-y-3 pt-4 border-t">
          <p className="text-xs text-slate-600 font-medium">Or provide JSON data:</p>
          <textarea
            placeholder='{"data": "..."}'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-24 p-3 text-xs font-mono border border-white/30 bg-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#86b027]"
          />
          <Button
            onClick={handleJsonSubmit}
            disabled={!jsonText.trim()}
            size="sm"
            className="w-full bg-[#86b027] hover:bg-[#7aa522]"
          >
            Use JSON
          </Button>
        </div>
      )}

      {/* Payload Success States */}
      {payload && payload.type === 'file' && (
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">{payload.name}</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {(payload.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setPayload(null)}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {payload && payload.type === 'json' && (
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {payload.isManual ? 'Manual Entry' : 'JSON Payload'}
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {payload.size} {payload.size === 1 ? 'character' : 'characters'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setPayload(null);
                  setJsonText('');
                  setManualFormData({
                    supplier_name: '',
                    facility_name: '',
                    metric_name: '',
                    metric_value: '',
                    unit: ''
                  });
                }}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!payload && (
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">Payload required to proceed</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}