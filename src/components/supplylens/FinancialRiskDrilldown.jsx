import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ExternalLink, X, GripVertical, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createPageUrl } from '@/utils';

export default function FinancialRiskDrilldown({ open, onClose, workItems = [] }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drawerRef = useRef(null);

  // Financial Risk Exposure Formula: status in (BLOCKED, OPEN) AND priority in (CRITICAL, HIGH)
  const riskWorkItems = workItems.filter(wi => 
    ['BLOCKED', 'OPEN'].includes(wi.status) && 
    ['CRITICAL', 'HIGH'].includes(wi.priority)
  );

  const totalRisk = riskWorkItems.reduce((sum, wi) => 
    sum + (wi.estimated_financial_impact_amount || 0), 0
  );

  // Group by priority
  const criticalRisk = riskWorkItems.filter(w => w.priority === 'CRITICAL').reduce((s, w) => s + (w.estimated_financial_impact_amount || 0), 0);
  const highRisk = riskWorkItems.filter(w => w.priority === 'HIGH').reduce((s, w) => s + (w.estimated_financial_impact_amount || 0), 0);
  const otherRisk = totalRisk - criticalRisk - highRisk;

  // Impact basis types for display
  const impactBasisLabels = {
    CBAM_CERT_COST: 'CBAM Certificate Cost',
    LATE_SUBMISSION_PENALTY: 'Late Submission Penalty',
    MISSING_DATA_DELAY: 'Missing Data Delay',
    AUDIT_NONCONFORMITY: 'Audit Non-Conformity',
    CUSTOM: 'Custom Estimate'
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      const drawer = drawerRef.current;
      const rect = drawer.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging && drawerRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity pointer-events-auto"
        onClick={onClose}
      />

      {/* Modal Content - Tesla Glassmorphic */}
      <div 
        ref={drawerRef}
        onMouseDown={handleMouseDown}
        className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-white/70 backdrop-blur-2xl border-2 border-slate-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden pointer-events-auto"
        style={{
          transform: position.x || position.y 
            ? `translate(${position.x}px, ${position.y}px)` 
            : 'none',
          cursor: isDragging ? 'grabbing' : 'auto',
        }}
      >
        {/* Header - Drag Handle */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 z-10">
          <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing drag-handle">
            <GripVertical className="w-5 h-5 text-slate-400" />
          </div>
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100/60 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-lg font-light text-slate-900 tracking-tight">Financial Risk Exposure</h2>
                  <p className="text-xs text-slate-600 font-light">
                    Work items with financial risk exposure
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Formula: Sum of estimated_financial_impact_amount where status in (BLOCKED, OPEN) AND priority in (CRITICAL, HIGH)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100/70 rounded-full transition-all duration-200"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border border-red-200/60 bg-gradient-to-br from-white/90 to-red-50/20 backdrop-blur-xl shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-light text-red-900">€{totalRisk.toLocaleString('en-US')}</p>
                <p className="text-xs text-slate-600 uppercase tracking-wider mt-1 font-light">Total Risk</p>
              </CardContent>
            </Card>
            <Card className="border border-red-200/60 bg-gradient-to-br from-white/90 to-red-50/30 backdrop-blur-xl shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-light text-red-800">€{criticalRisk.toLocaleString('en-US')}</p>
                <p className="text-xs text-slate-600 uppercase tracking-wider mt-1 font-light">Critical</p>
              </CardContent>
            </Card>
            <Card className="border border-orange-200/60 bg-gradient-to-br from-white/90 to-orange-50/20 backdrop-blur-xl shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-light text-orange-800">€{highRisk.toLocaleString('en-US')}</p>
                <p className="text-xs text-slate-600 uppercase tracking-wider mt-1 font-light">High</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200/60 bg-gradient-to-br from-white/90 to-slate-50/20 backdrop-blur-xl shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-light text-slate-700">€{otherRisk.toLocaleString('en-US')}</p>
                <p className="text-xs text-slate-600 uppercase tracking-wider mt-1 font-light">Other</p>
              </CardContent>
            </Card>
          </div>

          {/* Risk Contributors Table */}
          <Card className="border border-slate-200/60 bg-gradient-to-br from-white/90 to-slate-50/20 backdrop-blur-xl shadow-sm flex-1 flex flex-col overflow-hidden">
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100/80 to-slate-50/40 backdrop-blur-sm border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Work Item</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Basis</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Impact (EUR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50">
                    {riskWorkItems
                      .sort((a, b) => (b.estimated_financial_impact_amount || 0) - (a.estimated_financial_impact_amount || 0))
                      .map((item) => {
                        const impact = item.estimated_financial_impact_amount || 0;
                        const impactBasis = item.impact_basis || 'CUSTOM';
                        const calculationTrace = item.calculation_trace;
                        
                        return (
                          <tr key={item.id || item.work_item_id} className="hover:bg-white/50 transition-colors">
                            <td className="px-4 py-3 text-sm">
                              <button
                                onClick={async () => {
                                  window.location.href = `${createPageUrl('SupplyLens')}?tab=queue&work_item_id=${item.id || item.work_item_id}`;
                                }}
                                className="font-mono text-slate-900 font-medium hover:text-[#86b027] hover:underline flex items-center gap-1"
                              >
                                {item.id || item.work_item_id}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="outline" className="text-xs border-slate-300 bg-slate-50/50 text-slate-700">{item.type}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={
                                item.priority === 'CRITICAL' ? 'bg-red-600 text-white text-xs' :
                                item.priority === 'HIGH' ? 'bg-orange-500 text-white text-xs' :
                                'bg-slate-500 text-white text-xs'
                              }>{item.priority}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={
                                item.status === 'BLOCKED' ? 'bg-red-100 text-red-800 text-xs' :
                                item.status === 'OPEN' ? 'bg-blue-100 text-blue-800 text-xs' :
                                'bg-green-100 text-green-800 text-xs'
                              }>{item.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs cursor-help border-slate-300 bg-slate-50 text-slate-700">
                                      {impactBasisLabels[impactBasis] || impactBasis}
                                    </Badge>
                                  </TooltipTrigger>
                                  {calculationTrace && (
                                    <TooltipContent className="max-w-md">
                                      <pre className="text-xs whitespace-pre-wrap">
                                        {typeof calculationTrace === 'string' 
                                          ? calculationTrace 
                                          : JSON.stringify(calculationTrace, null, 2)}
                                      </pre>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className="font-semibold text-red-700">
                                €{impact.toLocaleString('en-US')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200/50 p-4 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <Button 
            onClick={() => {
              window.location.href = `${createPageUrl('SupplyLens')}?tab=queue&filter_type=all&status=BLOCKED`;
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-lg rounded-lg transition-all"
          >
            Go to Work Queue
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}