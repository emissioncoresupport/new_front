/**
 * PRECURSOR YEAR DEVIATION MODAL
 * Allows users to request year mismatch deviation with justification + evidence
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PrecursorYearDeviationModal({
  open,
  onOpenChange,
  entryId,
  precursor,
  complexGoodYear,
  onSuccess
}) {
  const [justification, setJustification] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const precursorYear = precursor?.reporting_period_year;
  const precursorCNCode = precursor?.precursor_cn_code;
  const yearMismatch = precursorYear !== complexGoodYear;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (justification.trim().length < 20) {
      setError('Justification must be at least 20 characters');
      setLoading(false);
      return;
    }

    if (!evidenceReference.trim()) {
      setError('Evidence reference (document/certificate) required');
      setLoading(false);
      return;
    }

    try {
      const response = await base44.functions.invoke('requestPrecursorYearDeviation', {
        entry_id: entryId,
        precursor_cn_code: precursorCNCode,
        precursor_year: precursorYear,
        complex_good_year: complexGoodYear,
        justification: justification.trim(),
        evidence_reference: evidenceReference.trim()
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.(response.data.deviation);
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to submit deviation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Precursor Year Deviation Request</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            CBAM Art. 14(2) – Justify year mismatch with evidence
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <p className="text-sm font-medium">Deviation request submitted</p>
            <p className="text-xs text-slate-600">Awaiting admin approval</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Year Mismatch Alert */}
            {yearMismatch && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-700">
                  Precursor year {precursorYear} ≠ Complex good year {complexGoodYear}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-xs text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Justification */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Justification *
              </label>
              <Textarea
                placeholder="Explain why precursor year differs from complex good year (min 20 chars)"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="h-24 text-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                {justification.length}/20 minimum
              </p>
            </div>

            {/* Evidence Reference */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Evidence Reference *
              </label>
              <Input
                placeholder="e.g., Certificate ID, Document URL, Batch Number"
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                className="text-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Provide document/certificate supporting this deviation
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || justification.trim().length < 20}
                className="text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-3 h-3 mr-1" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Admin approval required before reporting
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}