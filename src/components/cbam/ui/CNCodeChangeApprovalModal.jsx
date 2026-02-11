/**
 * CN CODE CHANGE APPROVAL MODAL
 * Shows impact analysis and requires explicit user approval
 * 
 * Tesla minimalist glassmorphic design
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import CNCodeChangeService from '../lifecycles/entry/CNCodeChangeService';

export default function CNCodeChangeApprovalModal({ changeRequestId, onClose, onApproved }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalReason, setApprovalReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalysis();
  }, [changeRequestId]);

  const loadAnalysis = async () => {
    const result = await CNCodeChangeService.analyzeImpact(changeRequestId);
    if (result.success) {
      setAnalysis(result.analysis);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!approvalReason.trim()) {
      setError('Approval reason required');
      return;
    }

    setApproving(true);
    const result = await CNCodeChangeService.approveAndRecalculate(
      changeRequestId,
      approvalReason
    );

    if (result.success) {
      onApproved?.();
      onClose?.();
    } else {
      setError(result.error);
    }
    setApproving(false);
  };

  if (loading) {
    return (
      <Dialog open={true}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-slate-500">Analyzing impact...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!analysis) return null;

  const emissionsDelta = analysis.emissions_impact.delta_tco2e;
  const certDelta = analysis.certificates_impact.delta_certificates;
  const costDelta = analysis.financial_impact.delta_cost_eur;

  const isIncrease = costDelta > 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">CN Code Change Approval Required</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Explicit user approval required for CN code recalculation
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* CN Code Change */}
          <Card className="bg-white/60 backdrop-blur border border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Current CN Code</div>
                  <div className="text-lg font-medium text-slate-900">{analysis.old_cn_code}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{analysis.old_cn_name}</div>
                </div>
                <div className="text-slate-400">→</div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">New CN Code</div>
                  <div className="text-lg font-medium text-slate-900">{analysis.new_cn_code}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{analysis.new_cn_name}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impact Analysis */}
          <div className="grid grid-cols-3 gap-3">
            {/* Emissions */}
            <Card className="bg-white/60 backdrop-blur border border-slate-200">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 mb-1">Emissions Impact</div>
                <div className={`text-2xl font-light ${emissionsDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {emissionsDelta > 0 ? '+' : ''}{emissionsDelta.toFixed(2)} tCO₂e
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {analysis.emissions_impact.delta_percent > 0 ? '+' : ''}
                  {analysis.emissions_impact.delta_percent}%
                </div>
              </CardContent>
            </Card>

            {/* Certificates */}
            <Card className="bg-white/60 backdrop-blur border border-slate-200">
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 mb-1">Certificates Required</div>
                <div className={`text-2xl font-light ${certDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {certDelta > 0 ? '+' : ''}{certDelta.toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {analysis.certificates_impact.delta_percent > 0 ? '+' : ''}
                  {analysis.certificates_impact.delta_percent}%
                </div>
              </CardContent>
            </Card>

            {/* Financial Impact */}
            <Card className={`bg-white/60 backdrop-blur border ${isIncrease ? 'border-red-300 bg-red-50/30' : 'border-green-300 bg-green-50/30'}`}>
              <CardContent className="pt-4">
                <div className="text-xs text-slate-500 mb-1">Financial Impact</div>
                <div className={`text-2xl font-light ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                  {costDelta > 0 ? '+' : ''}€{Math.abs(costDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  @ €{analysis.financial_impact.ets_price_reference}/cert
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benchmark/Defaults Change */}
          {(analysis.benchmark_impact.benchmark_changed || analysis.defaults_impact.defaults_changed) && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                <div className="font-medium text-sm mb-1">Regulatory Reference Change</div>
                {analysis.benchmark_impact.benchmark_changed && (
                  <div className="text-xs">
                    • Benchmark changed: {analysis.benchmark_impact.old_benchmark_value} → {analysis.benchmark_impact.new_benchmark_value}
                  </div>
                )}
                {analysis.defaults_impact.defaults_changed && (
                  <div className="text-xs">
                    • Default values changed: {analysis.defaults_impact.old_default_value} → {analysis.defaults_impact.new_default_value}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Approval Reason */}
          <div>
            <label className="text-xs font-medium text-slate-700 mb-2 block">
              Approval Reason (Required)
            </label>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="Explain why this CN code change is necessary..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white/80 backdrop-blur focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              rows={3}
            />
          </div>

          {/* Compliance Acknowledgment */}
          <Alert className="border-slate-300 bg-slate-50">
            <CheckCircle className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-slate-700 text-xs">
              <div className="font-medium mb-1">Audit Trail & Compliance</div>
              <ul className="space-y-0.5 ml-4 list-disc text-slate-600">
                <li>Old calculation preserved in history</li>
                <li>All changes logged to audit trail</li>
                <li>Regulatory version: CBAM 2026 Art. 6</li>
                <li>Change requires explicit user signature</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={approving}
          >
            Reject Change
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approving || !approvalReason.trim()}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {approving ? 'Approving...' : 'Approve & Recalculate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}