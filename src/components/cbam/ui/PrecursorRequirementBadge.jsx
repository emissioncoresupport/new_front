/**
 * Precursor Requirement Badge
 * Shows status and requirements for complex goods
 * Blocks progression if requirements not met
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isComplexGood, getPrecursorRequirementText } from '../constants/complexGoodsMappings';

export default function PrecursorRequirementBadge({ cnCode, precursorCount, isCompleted }) {
  if (!cnCode || !isComplexGood(cnCode)) {
    return null;
  }

  const requirementText = getPrecursorRequirementText(cnCode);
  const isRequirementMet = precursorCount > 0 || isCompleted;

  return (
    <div className={`p-3 backdrop-blur-sm border rounded-lg flex items-center justify-between ${
      isRequirementMet
        ? 'bg-emerald-50/80 border-emerald-200/60'
        : 'bg-red-50/80 border-red-200/60'
    }`}>
      <div className="flex items-center gap-2">
        {isRequirementMet ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-900">Precursor Requirement Met</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div>
              <span className="text-xs font-medium text-red-900 block">Precursor Required</span>
              <span className="text-xs text-red-700">{requirementText}</span>
            </div>
          </>
        )}
      </div>
      <Badge className={isRequirementMet ? 'bg-emerald-600' : 'bg-red-600'}>
        {precursorCount > 0 ? `${precursorCount} added` : 'BLOCKED'}
      </Badge>
    </div>
  );
}