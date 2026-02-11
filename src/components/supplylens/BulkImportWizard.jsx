import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Upload, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import IngestionPipeline from './IngestionPipeline';

export default function BulkImportWizard({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('template');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [currentRowPipeline, setCurrentRowPipeline] = useState(null);

  const downloadTemplate = () => {
    const csv = `legal_name,country,city,address,email,phone,website,supplier_type
Example Corp,DE,Berlin,123 Main St,contact@example.com,+49301234567,www.example.com,manufacturer
Another Ltd,FR,Paris,456 Oak Ave,info@another.com,+33123456789,www.another.com,distributor`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier_template.csv';
    a.click();
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    // Parse CSV preview
    const text = await selectedFile.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        const row = {};
        headers.forEach((h, i) => row[h] = values[i]);
        return row;
      });
      setPreview(rows);
      setStep('preview');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const text = await file.text();

      // PHASE 1.1: Evidence-First Enforcement
      // Create Evidence records ONLY - no supplier creation
      const res = await base44.functions.invoke('bulkImportWithEvidence', {
        csv_text: text,
        declared_context: {
          entity_type: 'supplier',
          intended_use: 'general',
          source_role: 'buyer',
          reason: 'Bulk CSV import'
        },
        batch_name: file.name
      });

      if (!res.data.success) {
        throw new Error(res.data.error);
      }

      setResults({ 
        total: res.data.total_rows, 
        processed: res.data.evidence_created,
        errors: res.data.errors,
        details: res.data.results,
        batch_id: res.data.batch_id
      });
      setStep('results');
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inside_quotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inside_quotes = !inside_quotes;
      } else if (char === ',' && !inside_quotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-light">Bulk Import Suppliers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* TEMPLATE STEP */}
          {step === 'template' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border border-slate-200/50 bg-slate-50/50 p-6 text-center space-y-4">
                <Download className="w-8 h-8 text-[#86b027] mx-auto" />
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Download Template</h3>
                  <p className="text-xs text-slate-600 mt-1">Start with our CSV template to ensure proper formatting</p>
                </div>
                <Button
                  onClick={downloadTemplate}
                  className="bg-gradient-to-r from-[#86b027] to-[#7aa522] text-white rounded-lg"
                >
                  Download Template
                </Button>
              </Card>

              <Card className="border border-slate-200/50 bg-white p-6 space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Or Upload Your File</h3>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#86b027] transition">
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600">Drop CSV/Excel here or click to select</p>
                  </label>
                </div>
              </Card>
            </motion.div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border border-slate-200/50 bg-white p-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {Object.keys(preview[0] || {}).map(key => (
                        <th key={key} className="text-left py-2 px-2 text-slate-600 font-medium">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        {Object.values(row).map((val, vidx) => (
                          <td key={vidx} className="py-2 px-2 text-slate-700">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={() => { setStep('template'); setFile(null); }}
                  variant="outline"
                  className="flex-1"
                >
                  Change File
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-gradient-to-r from-[#86b027] to-[#7aa522] text-white rounded-lg"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Import {preview.length} Suppliers
                </Button>
              </div>
            </motion.div>
          )}

          {/* RESULTS STEP */}
          {step === 'results' && results && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className={`border p-6 ${results.errors === 0 ? 'border-emerald-200/50 bg-emerald-50/50' : 'border-yellow-200/50 bg-yellow-50/50'}`}>
                <div className="flex items-start gap-3">
                  {results.errors === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-medium text-slate-900">
                      {results.processed}/{results.total} Evidence records created
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {results.errors === 0 ? 'All CSV rows converted to immutable Evidence!' : `${results.errors} rows had errors.`}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 italic">
                      Batch ID: {results.batch_id}
                    </p>
                  </div>
                </div>
              </Card>

              {results.details && results.details.length > 0 && (
                <Card className="border border-slate-200/50 bg-white p-4 max-h-48 overflow-y-auto">
                  <h4 className="text-xs font-medium text-slate-900 mb-2">Evidence Creation Summary</h4>
                  <div className="space-y-2 text-xs">
                    {results.details.map((detail, idx) => (
                      <div key={idx} className={`p-2 rounded ${detail.status === 'ERROR' ? 'bg-red-50 text-red-700' : 'bg-emerald-50'}`}>
                        <span className="font-medium">Row {detail.row_number}:</span> {detail.legal_name}
                        {detail.status === 'EVIDENCE_CREATED' && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-emerald-700 font-mono text-xs">EV ID: {detail.evidence_id}</p>
                            <p className="text-emerald-600 font-mono text-xs">Hash: {detail.declaration_hash?.substring(0, 16)}...</p>
                          </div>
                        )}
                        {detail.status === 'ERROR' && (
                          <p className="text-red-600 mt-1">{detail.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-[#86b027] to-[#7aa522] text-white rounded-lg"
              >
                Done
              </Button>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}