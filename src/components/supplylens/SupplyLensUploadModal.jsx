import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Upload, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SupplyLensUploadModal({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState('context');
  const [reason, setReason] = useState('');
  const [entityType, setEntityType] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
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
      const uploadRes = await base44.integrations.Core.UploadFile({ file });

      if (!uploadRes.file_url) {
        throw new Error('File upload failed');
      }

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

  const handleClose = () => {
    setStep('context');
    setReason('');
    setEntityType('');
    setFile(null);
    setError(null);
    setUploadedEvidence(null);
    onClose();
  };

  const handleConfirmationClose = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        {/* STEP 1: CONTEXT */}
        {step === 'context' && (
          <Card className="border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-slate-900">Upload Evidence</h2>
                <p className="text-xs text-slate-500 mt-1">Step 1: Context</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-slate-100 rounded transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Why are you uploading this?</label>
              <Textarea
                placeholder="E.g., Supplier sustainability certificate, manufacturing site audit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-20 text-sm"
              />
            </div>

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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleContextSubmit}
              disabled={!reason.trim() || !entityType}
              className="w-full bg-[#86b027] hover:bg-[#7aa522] text-white py-2 disabled:opacity-50"
            >
              Continue
            </Button>
          </Card>
        )}

        {/* STEP 2: FILE */}
        {step === 'file' && (
          <Card className="border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-slate-900">Upload Evidence</h2>
                <p className="text-xs text-slate-500 mt-1">Step 2: File</p>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-slate-100 rounded transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2 text-sm">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Reason</p>
              <p className="text-slate-900">{reason}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-2">Entity Type</p>
              <p className="text-slate-900">{entityType}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Select File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#86b027] hover:bg-[#86b027]/5 transition"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">
                  {file ? file.name : 'Click to select file'}
                </p>
                <p className="text-xs text-slate-500 mt-1">PDF, Excel, Word, or images</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setStep('context')}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-[#86b027] hover:bg-[#7aa522] text-white disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: CONFIRMATION */}
        {step === 'confirmation' && uploadedEvidence && (
          <Card className="border-2 border-green-300 bg-green-50 p-6 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <div>
              <h2 className="text-lg font-medium text-slate-900">Evidence Uploaded</h2>
              <p className="text-sm text-slate-600 mt-1">Securely stored and immutable.</p>
            </div>

            <div className="bg-white rounded p-3 text-xs text-slate-600 text-left space-y-2 border border-green-200">
              <div>
                <p className="text-slate-500 uppercase tracking-widest mb-1 text-xs">Evidence ID</p>
                <p className="font-mono text-slate-900 break-all text-xs">{uploadedEvidence.evidence_id}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-widest mb-1 text-xs">Hash</p>
                <p className="font-mono text-slate-900 break-all text-xs">{uploadedEvidence.file_hash}</p>
              </div>
            </div>

            <Button
              onClick={handleConfirmationClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
            >
              Close
            </Button>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}