import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Layers, CheckSquare, FileCheck, Link as LinkIcon, 
  Calculator, Shield, Loader2, CheckCircle2, XCircle
} from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

/**
 * CBAM Batch Operations Panel
 * Bulk actions for high-volume importers
 */

export default function CBAMBatchOperationsPanel({ entries, selectedIds, onSelectionChange }) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  
  const batchMutation = useMutation({
    mutationFn: async ({ action, params }) => {
      const { data } = await base44.functions.invoke('cbamBatchOperations', {
        action,
        params
      });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      
      const actionLabels = {
        batch_validate: 'Validated',
        batch_approve: 'Approved',
        batch_calculate: 'Calculated',
        batch_verify: 'Verification requests created'
      };
      
      toast.success(`✓ ${actionLabels[variables.action] || 'Completed'}`, {
        description: `Processed: ${data.validated || data.approved || data.calculated || data.verification_requests_created} / ${data.total}`
      });
      
      setProcessing(false);
      onSelectionChange([]);
    },
    onError: () => {
      toast.error('Batch operation failed');
      setProcessing(false);
    }
  });
  
  const handleBatchValidate = async () => {
    if (selectedIds.length === 0) {
      toast.error('No entries selected');
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 200);
    
    await batchMutation.mutateAsync({
      action: 'batch_validate',
      params: { entry_ids: selectedIds }
    });
    
    clearInterval(interval);
    setProgress(100);
  };
  
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error('No entries selected');
      return;
    }
    
    const user = await base44.auth.me();
    if (user.role !== 'admin') {
      toast.error('Admin access required for bulk approval');
      return;
    }
    
    setProcessing(true);
    
    await batchMutation.mutateAsync({
      action: 'batch_approve',
      params: { 
        entry_ids: selectedIds,
        approved_by: user.email
      }
    });
  };
  
  const handleBatchCalculate = async () => {
    if (selectedIds.length === 0) {
      toast.error('No entries selected');
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 5, 90));
    }, 500);
    
    await batchMutation.mutateAsync({
      action: 'batch_calculate',
      params: { entry_ids: selectedIds }
    });
    
    clearInterval(interval);
    setProgress(100);
  };
  
  const handleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(entries.map(e => e.id));
    }
  };
  
  const handleSelectValidated = () => {
    const validated = entries
      .filter(e => e.validation_status === 'ai_validated' || e.validation_status === 'manual_verified')
      .map(e => e.id);
    onSelectionChange(validated);
  };
  
  const handleSelectPending = () => {
    const pending = entries
      .filter(e => e.validation_status === 'pending' || !e.validation_status)
      .map(e => e.id);
    onSelectionChange(pending);
  };
  
  return (
    <Card className="border-[#86b027]/30 bg-[#86b027]/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="w-5 h-5 text-[#86b027]" />
          Batch Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="h-8 text-xs"
          >
            <CheckSquare className="w-3 h-3 mr-1.5" />
            {selectedIds.length === entries.length ? 'Deselect All' : `Select All (${entries.length})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectValidated}
            className="h-8 text-xs"
          >
            Select Validated
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectPending}
            className="h-8 text-xs"
          >
            Select Pending
          </Button>
        </div>
        
        {/* Selected Count */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#86b027]/20">
            <span className="text-sm font-medium text-slate-900">
              {selectedIds.length} entries selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-7 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
        
        {/* Processing Progress */}
        {processing && (
          <div className="p-4 bg-white rounded-lg border space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Processing...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" indicatorClassName="bg-[#86b027]" />
          </div>
        )}
        
        {/* Batch Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchValidate}
            disabled={selectedIds.length === 0 || processing}
            className="h-9 text-xs"
          >
            {processing ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <FileCheck className="w-3 h-3 mr-1.5" />
            )}
            Validate ({selectedIds.length})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchCalculate}
            disabled={selectedIds.length === 0 || processing}
            className="h-9 text-xs"
          >
            <Calculator className="w-3 h-3 mr-1.5" />
            Calculate ({selectedIds.length})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchApprove}
            disabled={selectedIds.length === 0 || processing}
            className="h-9 text-xs"
          >
            <Shield className="w-3 h-3 mr-1.5" />
            Approve ({selectedIds.length})
          </Button>
          
          {/* Removed - Not implemented */}
        </div>
        
        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> Use batch operations to process hundreds of entries efficiently. Validation checks compliance per Annex IV.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}