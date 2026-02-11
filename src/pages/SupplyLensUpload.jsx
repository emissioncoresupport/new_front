import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Upload, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';

export default function SupplyLensUploadPage() {
  const fileInputRef = useRef(null);
  
  // Step 1: Context
  const [step, setStep] = useState('context');
  const [reason, setReason] = useState('');
  const [entityType, setEntityType] = useState('');
  
  // Step 2: File
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Step 3: Confirmation
  const [uploadedEvidence, setUploadedEvidence] = useState(null);

  const handleContextSubmit = () => {
    if (!reason.trim() || !entityType) {
      setError('Please provide reason and entity type');
      return;
    }
    setError(null);
    setStep('file');
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const uploadRes = await base44.integrations.Core.UploadFile({
        file: file
      });

      if (!uploadRes.file_url) {
        throw new Error('File upload failed');
      }

      // Create Evidence with context
      const response = await base44.functions.invoke('uploadEvidenceWithHash', {
        file_url: uploadRes.file_url,
        original_filename: file.name,
        file_size_bytes: file.size,
        reason_for_upload: reason,
        target_entity_type: entityType
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Upload failed');
      }

      setUploadedEvidence(response.data);
      setStep('confirmation');
      setError(null);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  // STEP 1: CONTEXT
  if (step === 'context') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-light tracking-widest text-slate-900 uppercase">Upload Evidence</h1>
            <p className="text-xs text-slate-500 mt-2 tracking-widest uppercase">Step 1: Context</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-slate-200 p-6 space-y-6">
              {/* Reason for Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Why are you uploading this?</label>
                <Textarea
                  placeholder="E.g., Supplier sustainability certificate, manufacturing site audit, product test report..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-20 text-sm"
                />
              </div>

              {/* Entity Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">What entity does this describe?</label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIER">Supplier</SelectItem>
                    <SelectItem value="SITE">Manufacturing Site</SelectItem>
                    <SelectItem value="SKU">Product / SKU</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleContextSubmit}
                disabled={!reason.trim() || !entityType}
                className="w-full bg-[#86b027] hover:bg-[#7aa522] text-white py-2 disabled:opacity-50"
              >
                Continue to File Upload
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 2: FILE UPLOAD
  if (step === 'file') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-light tracking-widest text-slate-900 uppercase">Upload Evidence</h1>
            <p className="text-xs text-slate-500 mt-2 tracking-widest uppercase">Step 2: File</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border border-slate-200 p-6 space-y-6">
              {/* Context Summary */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Reason</p>
                <p className="text-sm text-slate-900">{reason}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-3">Entity Type</p>
                <p className="text-sm text-slate-900">{entityType}</p>
              </div>

              {/* File Drop Zone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900">Select File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#86b027] hover:bg-[#86b027]/5 transition"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-900">
                    {file ? file.name : 'Click to select file'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, Excel, Word, or images only</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-[#86b027] hover:bg-[#7aa522] text-white py-2 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Evidence'}
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 3: CONFIRMATION
  if (step === 'confirmation' && uploadedEvidence) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-2 border-green-300 bg-green-50 p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <h2 className="text-2xl font-light text-slate-900">Evidence Uploaded</h2>
              <p className="text-sm text-slate-600">Securely stored and immutable.</p>
              
              <div className="bg-white rounded p-4 text-xs text-slate-600 text-left space-y-2 border border-green-200">
                <div>
                  <p className="text-slate-500 uppercase tracking-widest mb-1">Evidence ID</p>
                  <p className="font-mono text-slate-900 break-all">{uploadedEvidence.evidence_id}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase tracking-widest mb-1">SHA-256 Hash</p>
                  <p className="font-mono text-slate-900 break-all">{uploadedEvidence.file_hash}</p>
                </div>
              </div>

              <Button
                onClick={() => window.location.href = createPageUrl('SupplyLens')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
              >
                Back to Overview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }
}