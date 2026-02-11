import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Upload, CheckCircle2, AlertTriangle, ArrowRight, X, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import ProofFirstExtractFlow from './ProofFirstExtractFlow';

export default function SupplierOnboardingFlow({ isOpen, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [step, setStep] = useState('context');
  const [reason, setReason] = useState('');
  const [entityType, setEntityType] = useState('SUPPLIER');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [evidence, setEvidence] = useState(null);
  
  // Structured data
  const [supplierName, setSupplierName] = useState('');
  const [country, setCountry] = useState('');
  const [vat, setVat] = useState('');
  const [eori, setEori] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  const [structuring, setStructuring] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (!isDragging) return;
    let animId;
    const handleMouseMove = (e) => {
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setPosition(prev => ({
          x: Math.max(-600, Math.min(600, prev.x + deltaX)),
          y: Math.max(-400, Math.min(400, prev.y + deltaY))
        }));
        setDragStart({ x: e.clientX, y: e.clientY });
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animId);
    };
  }, [isDragging, dragStart]);

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

      setEvidence(response.data);
      setStep('extract');
      setError(null);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  const handleStructure = async () => {
    if (!supplierName.trim() || !country) {
      setError('Supplier name and country are required');
      return;
    }

    setStructuring(true);

    try {
      const supplier_data = {
        legal_name: supplierName,
        country,
        vat_number: vat,
        eori_number: eori,
        email: contactEmail,
        supplier_type: entityType
      };

      // Route through unified orchestrator
      const orchestrationRes = await base44.functions.invoke('supplierIngestionOrchestrator', {
        source_path: 'single_upload',
        supplier_data,
        evidence_id: evidence?.evidence_id
      });

      if (!orchestrationRes.data.success) {
        throw new Error(orchestrationRes.data.error);
      }

      // PHASE 1.1: Evidence-Only Mode
      // No supplier creation - only show Evidence created successfully
      setCreated({
        evidence_id: evidence?.evidence_id,
        supplier_name: supplierName,
        country,
        frameworks: orchestrationRes.data.frameworks,
        completeness: orchestrationRes.data.validation.completeness_score,
        dedup_matches: orchestrationRes.data.dedup_matches.length,
        state: 'Evidence created - awaiting classification'
      });
      setStep('confirmation');
      setError(null);
    } catch (err) {
      setError(err.message || 'Ingestion failed');
      setStructuring(false);
    }
  };

  const handleCreateEntity = async () => {
    // PHASE 1.1: Supplier creation disabled
    setError('Supplier creation is disabled in Evidence Core phase. Evidence has been recorded and awaits manual promotion.');
  };

  const handleExtractComplete = async (result) => {
    // Populate fields from extraction
    setSupplierName(result.approvedFields.legal_name || '');
    setCountry(result.approvedFields.country || '');
    setVat(result.approvedFields.vat_number || '');
    setEori(result.approvedFields.eori_number || '');
    setContactEmail(result.approvedFields.email || '');
    setExtractionResult(result);
    setStep('extract');
  };

  const handleClose = () => {
    setStep('context');
    setReason('');
    setEntityType('SUPPLIER');
    setFile(null);
    setError(null);
    setEvidence(null);
    setSupplierName('');
    setCountry('');
    setVat('');
    setEori('');
    setContactEmail('');
    setExtractionResult(null);
    setMapping(null);
    setCreated(null);
    onClose();
  };

  const handleSuccess = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/10 backdrop-blur-xs z-[60] flex items-center justify-end p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ x: 800, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 800, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-[80vh] overflow-hidden flex flex-col my-auto"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        {/* Draggable Header */}
        <motion.div 
          className="flex items-center justify-between px-6 py-3 border-b border-slate-200/30 cursor-grab active:cursor-grabbing bg-gradient-to-r from-white/85 via-white/80 to-slate-50/85 backdrop-blur-md"
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }}
          whileHover={{ backgroundColor: 'rgba(255,255,255,0.3)' }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div animate={{ opacity: isDragging ? 1 : 0.6 }} transition={{ duration: 0.2 }}>
              <GripHorizontal className="w-4 h-4 text-slate-400" />
            </motion.div>
            <span className="text-sm font-light text-slate-900 uppercase tracking-widest">Supplier Workflow</span>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-slate-200/50 rounded transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white/80 via-white/75 to-slate-50/80"
      >
        {/* STEP 1: CONTEXT */}
         {step === 'context' && (
           <div className="p-7 space-y-6 bg-gradient-to-br from-white/85 via-white/80 to-slate-50/85">
            <div>
              <h2 className="text-lg font-light text-slate-900">Upload Context</h2>
              <p className="text-xs text-slate-500 mt-1 tracking-widest uppercase">Step 1 of 4</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-900">Why are you uploading this?</label>
                <Textarea
                  placeholder="E.g., Initial supplier profile, compliance certification, sustainability declaration..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-16 text-sm mt-1 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900">Document Type</label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIER">Supplier Profile</SelectItem>
                    <SelectItem value="SITE">Manufacturing Site</SelectItem>
                    <SelectItem value="PRODUCT">Product / BOM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50/80 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              onClick={handleContextSubmit}
              disabled={!reason.trim() || !entityType}
              className="w-full bg-gradient-to-r from-[#86b027] to-[#7aa522] hover:from-[#7aa522] hover:to-[#6b9720] text-white py-2 disabled:opacity-50 rounded-lg font-medium"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            </div>
            )}

        {/* STEP 2: FILE UPLOAD */}
         {step === 'file' && (
           <div className="p-7 space-y-6 bg-gradient-to-br from-white/85 via-white/80 to-slate-50/85">
            <div>
              <h2 className="text-lg font-light text-slate-900">Upload Document</h2>
              <p className="text-xs text-slate-500 mt-1 tracking-widest uppercase">Step 2 of 4</p>
            </div>

            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/50 space-y-2 text-sm">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Reason</p>
              <p className="text-slate-900 font-medium">{reason}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">Select File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#86b027] hover:bg-[#86b027]/5 transition mt-2"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">
                  {file ? file.name : 'Click to select file'}
                </p>
                <p className="text-xs text-slate-500 mt-1">PDF, Excel, Word, or Images</p>
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
              <div className="bg-red-50/80 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setStep('context')} variant="outline" className="flex-1 rounded-lg">
                Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] hover:from-[#7aa522] hover:to-[#6b9720] text-white rounded-lg disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            </div>
            )}

        {/* STEP 2 (renamed): PROOF-FIRST EXTRACTION */}
         {step === 'extract' && evidence && !extractionResult && (
           <div className="p-7 space-y-6 bg-gradient-to-br from-white/85 via-white/80 to-slate-50/85">
            <ProofFirstExtractFlow
              evidence={evidence}
              onComplete={handleExtractComplete}
              onCancel={() => setStep('file')}
            />
           </div>
         )}

        {/* STEP 2B: FIELD REVIEW (after AI extraction) */}
         {step === 'extract' && evidence && extractionResult && (
           <div className="p-7 space-y-6 bg-gradient-to-br from-white/85 via-white/80 to-slate-50/85">
            <div>
              <h2 className="text-lg font-light text-slate-900">Review Extracted Data</h2>
              <p className="text-xs text-slate-500 mt-1 tracking-widest uppercase">Fields pre-filled from AI extraction</p>
            </div>

            <div className="bg-gradient-to-r from-green-50/60 to-emerald-50/40 border border-green-200/40 rounded-lg p-4">
              <p className="text-xs text-green-700 font-medium">✓ Document hashed & extracted</p>
              <div className="mt-3 space-y-1">
                {extractionResult?.frameworks?.length > 0 && (
                  <p className="text-xs text-green-600">Frameworks: {extractionResult.frameworks.join(', ')}</p>
                )}
                {extractionResult?.risks?.overall_risk_level && (
                  <p className={`text-xs ${extractionResult.risks.overall_risk_level === 'low' ? 'text-green-600' : 'text-yellow-600'}`}>
                    Risk Level: {extractionResult.risks.overall_risk_level}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-900">Supplier Name *</label>
                <Input
                  placeholder="Legal name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="mt-2 border border-slate-200/60 rounded-lg py-2"
                />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-900">Country *</label>
                <Input
                  placeholder="ISO code (e.g., DE)"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-2 border border-slate-200/60 rounded-lg py-2"
                />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-900">VAT Number</label>
                <Input
                  placeholder="Optional"
                  value={vat}
                  onChange={(e) => setVat(e.target.value)}
                  className="mt-2 border border-slate-200/60 rounded-lg py-2"
                />
                </div>
                <div>
                <label className="text-sm font-medium text-slate-900">EORI</label>
                <Input
                  placeholder="Optional"
                  value={eori}
                  onChange={(e) => setEori(e.target.value)}
                  className="mt-2 border border-slate-200/60 rounded-lg py-2"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-900">Contact Email</label>
              <Input
                placeholder="Optional"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 border border-slate-200 rounded-lg"
              />
            </div>

            {error && (
              <div className="bg-red-50/80 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setExtractionResult(null)} variant="outline" className="flex-1 rounded-lg">
                Re-extract
              </Button>
              <Button
                onClick={handleStructure}
                disabled={structuring}
                className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] hover:from-[#7aa522] hover:to-[#6b9720] text-white rounded-lg disabled:opacity-50"
              >
                {structuring ? 'Processing...' : 'Proceed to Gate'}
              </Button>
            </div>
            </div>
            )}

        {/* STEP 3: MAPPING GATE - REMOVED IN PHASE 1.1 */}

        {/* STEP 4: CONFIRMATION - Evidence Only */}
         {step === 'confirmation' && created && (
           <div className="p-7 space-y-6 bg-gradient-to-br from-blue-50/85 via-white/80 to-slate-50/85 text-center">
            <CheckCircle2 className="w-12 h-12 text-blue-600 mx-auto" />
            <div>
              <h2 className="text-lg font-light text-slate-900">Evidence Created</h2>
              <p className="text-xs text-slate-600 mt-1 uppercase tracking-widest">Immutable proof recorded</p>
            </div>

            <div className="bg-white/60 rounded-lg p-4 text-xs text-slate-700 text-left space-y-3 border border-blue-200/50">
              <div>
                <p className="text-slate-500 uppercase tracking-widest text-xs font-light">Evidence ID</p>
                <p className="text-slate-900 font-mono text-sm mt-1">{created.evidence_id}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-widest text-xs font-light">Subject</p>
                <p className="text-slate-900 font-medium text-sm mt-1">{created.supplier_name} ({created.country})</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-widest text-xs font-light">State</p>
                <p className="text-blue-700 font-medium text-sm mt-1">RAW - Awaiting Classification</p>
              </div>
              {created.frameworks && created.frameworks.length > 0 && (
                <div>
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-light">Detected Frameworks</p>
                  <p className="text-slate-900 text-sm mt-1">{created.frameworks.join(', ').toUpperCase()}</p>
                </div>
              )}
              {created.dedup_matches > 0 && (
                <div className="bg-yellow-50/80 border border-yellow-200 rounded p-2 mt-2">
                  <p className="text-yellow-800 text-xs">
                    ⚠️ {created.dedup_matches} potential duplicate(s) detected
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 text-left">
              <p className="text-xs text-slate-600 font-medium uppercase tracking-wider mb-1">Phase 1.1 Notice</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Evidence recorded successfully. Supplier promotion requires human approval and will be implemented in Phase 1.2.
              </p>
            </div>

            <Button
              onClick={handleSuccess}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 rounded-lg font-medium mt-4"
            >
              Close
            </Button>
           </div>
         )}
        </div>
        </motion.div>
        </motion.div>
        );
        }