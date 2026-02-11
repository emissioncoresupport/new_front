import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, FileText, AlertCircle } from 'lucide-react';

export default function FileUploadPayload({ file, setFile, payload, setPayload, declaration, setDeclaration, onNext, onBack }) {
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPayload(''); // Clear paste if file selected
  };

  const canProceed = file || (payload && payload.trim().length > 0);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900">2. Provide Evidence Payload</h3>

      <Card className="bg-red-50 border-red-300">
        <CardContent className="p-3 text-sm text-red-900 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">⚠️ FILE_UPLOAD requires payload to seal</p>
            <p className="text-xs text-red-800 mt-1">Upload a file OR paste raw payload. Cannot proceed without evidence payload.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 text-sm text-blue-900 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>FILE_UPLOAD: Upload a file OR paste raw payload. File metadata is captured in hash.</p>
        </CardContent>
      </Card>

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Upload File (Recommended)</Label>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#86b027] transition-colors">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-slate-400" />
            {file ? (
              <div className="text-sm text-slate-900">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                <p className="font-medium">Click to upload file</p>
                <p className="text-xs text-slate-400">CSV, JSON, XML, PDF, etc.</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* OR Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">OR</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Paste Payload */}
      <div className="space-y-2">
        <Label>Paste Raw Payload (Alternative)</Label>
        <Textarea
          value={payload}
          onChange={(e) => {
            setPayload(e.target.value);
            setFile(null); // Clear file if paste used
          }}
          placeholder="Paste JSON, CSV, XML, or other structured data..."
          className="font-mono text-xs min-h-32"
          disabled={!!file}
        />
      </div>

      {/* Blocking Alert */}
      {!canProceed && (
        <Card className="bg-red-50 border-red-300 border-2">
          <CardContent className="p-3 text-sm text-red-900 flex gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">⛔ Cannot proceed to sealing</p>
              <p className="text-xs mt-1">FILE_UPLOAD requires evidence payload. Upload a file or paste raw payload bytes.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          onClick={onNext} 
          disabled={!canProceed}
          className="bg-[#86b027] hover:bg-[#86b027]/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Review & Seal
        </Button>
      </div>
    </div>
  );
}